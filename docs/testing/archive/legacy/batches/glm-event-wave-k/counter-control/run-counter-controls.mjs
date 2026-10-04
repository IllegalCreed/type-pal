// TEST-GLM-EVENT-WAVE-K-1 业务反控 runner r2(只读产品/旧测;临时注入副本用后即删)。
//
// Codex 4ebea2b5 审核 r2 要求:
//   ① 反控变异**合法业务输入**(opcode/operand),不是改测试期望值 —— 证测试能识别脚本/操作数业务错误;
//   ② 单一可执行判据:正控 exit0;反控 exit1 + 执行数非零 + 恰一个**指定测试**的业务断言红 +
//      该断言来自注入副本的**绝对路径**(拒非目标文件)+ 无 skip + 无 timeout + 无收集/基础设施红;
//   ③ judge=FAIL 时 runner 非零退出;
//   ④ --self-test 以合成结果覆盖 timeout 与非目标文件反例(及混错/skip/零执行/收集错/正控红)。
//
// 用法:
//   node docs/testing/archive/legacy/batches/glm-event-wave-k/counter-control/run-counter-controls.mjs   # 全流程(FAIL 非零退出)
//   node docs/testing/archive/legacy/batches/glm-event-wave-k/counter-control/run-counter-controls.mjs --self-test
// 输出:docs/testing/archive/legacy/batches/glm-event-wave-k/counter-control/evidence.json(新鲜;临时副本已清理)。
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const thisDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(thisDir, '../../../../../../..')
const gameDir = join(repoRoot, 'packages/game')
const srcDir = join(gameDir, 'src/core')

/** 反控定义:合法输入单轴变异(anchor 在源文件唯一;测试断言零改动)。 */
const controls = [
  {
    id: 'CC-K02-auto-reset-idleframes',
    group: 'K02',
    source: 'event-system.glm-event-k02.test.ts',
    itTitle: 'idleFrames=3:前 2 tick 停在 resetTo',
    inputMutation:
      '脚本 operand 合法域内单轴:idleFrames 3 → 4(计数门推迟一 tick → 第 3 tick 仍在 resetTo,业务断言"第 3 tick 计数满 fall-through 落 ip1"必须识别)',
    old: `{ op: 'end', reset: true, resetTo: 0, idleFrames: 3, label: 'L_0' }`,
    new: `{ op: 'end', reset: true, resetTo: 0, idleFrames: 4, label: 'L_0' }`,
  },
  {
    id: 'CC-K05-fadescreen-speed',
    group: 'K05',
    source: 'event-system.glm-event-k05.test.ts',
    itTitle: '0x73[1] → fadeState',
    inputMutation:
      'opcode operand 合法域内单轴:0x73 fade speed [1,0,0] → [0,0,0](video.c (op0+1)*10*72 → totalMs 720,业务断言 speed=1 首先识别)',
    old: `{ op: 'raw', opcode: OP_FADE_SCREEN, operands: [1, 0, 0] }`,
    new: `{ op: 'raw', opcode: OP_FADE_SCREEN, operands: [0, 0, 0] }`,
  },
  {
    id: 'CC-K03-sellmenu-opcode',
    group: 'K03',
    source: 'event-system.glm-event-k03.test.ts',
    itTitle: '0x27 → handler 一次({mode:sell})',
    inputMutation:
      'opcode 合法域内单轴:0x27 卖出 → 0x26 买入(同族合法 opcode;业务断言 handler mode=sell 必须识别菜单开错侧)',
    old: `{ op: 'raw', opcode: OP_SELL_MENU, operands: [operand0, 0, 0] }`,
    new: `{ op: 'raw', opcode: OP_BUY_MENU, operands: [operand0, 0, 0] }`,
  },
]

const TIMEOUT_RE = /timed?\s*out/i

function summarize(jsonPath) {
  const j = JSON.parse(readFileSync(jsonPath, 'utf8'))
  const assertion = []
  let sawTimeout = false
  for (const tr of j.testResults ?? []) {
    for (const a of tr.assertionResults ?? []) {
      const msgs = (a.failureMessages ?? []).map((m) => m.split('\n').slice(0, 4).join(' | '))
      if (msgs.some((m) => TIMEOUT_RE.test(m))) sawTimeout = true
      assertion.push({
        file: tr.name,
        fullName: a.fullName,
        status: a.status,
        failureMessages: msgs,
      })
    }
  }
  return {
    numTotalTests: j.numTotalTests ?? 0,
    numPassedTests: j.numPassedTests ?? 0,
    numFailedTests: j.numFailedTests ?? 0,
    numPendingTests: j.numPendingTests ?? 0,
    numTodoTests: j.numTodoTests ?? 0,
    // 文件级收集/基础设施错误 = testResults.message 非空(业务断言红不写 file message)。
    fileLevelMessages: (j.testResults ?? [])
      .filter((tr) => (tr.message ?? '').trim().length > 0)
      .map((tr) => ({ name: tr.name, message: tr.message.split('\n').slice(0, 3).join(' | ') })),
    sawTimeout,
    assertion,
  }
}

/**
 * 单一可执行判据:返回 verdict(各布尔项 + valid 合取)。
 * - positive/negative:summarize() 输出 + exitCode;injectedAbsPath = 注入副本绝对路径
 *   (恰红的那个断言必须来自它,拒非目标文件)。
 */
function judgeControl(control, injectedAbsPath, positive, negative) {
  const failing = negative.assertion.filter((a) => a.status === 'failed')
  const target = failing.filter((a) => a.fullName.includes(control.itTitle))
  const verdict = {
    positiveGreen:
      positive.exitCode === 0 && positive.numFailedTests === 0 && positive.numTotalTests > 0,
    negativeExit1: negative.exitCode === 1,
    executedNonZero: negative.numTotalTests > 0,
    noSkip: negative.numPendingTests === 0 && negative.numTodoTests === 0,
    noTimeout: negative.sawTimeout === false,
    noCollectionOrInfraError:
      negative.fileLevelMessages.length === 0 &&
      failing.length > 0 &&
      failing.every((a) => a.failureMessages.length > 0),
    exactlyOneTargetBusinessFailure:
      failing.length === 1 &&
      target.length === 1 &&
      failing[0].fullName === target[0].fullName &&
      failing[0].file === injectedAbsPath,
  }
  verdict.valid = Object.values(verdict).every(Boolean)
  return verdict
}

/** --self-test:合成结果过 judge,覆盖 timeout / 非目标文件 / 混错 / skip / 零执行 / 收集错 / 正控红。 */
function selfTest() {
  const control = controls[1]
  const injected = '/abs/packages/game/src/core/event-system.glm-event-k05.cc-injected.test.ts'
  const failAt = (file, fullName, msg) => ({
    file,
    fullName,
    status: 'failed',
    failureMessages: [msg ?? 'expected 1440 to be 720'],
  })
  const green = {
    exitCode: 0,
    numTotalTests: 3,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    fileLevelMessages: [],
    sawTimeout: false,
    assertion: [],
  }
  const negBase = {
    exitCode: 1,
    numTotalTests: 3,
    numFailedTests: 1,
    numPendingTests: 0,
    numTodoTests: 0,
    fileLevelMessages: [],
    sawTimeout: false,
    assertion: [failAt(injected, `K05 ${control.itTitle} …`)],
  }
  const cases = [
    ['valid', { pos: green, neg: negBase, expectValid: true }],
    [
      'timeout-rejected',
      {
        pos: green,
        neg: {
          ...negBase,
          sawTimeout: true,
          assertion: [failAt(injected, `K05 ${control.itTitle} …`, 'Test timed out · 5000ms')],
        },
        expectValid: false,
      },
    ],
    [
      'non-target-file-rejected',
      {
        pos: green,
        neg: {
          ...negBase,
          assertion: [failAt('/abs/other/file.test.ts', `K05 ${control.itTitle} …`)],
        },
        expectValid: false,
      },
    ],
    [
      'mixed-failures-rejected',
      {
        pos: green,
        neg: {
          ...negBase,
          numFailedTests: 2,
          assertion: [negBase.assertion[0], failAt(injected, 'K05 other case')],
        },
        expectValid: false,
      },
    ],
    ['skip-rejected', { pos: green, neg: { ...negBase, numPendingTests: 1 }, expectValid: false }],
    [
      'zero-exec-rejected',
      { pos: green, neg: { ...negBase, numTotalTests: 0 }, expectValid: false },
    ],
    [
      'collection-error-rejected',
      {
        pos: green,
        neg: { ...negBase, fileLevelMessages: [{ name: injected, message: 'SyntaxError' }] },
        expectValid: false,
      },
    ],
    [
      'positive-red-rejected',
      { pos: { ...green, exitCode: 1, numFailedTests: 1 }, neg: negBase, expectValid: false },
    ],
  ]
  let ok = true
  for (const [name, c] of cases) {
    const v = judgeControl(control, injected, c.pos, c.neg)
    const pass = v.valid === c.expectValid
    ok = ok && pass
    console.log(
      `self-test ${name}: ${pass ? 'PASS' : 'FAIL'} (valid=${v.valid}, expect=${c.expectValid})`,
    )
  }
  console.log(
    ok
      ? 'SELF-TEST PASS:8/8 判据反例全覆盖(timeout/非目标文件/混错/skip/零执行/收集错/正控红)'
      : 'SELF-TEST FAIL',
  )
  return ok
}

function runVitest(relTestPath, outJson) {
  let exitCode = 0
  try {
    execFileSync(
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
  }
  return { exitCode }
}

const evidence = {
  campaign: 'TEST-GLM-EVENT-WAVE-K-1',
  revision: 'r2',
  generatedAt: new Date().toISOString(),
  judge: '',
  controls: [],
}

if (process.argv.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1)
}

const tmpDir = mkdtempSync(join(tmpdir(), 'glm-wave-k-cc-'))
const posJson = join(tmpDir, 'positive.json')
const negJson = join(tmpDir, 'negative.json')
let allValid = false
try {
  for (const c of controls) {
    const original = readFileSync(join(srcDir, c.source), 'utf8')
    const occurrences = original.split(c.old).length - 1
    if (occurrences !== 1) {
      throw new Error(`${c.id}: 输入变异锚点不唯一(出现 ${occurrences} 次)—— 拒绝非单针注入`)
    }

    // 正控:无注入原文件(不写源文件)
    const pos = runVitest(`src/core/${c.source}`, posJson)
    const posSummary = summarize(posJson)

    // 反控:隔离副本(src/core 内才能被 vitest include;用后即删;源文件零写入)
    const tmpName = c.source.replace(/\.test\.ts$/, '.cc-injected.test.ts')
    const tmpPath = join(srcDir, tmpName)
    writeFileSync(tmpPath, original.replace(c.old, c.new))
    let neg
    try {
      const negRun = runVitest(`src/core/${tmpName}`, negJson)
      const negSummary = summarize(negJson)
      const verdict = judgeControl(
        c,
        tmpPath,
        { ...posSummary, exitCode: pos.exitCode },
        { ...negSummary, exitCode: negRun.exitCode },
      )
      neg = {
        ...negSummary,
        runExitCode: negRun.exitCode,
        injectedCopyAbsolutePath: tmpPath,
        verdict,
      }
    } finally {
      rmSync(tmpPath, { force: true })
    }

    evidence.controls.push({
      id: c.id,
      group: c.group,
      source: `packages/game/src/core/${c.source}`,
      inputMutation: c.inputMutation,
      positive: { exitCode: pos.exitCode, ...posSummary },
      negativeCopyDeleted: true,
      negative: neg,
    })
  }
  allValid = evidence.controls.every((c) => c.negative.verdict.valid)
  evidence.judge = allValid
    ? 'PASS:3/3 反控有效(合法输入单轴变异;正控 exit0;注入后恰一个指定业务断言红且来自注入副本绝对路径;exit1;执行数非零;无 skip/timeout/收集错;临时副本已删)'
    : 'FAIL:存在 invalid 反控,见 controls[].negative.verdict'
  console.log(evidence.judge)
  for (const c of evidence.controls) {
    const red = c.negative.assertion.find((a) => a.status === 'failed')
    console.log(
      `${c.id}: valid=${c.negative.verdict.valid} posExit=${c.positive.exitCode}(${c.positive.numPassedTests}/${c.positive.numTotalTests}) negExit=${c.negative.runExitCode} failed=${c.negative.numFailedTests}/${c.negative.numTotalTests} redFile=${red?.file ?? 'N/A'} red="${red?.fullName ?? 'N/A'}"`,
    )
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true })
  // evidence.json 总是落盘供诊断;FAIL 时随后以非零退出(判据③)
  writeFileSync(join(thisDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
  if (!allValid) process.exit(1)
}
