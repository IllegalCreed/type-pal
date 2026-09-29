// TEST-GLM-EVENT-WAVE-K-1 业务反控 runner(只读产品/旧测;临时注入副本用后即删)。
//
// 判据(任务卡):同一判据下 ——
//   正控:无注入的原测试文件 exit 0;
//   反控:对隔离副本做**单轴变异**(恰一处业务断言期望值)后,只有该指定测试的一个业务断言红、
//         进程 exit 1、实际执行数非零;混错/skip/timeout/零执行/收集错误/基础设施红均 invalid。
// 用法:node docs/testing/glm-event-wave-k/counter-control/run-counter-controls.mjs
// 输出:docs/testing/glm-event-wave-k/counter-control/evidence.json(新鲜 JSON;临时副本已清理)。
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..')
const gameDir = join(repoRoot, 'packages/game')
const srcDir = join(gameDir, 'src/core')

/** 反控定义:源文件 + 恰一处单轴变异(unique old → new)+ 期望失败的 it 标题子串。 */
const controls = [
  {
    id: 'CC-K02-auto-reset-idleframes',
    group: 'K02',
    source: 'event-system.glm-event-k02.test.ts',
    itTitle: 'idleFrames=3:前 2 tick 停在 resetTo',
    mutation:
      'business expectation `第 3 tick 计数满 fall-through 落 ip1` 1 → 0(否定 fall-through 合同)',
    old: `      // tick3:count 3 ≥ 3 → 计数清零 + ip++ → 落到 ip1(fall-through,不再跳回)
      expect(tick()).toBe(1)`,
    new: `      // tick3:count 3 ≥ 3 → 计数清零 + ip++ → 落到 ip1(fall-through,不再跳回)
      expect(tick()).toBe(0)`,
  },
  {
    id: 'CC-K05-fadescreen-totalms',
    group: 'K05',
    source: 'event-system.glm-event-k05.test.ts',
    itTitle: '0x73[1] → fadeState{speed:1,totalMs:1440}',
    mutation:
      'business expectation `dither 总时长 (op0+1)*10*72` 1440 → 720(否定 video.c 步数合同)',
    old: 'expect(gs.fadeState?.totalMs).toBe(1440)',
    new: 'expect(gs.fadeState?.totalMs).toBe(720)',
  },
  {
    id: 'CC-K03-sellmenu-mode',
    group: 'K03',
    source: 'event-system.glm-event-k03.test.ts',
    itTitle: '0x27[4] → handler 一次({mode:sell, storeNum:4})',
    mutation: 'business expectation `0x27 handler mode` sell → buy(否定卖出侧 opcode 分派合同)',
    old: "expect(calls[0]?.mode).toBe('sell')",
    new: "expect(calls[0]?.mode).toBe('buy')",
  },
]

function runVitest(relTestPath, outJson) {
  // --reporter=json 全量结果;exit code = vitest 退出码(0 全绿 / 1 有红)
  let exitCode = 0
  let stdout = ''
  try {
    stdout = execFileSync(
      'pnpm',
      [
        'exec',
        'vitest',
        'run',
        relTestPath,
        '--no-file-parallelism',
        '--reporter=json',
        `--outputFile=${outJson}`,
      ],
      { cwd: gameDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
  } catch (err) {
    exitCode = err.status ?? 1
    stdout = err.stdout ?? ''
  }
  return { exitCode, stdout }
}

function summarize(jsonPath) {
  const j = JSON.parse(readFileSync(jsonPath, 'utf8'))
  const assertion = []
  for (const tr of j.testResults ?? []) {
    for (const a of tr.assertionResults ?? []) {
      assertion.push({
        fullName: a.fullName,
        status: a.status,
        failureMessages: (a.failureMessages ?? []).map((m) =>
          m.split('\n').slice(0, 3).join(' | '),
        ),
      })
    }
  }
  return {
    numTotalTests: j.numTotalTests,
    numPassedTests: j.numPassedTests,
    numFailedTests: j.numFailedTests,
    numPendingTests: j.numPendingTests,
    numTodoTests: j.numTodoTests,
    success: j.success,
    // 文件级收集/基础设施错误 = testResults.message 非空(业务断言红只标 assertion status,
    // 不写 file message);这里收集所有非空 message 供判定。
    fileLevelMessages: (j.testResults ?? [])
      .filter((tr) => (tr.message ?? '').trim().length > 0)
      .map((tr) => ({ name: tr.name, message: tr.message.split('\n').slice(0, 3).join(' | ') })),
    assertion,
  }
}

const evidence = {
  campaign: 'TEST-GLM-EVENT-WAVE-K-1',
  generatedAt: new Date().toISOString(),
  judge: '',
  controls: [],
}
const tmpDir = mkdtempSync(join(tmpdir(), 'glm-wave-k-cc-'))
const posJson = join(tmpDir, 'positive.json')
const negJson = join(tmpDir, 'negative.json')

try {
  for (const c of controls) {
    const srcPath = join(srcDir, c.source)
    const original = readFileSync(srcPath, 'utf8')
    const occurrences = original.split(c.old).length - 1
    if (occurrences !== 1) {
      throw new Error(`${c.id}: mutation anchor 不是唯一(出现 ${occurrences} 次)—— 拒绝非单轴注入`)
    }

    // —— 正控:无注入原文件(直接跑源文件;不写源文件) ——
    const pos = runVitest(`src/core/${c.source}`, posJson)
    const posSummary = summarize(posJson)

    // —— 反控:隔离副本(仓库外临时目录不可被 vitest include;副本必须落在 src/core 内才能被跑,
    //      用后即删;不触碰源文件/产品/旧测) ——
    const tmpName = c.source.replace(/\.test\.ts$/, '.cc-injected.test.ts')
    const tmpPath = join(srcDir, tmpName)
    writeFileSync(tmpPath, original.replace(c.old, c.new))
    let neg
    try {
      const negRun = runVitest(`src/core/${tmpName}`, negJson)
      const negSummary = summarize(negJson)
      const failing = negSummary.assertion.filter((a) => a.status === 'failed')
      const expectedRed = failing.filter((a) => a.fullName.includes(c.itTitle))
      const verdict = {
        exitCode1: negRun.exitCode === 1,
        executedNonZero: negSummary.numTotalTests > 0,
        exactlyOneBusinessFailure:
          failing.length === 1 &&
          expectedRed.length === 1 &&
          failing[0]?.fullName === expectedRed[0]?.fullName,
        noSkip: negSummary.numPendingTests === 0 && negSummary.numTodoTests === 0,
        noCollectionOrInfraError:
          negSummary.fileLevelMessages.length === 0 &&
          failing.every((a) => (a.failureMessages ?? []).length > 0),
        positiveGreen:
          pos.exitCode === 0 && posSummary.numFailedTests === 0 && posSummary.numTotalTests > 0,
      }
      verdict.valid = Object.values(verdict).every(Boolean)
      neg = { ...negSummary, runExitCode: negRun.exitCode, verdict }
    } finally {
      rmSync(tmpPath, { force: true })
    }

    evidence.controls.push({
      id: c.id,
      group: c.group,
      source: `packages/game/src/core/${c.source}`,
      mutation: c.mutation,
      positive: { exitCode: pos.exitCode, ...posSummary },
      negativeInjectedCopyDeleted: true,
      negative: neg,
    })
  }
  evidence.judge = evidence.controls.every((c) => c.negative.verdict.valid)
    ? 'PASS:3/3 反控有效(正控 exit0;注入后恰一个指定业务断言红 + exit1 + 执行数非零 + 无 skip/timeout/收集错误;临时副本已删)'
    : 'FAIL:存在 invalid 反控,见 controls[].negative.verdict'
  console.log(evidence.judge)
  for (const c of evidence.controls) {
    console.log(
      `${c.id}: valid=${c.negative.verdict.valid} posExit=${c.positive.exitCode}(${c.positive.numPassedTests}/${c.positive.numTotalTests}) negExit=${c.negative.runExitCode} failed=${c.negative.numFailedTests}/${c.negative.numTotalTests} red="${c.negative.assertion.find((a) => a.status === 'failed')?.fullName ?? 'N/A'}"`,
    )
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true })
}

writeFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
)
