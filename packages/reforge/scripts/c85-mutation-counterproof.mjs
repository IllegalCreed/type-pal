#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
// TEST-COVERAGE85-GLM-REFORGE-1 — 真实注入点三态反控驱动(r3)。
// 对每个注入点:原始(绿) → 变异产品源(指定 AssertionError 红) → 恢复(绿)。
// 每次变异写入都在 try/finally 中恢复;回执逐注入记录:
//   original/mutant/restored/rebuilt 四个 sha256、三次运行的 command/cwd/env(子集+digest)/
//   exitCode/signal/spawnError/stdout 尾/stderr 尾、test file×fullName 执行身份、
//   指定 AssertionError 全文,以及 before/after 工作树快照(零临时目录、零残留证明)。
// 回执写入提交内证据目录 src/__tests__/coverage85/c85-mutation-counterproof.json。
// 用法: node scripts/c85-mutation-counterproof.mjs
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const pkgRoot = path.resolve(import.meta.dirname, '..')
const repoRoot = path.resolve(pkgRoot, '..', '..')
const evidenceDir = path.join(pkgRoot, 'src', '__tests__', 'coverage85')
const OUTPUT_TAIL = 6000

// 工作树快照:驱动全程零临时文件/零残留证明(变异在源文件原位进行并在 finally 恢复)
const gitStatus = () => {
  const result = spawnSync('git', ['status', '--porcelain', 'packages/reforge'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 30_000,
  })
  return (result.stdout ?? '').trim()
}

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex')

const vitestArgs = (testFile, testName) => [
  '--filter',
  '@type-pal/reforge',
  'exec',
  'vitest',
  'run',
  testFile,
  '-t',
  testName,
]

const runVitest = (testFile, testName) => {
  const command = vitestArgs(testFile, testName)
  const envSubset = {
    TYPE_PAL_COVERAGE: process.env.TYPE_PAL_COVERAGE ?? null,
    TYPE_PAL_COVERAGE_PROFILE: process.env.TYPE_PAL_COVERAGE_PROFILE ?? null,
    NODE_ENV: process.env.NODE_ENV ?? null,
    CI: process.env.CI ?? null,
  }
  const envDigest = createHash('sha256')
    .update(JSON.stringify({ ...process.env, ...envSubset }))
    .digest('hex')
  const result = spawnSync('pnpm', command, {
    cwd: repoRoot,
    env: process.env,
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  const output = `${stdout}\n${stderr}`
  // vitest4 -t 零匹配陷阱:全 skipped 也 exit0 —— 视为 vacuous,不得当作绿/红证据
  const summaryMatch = output.match(/Tests\s+([^\n]*)\((\d+)\)/)
  const vacuous =
    summaryMatch?.[1].includes('skipped') === true &&
    summaryMatch[1].includes('passed') === false &&
    summaryMatch[1].includes('failed') === false
  return {
    command: ['pnpm', ...command],
    cwd: repoRoot,
    env: envSubset,
    envDigest,
    exitCode: result.status,
    signal: result.signal ?? null,
    spawnError: result.error ? result.error.message : null,
    timedOut: result.signal === 'SIGTERM' || Boolean(result.error),
    stdoutTail: stdout.length > OUTPUT_TAIL ? stdout.slice(-OUTPUT_TAIL) : stdout,
    stderrTail: stderr.length > OUTPUT_TAIL ? stderr.slice(-OUTPUT_TAIL) : stderr,
    vacuous,
    output,
    outputTail: output.length > OUTPUT_TAIL ? output.slice(-OUTPUT_TAIL) : output,
  }
}

const extractAssertionError = (output) => {
  const match = output.match(
    /AssertionError: ([^\n]*(?:\n(?! *[⎯❯]|Tests |Test Files |Duration).*)*)/,
  )
  return match ? `AssertionError: ${match[1].trim()}` : null
}

const keyVar = `$\u007bkey}`
const injections = [
  {
    id: 'SR-FADE-DEFAULT',
    source: 'src/script-runner.ts',
    original: 'return h.fade(cmd.dir, cmd.ms ?? 300, cmd.color, this.signal)',
    mutated: 'return h.fade(cmd.dir, cmd.ms ?? 301, cmd.color, this.signal)',
    testFile: 'src/script-runner.c85-arms.test.ts',
    testName: '演出缺省臂',
    expectedErrorPart: 'to deeply equal',
  },
  {
    id: 'ADAPTER-SCENE-FILTER',
    source: 'src/script-host-adapter.ts',
    original: 'return target?.scene === options.currentSceneId() ? target.entity : undefined',
    mutated: 'return target?.scene !== options.currentSceneId() ? target.entity : undefined',
    testFile: 'src/script-host-adapter.c85-arms.test.ts',
    testName: '跨场景过滤臂',
    expectedErrorPart: 'to deeply equal []',
  },
  {
    id: 'CORE-STEAL-SPLIT',
    source: 'src/battle/battle-core.ts',
    original: 'const c = Math.trunc(e.stealLeft / (2 + Math.floor(rng() * 2)))',
    mutated: 'const c = Math.trunc(e.stealLeft / (3 + Math.floor(rng() * 2)))',
    testFile: 'src/battle/battle-core.c85-branches.test.ts',
    testName: '偷窃非重复臂',
    expectedErrorPart: '获得 3 文钱',
  },
  {
    id: 'CORE-POISON-MP',
    source: 'src/battle/battle-core.ts',
    original:
      'if (tick.mpDelta && host.mp !== undefined) host.mp = Math.max(0, host.mp + tick.mpDelta)',
    mutated:
      'if (tick.mpDelta && host.mp !== undefined) host.mp = Math.max(0, host.mp - tick.mpDelta)',
    testFile: 'src/battle/battle-core.c85-branches.test.ts',
    testName: 'mpDelta 分侧臂',
    expectedErrorPart: '26',
  },
  {
    id: 'WORLD-BARRIER-RELEASE-GATE',
    source: 'src/script-world.ts',
    original: "if (!pending.ready) throw new Error('save barrier 尚未 ready，不能 release')",
    mutated:
      "if (!pending.ready && false) throw new Error('save barrier 尚未 ready，不能 release')",
    testFile: 'src/script-world.c85-arms.test.ts',
    testName: 'barrier 句柄臂',
    expectedErrorPart: 'expected [Function] to throw an error',
  },
  {
    id: 'MOTION-DUPLICATE-GUARD',
    source: 'src/entity-motion.ts',
    original: `if (seen.has(key)) throw new Error(\`entity-motion: duplicate snapshot actor ${keyVar}\`)`,
    mutated: `if (false) throw new Error(\`entity-motion: duplicate snapshot actor ${keyVar}\`)`,
    testFile: 'src/entity-motion.c85-arms.test.ts',
    testName: '非法快照臂',
    expectedErrorPart: 'expected [Function] to throw an error',
  },
  {
    id: 'SESSION-CHOREO-STOP-FADE',
    source: 'src/battle/battle-session.ts',
    original: 'if (fadeMs > 0)',
    mutated: 'if (!(fadeMs > 0))',
    testFile: 'src/battle/battle-session.c85-arms.test.ts',
    testName: 'stopMusic 即时臂',
    expectedErrorPart: 'to deeply equal [ 1 ]',
  },
  {
    id: 'RUNTIME-COMPLETED-CURSOR',
    source: 'src/script-runner-core.ts',
    original:
      "if (!flowCanComplete(executable.flow))\n        throw new Error('ScriptRunnerCore: flow 未声明 complete，不能使用 completed cursor')",
    mutated:
      "if (false && !flowCanComplete(executable.flow))\n        throw new Error('ScriptRunnerCore: flow 未声明 complete，不能使用 completed cursor')",
    testFile: 'src/runtime-host.c85-arms.test.ts',
    testName: '完成游标臂:未声明',
    expectedErrorPart: 'promise resolved "undefined" instead of rejecting',
  },
  {
    id: 'MAIN-MOTION-PROBE-PRESENT',
    source: 'src/main.ts',
    original: 'present: entity !== undefined,',
    mutated: 'present: false,',
    testFile: 'src/main.c85-boot.test.ts',
    testName: '运动探针臂',
    expectedErrorPart: 'present',
  },
]

const receipt = {
  driver: 'packages/reforge/scripts/c85-mutation-counterproof.mjs',
  generatedAt: new Date().toISOString(),
  repoRoot,
  injections: [],
}
let failures = 0

for (const injection of injections) {
  const file = path.join(pkgRoot, injection.source)
  const entry = {
    id: injection.id,
    source: injection.source,
    testFile: injection.testFile,
    fullName: injection.testName,
    identity: `pnpm --filter @type-pal/reforge exec vitest run ${injection.testFile} -t ${injection.testName}`,
    expectedErrorPart: injection.expectedErrorPart,
    workingTreeBefore: gitStatus(),
  }
  try {
    const originalText = await readFile(file, 'utf8')
    entry.originalSha256 = sha256(originalText)
    if (!originalText.includes(injection.original)) {
      entry.error = 'ORIGINAL_SNIPPET_NOT_FOUND'
      entry.pass = false
      failures++
      receipt.injections.push(entry)
      console.log(`FAIL ${injection.id}: snippet missing`)
      continue
    }
    const originalRun = runVitest(injection.testFile, injection.testName)
    entry.original = {
      command: originalRun.command,
      cwd: originalRun.cwd,
      env: originalRun.env,
      envDigest: originalRun.envDigest,
      exitCode: originalRun.exitCode,
      signal: originalRun.signal,
      spawnError: originalRun.spawnError,
      timedOut: originalRun.timedOut,
      stdoutTail: originalRun.stdoutTail,
      stderrTail: originalRun.stderrTail,
      outputTail: originalRun.outputTail,
    }
    entry.originalVacuous = originalRun.vacuous
    entry.originalGreen = originalRun.exitCode === 0 && !originalRun.vacuous
    let mutatedRun = null
    try {
      const mutantText = originalText.replace(injection.original, injection.mutated)
      await writeFile(file, mutantText)
      entry.mutantSha256 = sha256(mutantText)
      entry.mutationApplied = entry.mutantSha256 !== entry.originalSha256
      mutatedRun = runVitest(injection.testFile, injection.testName)
      entry.mutated = {
        command: mutatedRun.command,
        cwd: mutatedRun.cwd,
        env: mutatedRun.env,
        envDigest: mutatedRun.envDigest,
        exitCode: mutatedRun.exitCode,
        signal: mutatedRun.signal,
        spawnError: mutatedRun.spawnError,
        timedOut: mutatedRun.timedOut,
        stdoutTail: mutatedRun.stdoutTail,
        stderrTail: mutatedRun.stderrTail,
        outputTail: mutatedRun.outputTail,
      }
      entry.mutatedVacuous = mutatedRun.vacuous
      entry.mutatedRed = mutatedRun.exitCode !== 0 && !mutatedRun.vacuous
      entry.assertionError = extractAssertionError(mutatedRun.output)
      entry.specifiedAssertionMatched =
        entry.mutatedRed && entry.assertionError?.includes(injection.expectedErrorPart) === true
    } finally {
      // 无论变异运行结果如何,finally 恢复原始源并逐字节复核
      await writeFile(file, originalText)
      const restoredText = await readFile(file, 'utf8')
      entry.restoredSha256 = sha256(restoredText)
      entry.sourceRestoredByteIdentical = restoredText === originalText
      const restoredRun = runVitest(injection.testFile, injection.testName)
      entry.restored = {
        command: restoredRun.command,
        cwd: restoredRun.cwd,
        env: restoredRun.env,
        envDigest: restoredRun.envDigest,
        exitCode: restoredRun.exitCode,
        signal: restoredRun.signal,
        spawnError: restoredRun.spawnError,
        timedOut: restoredRun.timedOut,
        stdoutTail: restoredRun.stdoutTail,
        stderrTail: restoredRun.stderrTail,
        outputTail: restoredRun.outputTail,
      }
      entry.restoredVacuous = restoredRun.vacuous
      entry.restoredGreen = restoredRun.exitCode === 0 && !restoredRun.vacuous
      // rebuilt:恢复运行结束后再次读取源文件 —— 证明恢复运行本身未再改动源
      entry.rebuiltSha256 = sha256(await readFile(file, 'utf8'))
      entry.rebuiltEqualsOriginal = entry.rebuiltSha256 === entry.originalSha256
    }
    entry.workingTreeAfter = gitStatus()
    entry.workingTreeUnchanged = entry.workingTreeBefore === entry.workingTreeAfter
    const pass =
      entry.originalGreen &&
      entry.mutationApplied &&
      entry.mutatedRed &&
      entry.specifiedAssertionMatched &&
      entry.restoredGreen &&
      entry.sourceRestoredByteIdentical &&
      entry.rebuiltEqualsOriginal &&
      entry.workingTreeUnchanged
    entry.pass = pass
    if (!pass) failures++
    console.log(
      `${pass ? 'PASS' : 'FAIL'} ${injection.id}: original=${entry.originalGreen} mutated=${entry.mutatedRed} restored=${entry.restoredGreen} matched=${entry.specifiedAssertionMatched} hashRestored=${entry.sourceRestoredByteIdentical} rebuilt=${entry.rebuiltEqualsOriginal} treeClean=${entry.workingTreeUnchanged}`,
    )
  } catch (error) {
    entry.error = error instanceof Error ? error.message : String(error)
    entry.pass = false
    failures++
    console.log(`FAIL ${injection.id}: ${entry.error}`)
  }
  receipt.injections.push(entry)
}

receipt.injectionCount = receipt.injections.length
receipt.failureCount = failures
await writeFile(
  path.join(evidenceDir, 'c85-mutation-counterproof.json'),
  `${JSON.stringify(receipt, null, 1)}\n`,
)
console.log(
  `\nreceipt: src/__tests__/coverage85/c85-mutation-counterproof.json (${receipt.injectionCount} injections, ${failures} failures)`,
)
process.exit(failures === 0 ? 0 : 1)
