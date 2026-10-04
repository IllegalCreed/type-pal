#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
// TEST-COVERAGE85-GLM-REFORGE-1 — 真实注入点三态反控驱动(r5)。
// 流程前置:工作树必须 clean(否则 abort)。每注入:原始(绿)→变异(指定业务 AssertionError 红)
// →恢复(绿)。运行采用 default+json 双 reporter:stdout/stderr 全量原始文件入库
// (src/__tests__/coverage85/c85-counterproof-raw/),json 供 executedSet/skippedSet 分账
// (skipped/pending 不入 credited execution set)与唯一业务 AssertionError 提取。
// 四态 hash(original/mutant/restored/rebuilt)、mkdtemp 临时目录 + finally 清理、
// 变异前后工作树快照(必须 clean)、vitest4 -t 零匹配 exit0 的 vacuous 硬防。
// 用法: node scripts/c85-mutation-counterproof.mjs
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const pkgRoot = path.resolve(import.meta.dirname, '..')
const repoRoot = path.resolve(pkgRoot, '..', '..')
const evidenceDir = path.join(pkgRoot, 'src', '__tests__', 'coverage85')
const rawDir = path.join(evidenceDir, 'c85-counterproof-raw')

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex')

// 树清洁判定排除驱动自身的证据输出目录(raw/receipt);产品源变异与临时目录残留仍在监测域内
const gitStatus = () => {
  const result = spawnSync(
    'git',
    ['status', '--porcelain', '--', '.', ':(exclude)packages/reforge/src/__tests__/coverage85'],
    { cwd: repoRoot, encoding: 'utf8', timeout: 30_000 },
  )
  return (result.stdout ?? '').trim()
}

// 前置:整个驱动只在 clean 树上运行;receipt 因此是当前 SHA 的有效证据
const initialTree = gitStatus()
if (initialTree !== '') {
  console.error(`ABORT: working tree not clean before run:\n${initialTree}`)
  process.exit(2)
}

const keyVar = '$' + '{key}'
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
    original:
      'if (seen.has(key)) throw new Error(`entity-motion: duplicate snapshot actor ' +
      keyVar +
      '`)',
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

const parseJsonReport = (reportPath) => {
  const executed = []
  const skipped = []
  let assertionFailures = []
  if (!existsSync(reportPath)) return { executed, skipped, assertionFailures }
  const report = JSON.parse(readFileSync(reportPath, 'utf8'))
  for (const testResult of report.testResults ?? []) {
    const file = String(testResult.name ?? '').replace(
      /^.*packages\/reforge\//,
      'packages/reforge/',
    )
    for (const assertion of testResult.assertionResults ?? []) {
      const entry = {
        file,
        fullName: String(assertion.fullName ?? assertion.title ?? ''),
        status: assertion.status,
      }
      if (assertion.status === 'passed' || assertion.status === 'failed') executed.push(entry)
      else skipped.push(entry) // skipped/pending/todo 一律不入 credited set
      if (assertion.status === 'failed')
        for (const message of assertion.failureMessages ?? [])
          if (String(message).includes('AssertionError') || String(message).includes('__VITEST_'))
            assertionFailures.push({ ...entry, message: String(message) })
    }
  }
  // 唯一业务 AssertionError:同文案多来源去重,保留 file×fullName 归属
  const seen = new Set()
  assertionFailures = assertionFailures.filter((failure) => {
    const key = `${failure.file}::${failure.fullName}::${failure.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { executed, skipped, assertionFailures }
}

await mkdir(rawDir, { recursive: true })
const runVitest = async (testFile, testName, phase, id) => {
  const runTempDir = await mkdtemp(path.join(pkgRoot, '.c85-counterproof-tmp-'))
  try {
    const jsonPath = path.join(runTempDir, 'report.json')
    const command = [
      '--filter',
      '@type-pal/reforge',
      'exec',
      'vitest',
      'run',
      testFile,
      '-t',
      testName,
      '--reporter=default',
      '--reporter=json',
      `--outputFile.json=${jsonPath}`,
    ]
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
      maxBuffer: 32 * 1024 * 1024,
    })
    const report = parseJsonReport(jsonPath)
    const vacuous = report.executed.length === 0
    return {
      spawn: {
        command: ['pnpm', ...command],
        cwd: repoRoot,
        env: envSubset,
        envDigest,
        exitCode: result.status,
        signal: result.signal ?? null,
        spawnError: result.error ? result.error.message : null,
        timedOut: result.signal === 'SIGTERM' || Boolean(result.error),
      },
      vacuous,
      executedSet: report.executed,
      skippedSet: report.skipped,
      assertionFailures: report.assertionFailures,
      stdoutRawPath: `src/__tests__/coverage85/c85-counterproof-raw/${id}.${phase}.stdout`,
      stderrRawPath: `src/__tests__/coverage85/c85-counterproof-raw/${id}.${phase}.stderr`,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    }
  } finally {
    await rm(runTempDir, { recursive: true, force: true })
  }
}

// 全量 stdout/stderr 只落 raw 文件;JSON entry 仅存路径,避免与 raw 重复
const withoutRawBodies = (run) => {
  const { stdout: _stdout, stderr: _stderr, ...rest } = run
  return rest
}

const persistRaw = async (run) => {
  await writeFile(path.join(pkgRoot, run.stdoutRawPath), run.stdout, 'utf8')
  await writeFile(path.join(pkgRoot, run.stderrRawPath), run.stderr, 'utf8')
}

const receipt = {
  driver: 'packages/reforge/scripts/c85-mutation-counterproof.mjs',
  note: 'r5:清洁树前置;executedSet 只含 passed/failed(skipped/pending 不入 credited set);raw stdout/stderr 全量入库 c85-counterproof-raw/;四态 hash;mkdtemp+finally 零残留;vacuous(-t 零匹配 exit0)硬防。',
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
    identity:
      'pnpm --filter @type-pal/reforge exec vitest run ' +
      injection.testFile +
      ' -t ' +
      injection.testName,
    expectedErrorPart: injection.expectedErrorPart,
  }
  try {
    const treeBefore = gitStatus()
    entry.treeBeforeMutation = treeBefore
    entry.treeCleanBeforeMutation = treeBefore === ''
    const originalText = await readFileUtf8(file)
    entry.originalSha256 = sha256(originalText)
    if (!originalText.includes(injection.original)) throw new Error('ORIGINAL_SNIPPET_NOT_FOUND')

    const originalRun = await runVitest(
      injection.testFile,
      injection.testName,
      'original',
      injection.id,
    )
    await persistRaw(originalRun)
    entry.original = withoutRawBodies(originalRun)
    entry.originalGreen =
      originalRun.spawn.exitCode === 0 &&
      !originalRun.vacuous &&
      originalRun.executedSet.some((t) => t.status === 'passed')

    let mutatedRun = null
    try {
      const mutantText = originalText.replace(injection.original, injection.mutated)
      await writeFile(file, mutantText)
      entry.mutantSha256 = sha256(mutantText)
      entry.mutationApplied = entry.mutantSha256 !== entry.originalSha256
      mutatedRun = await runVitest(injection.testFile, injection.testName, 'mutated', injection.id)
      await persistRaw(mutatedRun)
      entry.mutated = withoutRawBodies(mutatedRun)
      entry.mutatedRed =
        mutatedRun.spawn.exitCode !== 0 &&
        !mutatedRun.vacuous &&
        mutatedRun.executedSet.some((t) => t.status === 'failed')
      entry.assertionFailures = mutatedRun.assertionFailures
      const matched = mutatedRun.assertionFailures.find((failure) =>
        failure.message.includes(injection.expectedErrorPart),
      )
      entry.businessAssertionError = matched ?? null
      entry.specifiedAssertionMatched = matched !== undefined
    } finally {
      await writeFile(file, originalText)
      const restoredText = await readFileUtf8(file)
      entry.restoredSha256 = sha256(restoredText)
      entry.sourceRestoredByteIdentical = restoredText === originalText
      const restoredRun = await runVitest(
        injection.testFile,
        injection.testName,
        'restored',
        injection.id,
      )
      await persistRaw(restoredRun)
      entry.restored = withoutRawBodies(restoredRun)
      entry.restoredGreen =
        restoredRun.spawn.exitCode === 0 &&
        !restoredRun.vacuous &&
        restoredRun.executedSet.some((t) => t.status === 'passed')
      entry.rebuiltSha256 = sha256(await readFileUtf8(file))
      entry.rebuiltEqualsOriginal = entry.rebuiltSha256 === entry.originalSha256
    }
    const treeAfter = gitStatus()
    entry.treeAfterRestoration = treeAfter
    entry.treeCleanAfterRestoration = treeAfter === ''
    const pass =
      entry.treeCleanBeforeMutation &&
      entry.treeCleanAfterRestoration &&
      entry.originalGreen &&
      entry.mutationApplied &&
      entry.mutatedRed &&
      entry.specifiedAssertionMatched &&
      entry.businessAssertionError !== null &&
      entry.restoredGreen &&
      entry.sourceRestoredByteIdentical &&
      entry.rebuiltEqualsOriginal &&
      typeof entry.rebuiltSha256 === 'string' &&
      entry.rebuiltSha256.length === 64
    entry.pass = pass
    if (!pass) failures++
    console.log(
      (pass ? 'PASS' : 'FAIL') +
        ' ' +
        injection.id +
        ': original=' +
        entry.originalGreen +
        ' mutated=' +
        entry.mutatedRed +
        ' restored=' +
        entry.restoredGreen +
        ' matched=' +
        entry.specifiedAssertionMatched +
        ' rebuilt=' +
        entry.rebuiltEqualsOriginal +
        ' treeClean=' +
        (entry.treeCleanBeforeMutation && entry.treeCleanAfterRestoration),
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
receipt.executedSetPolicy =
  'executedSet 只计入 status=passed|failed 的测试;skipped/pending/todo 记录在 skippedSet,不进入任何 credited 集合;vacuous(executedSet 为空)运行不作为绿/红证据。'
await writeFile(
  path.join(evidenceDir, 'c85-mutation-counterproof.json'),
  `${JSON.stringify(receipt, null, 1)}\n`,
  'utf8',
)
console.log(
  '\nreceipt: src/__tests__/coverage85/c85-mutation-counterproof.json (' +
    receipt.injectionCount +
    ' injections, ' +
    failures +
    ' failures) + raw outputs in c85-counterproof-raw/',
)
process.exit(failures === 0 ? 0 : 1)

async function readFileUtf8(file) {
  return readFileSync(file, 'utf8')
}
