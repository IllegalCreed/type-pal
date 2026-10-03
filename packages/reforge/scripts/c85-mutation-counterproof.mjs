#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
// TEST-COVERAGE85-GLM-REFORGE-1 — 真实注入点三态反控驱动。
// 对每个注入点:原始(绿) → 变异产品源(指定 AssertionError 红) → 恢复(绿),
// 记录执行身份(vitest -t 定位)、变异前后源 sha256、指定 AssertionError 全文。
// 用法: node scripts/c85-mutation-counterproof.mjs
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const keyVar = `$\u007bkey}`
const pkgRoot = path.resolve(import.meta.dirname, '..')
const repoRoot = path.resolve(pkgRoot, '..', '..')

const sha256 = async (file) =>
  createHash('sha256')
    .update(await readFile(file, 'utf8'))
    .digest('hex')

const runVitest = (testFile, testName) => {
  const result = spawnSync(
    'pnpm',
    ['--filter', '@type-pal/reforge', 'exec', 'vitest', 'run', testFile, '-t', testName],
    { cwd: repoRoot, encoding: 'utf8', timeout: 120_000 },
  )
  return { code: result.status, output: `${result.stdout}\n${result.stderr}` }
}

const extractAssertionError = (output) => {
  const match = output.match(/AssertionError: ([^\n]*(?:\n(?![ ]*[⎯❯]|Tests |Test Files ).*)*)/)
  return match ? `AssertionError: ${match[1].trim()}` : null
}

const injections = [
  {
    id: 'SR-FADE-DEFAULT',
    source: 'src/script-runner.ts',
    // exec() fade 缺省毫秒数(0x5E PaletteFade 缺省拍)
    original: 'return h.fade(cmd.dir, cmd.ms ?? 300, cmd.color, this.signal)',
    mutated: 'return h.fade(cmd.dir, cmd.ms ?? 301, cmd.color, this.signal)',
    testFile: 'src/script-runner.c85-arms.test.ts',
    testName: '演出缺省臂',
    expectedErrorPart: 'to deeply equal',
  },
  {
    id: 'ADAPTER-SCENE-FILTER',
    source: 'src/script-host-adapter.ts',
    // activeEntity 的当前场景过滤(current leaf 只作用于当前场景实例)
    original: 'return target?.scene === options.currentSceneId() ? target.entity : undefined',
    mutated: 'return target?.scene !== options.currentSceneId() ? target.entity : undefined',
    testFile: 'src/script-host-adapter.c85-arms.test.ts',
    testName: '跨场景过滤臂',
    expectedErrorPart: 'to deeply equal []',
  },
  {
    id: 'CORE-STEAL-SPLIT',
    source: 'src/battle/battle-core.ts',
    // performSteal 偷钱分成 R(2,3) 下界(fight.c:5193)
    original: 'const c = Math.trunc(e.stealLeft / (2 + Math.floor(rng() * 2)))',
    mutated: 'const c = Math.trunc(e.stealLeft / (3 + Math.floor(rng() * 2)))',
    testFile: 'src/battle/battle-core.c85-branches.test.ts',
    testName: '偷钱臂',
    expectedErrorPart: 'expected 3 to be 4',
  },
  {
    id: 'CORE-POISON-MP',
    source: 'src/battle/battle-core.ts',
    // tickPoison 玩家侧 mp tick 方向(fight.c:4454 DoT)
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
    // save barrier 句柄未就绪即 release 的 fail-loud 门
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
    // 快照 actor 去重守卫(稳定 id 身份,杜绝下标式身份)
    original: `if (seen.has(key)) throw new Error(\`entity-motion: duplicate snapshot actor ${keyVar}\`)`,
    mutated: `if (false) throw new Error(\`entity-motion: duplicate snapshot actor ${keyVar}\`)`,
    testFile: 'src/entity-motion.c85-arms.test.ts',
    testName: '非法快照臂',
    expectedErrorPart: 'expected [Function] to throw an error',
  },
  {
    id: 'SESSION-CHOREO-STOP-FADE',
    source: 'src/battle/battle-session.ts',
    // stopMusic 排程臂:fadeMs>0 只入排程不当拍停曲
    original: 'if (fadeMs > 0)',
    mutated: 'if (!(fadeMs > 0))',
    testFile: 'src/battle/battle-session.c85-arms.test.ts',
    testName: 'stopMusic 即时臂',
    expectedErrorPart: 'to deeply equal [ 1 ]',
  },
  {
    id: 'RUNTIME-COMPLETED-CURSOR',
    source: 'src/script-runner-core.ts',
    // completed cursor 必须对应声明 complete 的 flow(游标合法性)
    original:
      "if (!flowCanComplete(executable.flow))\n        throw new Error('ScriptRunnerCore: flow 未声明 complete，不能使用 completed cursor')",
    mutated:
      "if (false && !flowCanComplete(executable.flow))\n        throw new Error('ScriptRunnerCore: flow 未声明 complete，不能使用 completed cursor')",
    testFile: 'src/runtime-host.c85-arms.test.ts',
    testName: '完成游标臂:未声明',
    expectedErrorPart: 'promise resolved "undefined" instead of rejecting',
  },
  {
    id: 'MAIN-PARTY-FULL-HEAL',
    source: 'src/main.ts',
    // dev ?party 队员拉满合同(合击项 healthy 前提)
    original:
      'if (partyParam)\n    for (const c of world.party) {\n      c.hp = c.maxHP\n      c.mp = c.maxMP\n    }',
    mutated:
      'if (partyParam)\n    for (const c of world.party) {\n      c.hp = Math.max(1, c.maxHP - 1)\n      c.mp = Math.max(1, c.maxMP - 1)\n    }',
    testFile: 'src/main.c85-boot.test.ts',
    testName: 'dev 队伍覆写臂',
    expectedErrorPart: 'expected 99 to be 100',
  },
]

const receipt = []
let failures = 0
for (const injection of injections) {
  const file = path.join(pkgRoot, injection.source)
  const before = await sha256(file)
  const originalRun = runVitest(injection.testFile, injection.testName)
  const originalGreen = originalRun.code === 0
  let mutatedRed = false
  let restoredGreen = false
  let assertion = null
  let after = before
  if (originalGreen) {
    const text = await readFile(file, 'utf8')
    if (!text.includes(injection.original)) {
      receipt.push({ id: injection.id, error: 'ORIGINAL_SNIPPET_NOT_FOUND' })
      failures++
      continue
    }
    await writeFile(file, text.replace(injection.original, injection.mutated))
    const mutatedRun = runVitest(injection.testFile, injection.testName)
    mutatedRed = mutatedRun.code !== 0
    assertion = extractAssertionError(mutatedRun.output)
    await writeFile(file, text) // 恢复原始源
    after = await sha256(file)
    const restoredRun = runVitest(injection.testFile, injection.testName)
    restoredGreen = restoredRun.code === 0
  }
  const matched = mutatedRed && assertion?.includes(injection.expectedErrorPart) === true
  if (!originalGreen || !mutatedRed || !restoredGreen || !matched || after !== before) failures++
  receipt.push({
    id: injection.id,
    source: injection.source,
    identity: `vitest run ${injection.testFile} -t ${injection.testName}`,
    originalGreen,
    mutatedRed,
    restoredGreen,
    specifiedAssertionMatched: matched,
    assertionError: assertion,
    sourceSha256Before: before,
    sourceSha256AfterRestored: after,
  })
  console.log(
    `${matched && restoredGreen && after === before ? 'PASS' : 'FAIL'} ${injection.id}: original=${originalGreen} mutated=${mutatedRed} restored=${restoredGreen} matched=${matched}`,
  )
}

await writeFile(
  path.join(pkgRoot, 'coverage', 'c85-mutation-counterproof.json'),
  JSON.stringify(receipt, null, 2),
)
console.log(
  `\nreceipt: coverage/c85-mutation-counterproof.json (${receipt.length} injections, ${failures} failures)`,
)
process.exit(failures === 0 ? 0 : 1)
