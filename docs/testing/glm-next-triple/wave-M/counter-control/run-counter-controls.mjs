// TEST-GLM-WAVE-M-1 业务反控 runner（只读产品/旧测；临时注入副本用后即删）。
//
// 协议（docs/testing/glm-next-triple/README.md 第 4 条）：
//   ① 反控变异**合法业务输入**（数据域内单轴），不是改测试期望值；
//   ② 单一可执行判据：正控 exit0；反控 exit1 + 执行数非零 + 恰一个**指定测试**的业务断言红 +
//      该断言来自注入副本的**绝对路径**（拒非目标文件）+ 无 skip + 无 timeout + 无收集/基础设施红；
//   ③ judge=FAIL 时 runner 非零退出；
//   ④ --self-test 以合成结果覆盖 timeout / 非目标文件 / 混错 / skip / 零执行 / 收集错 / 正控红反例。
//
// 用法：
//   node docs/testing/glm-next-triple/wave-M/counter-control/run-counter-controls.mjs
//   node docs/testing/glm-next-triple/wave-M/counter-control/run-counter-controls.mjs --self-test
// 输出：同目录 evidence.json（新鲜；临时副本已清理）。
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const thisDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(thisDir, '../../../../..')
const editorDir = join(repoRoot, 'packages/editor')
const uiDir = join(editorDir, 'src/ui')

/** 反控定义：合法输入单轴变异（锚点在源测试文件唯一；测试断言零改动）。 */
const controls = [
  {
    id: 'CC-M01-battlefield-screenwave',
    group: 'M01',
    source: 'BattleFieldTab.glm-m.test.tsx',
    itTitle: '常驻波动强度 blur 一次提交精确值',
    inputMutation:
      '作者输入单轴：战场常驻波动强度 3 → 4（screenWave 合法非负整数域；业务断言「落账 screenWave=3」必须识别输入被改）',
    old: "await setInput(target!, '3')",
    new: "await setInput(target!, '4')",
  },
  {
    id: 'CC-M02-item-desc-linebreak',
    group: 'M02',
    source: 'ItemTab.glm-m.test.tsx',
    itTitle: '介绍按换行拆分并剥离空行',
    inputMutation:
      '作者输入单轴：介绍第二行文本「第二行」→「第X行」（合法多行文本；业务断言按原文落账必须识别行内容差异）',
    old: "await fillAndBlur(desc!, ' recover\\n\\n第二行\\n   \\n第三行 ')",
    new: "await fillAndBlur(desc!, ' recover\\n\\n第X行\\n   \\n第三行 ')",
  },
  {
    id: 'CC-M04-poison-tick-hpdelta',
    group: 'M04',
    source: 'PoisonTab.glm-m.test.tsx',
    itTitle: '玩家 tick 四轴：扣血/半血/产道具/自解逐字段提交',
    inputMutation:
      '作者输入单轴：毒 tick 扣血 -25 → -52（hpDelta 合法负整数域；业务断言 tick 落账 -25 必须识别数值被改）',
    old: "await fillAndBlur(controlByLabel<HTMLInputElement>(host, '扣血'), '-25')",
    new: "await fillAndBlur(controlByLabel<HTMLInputElement>(host, '扣血'), '-52')",
  },
  {
    id: 'CC-M06-poison-resistance-bonus',
    group: 'M06',
    source: 'ProjectWorkbenchTab.glm-m.test.tsx',
    itTitle: '勾选毒抗→加值 3 保存进 seedConditions',
    inputMutation:
      '作者输入单轴：临时毒抗加值 3 → 5（正整数合法域；业务断言 seedConditions.poisonResistance=3 必须识别加值被改）',
    old: "await fillAndBlur(bonus, '3')",
    new: "await fillAndBlur(bonus, '5')",
  },
]

const TIMEOUT_RE = /timed?\s*out/i
/** 业务断言红的特征（vitest expect 失败统一是 AssertionError）。 */
const ASSERTION_ERROR_RE = /AssertionError/
/** 非业务红（组件抛错/收集错等）——目标测试红必须是业务断言，出现这些即判 invalid。 */
const NON_BUSINESS_ERROR_RE =
  /\b(TypeError|ReferenceError|SyntaxError|RangeError|EvalError|URIError)\b/

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
    // 文件级收集/基础设施错误 = testResults.message 非空（业务断言红不写 file message）。
    fileLevelMessages: (j.testResults ?? [])
      .filter((tr) => (tr.message ?? '').trim().length > 0)
      .map((tr) => ({ name: tr.name, message: tr.message.split('\n').slice(0, 3).join(' | ') })),
    sawTimeout,
    assertion,
  }
}

/**
 * 单一可执行判据：返回 verdict（各布尔项 + valid 合取）。
 * injectedAbsPath = 注入副本绝对路径（恰红的那个断言必须来自它，拒非目标文件）。
 */
function judgeControl(control, injectedAbsPath, positive, negative) {
  const failing = negative.assertion.filter((a) => a.status === 'failed')
  const target = failing.filter((a) => a.fullName.includes(control.itTitle))
  // 恰红断言必须是业务断言红：message 带 AssertionError 且不含任何非业务错误类型。
  const redIsBusinessAssertion =
    failing.length > 0 &&
    failing.every(
      (a) =>
        a.failureMessages.length > 0 &&
        a.failureMessages.some((m) => ASSERTION_ERROR_RE.test(m)) &&
        a.failureMessages.every((m) => !NON_BUSINESS_ERROR_RE.test(m)),
    )
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
    redIsBusinessAssertion,
    exactlyOneTargetBusinessFailure:
      failing.length === 1 &&
      target.length === 1 &&
      failing[0].fullName === target[0].fullName &&
      failing[0].file === injectedAbsPath,
  }
  verdict.valid = Object.values(verdict).every(Boolean)
  return verdict
}

/** --self-test：合成结果过 judge，覆盖 timeout/非目标文件/混错/skip/零执行/收集错/正控红。 */
function selfTest() {
  const control = controls[2]
  const injected = '/abs/packages/editor/src/ui/PoisonTab.glm-m.cc-injected.test.tsx'
  const failAt = (file, fullName, msg) => ({
    file,
    fullName,
    status: 'failed',
    failureMessages: [msg ?? 'AssertionError: expected -52 to be -25'],
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
    assertion: [failAt(injected, `M04 PoisonTab ${control.itTitle}：玩家 tick 四轴 …`)],
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
          assertion: [failAt(injected, `M04 ${control.itTitle} …`, 'Test timed out · 5000ms')],
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
          assertion: [failAt('/abs/other/file.test.ts', `M04 ${control.itTitle} …`)],
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
          assertion: [negBase.assertion[0], failAt(injected, 'M04 other case')],
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
      'typeerror-red-rejected',
      {
        pos: green,
        neg: {
          ...negBase,
          assertion: [
            failAt(
              injected,
              `M04 ${control.itTitle} …`,
              'TypeError: Cannot read properties of undefined (reading kind)',
            ),
          ],
        },
        expectValid: false,
      },
    ],
    [
      'mixed-assertion-and-typeerror-rejected',
      {
        pos: green,
        neg: {
          ...negBase,
          assertion: [
            failAt(
              injected,
              `M04 ${control.itTitle} …`,
              [
                'AssertionError: expected -52 to be -25',
                'TypeError: undefined is not a function',
              ].join('\n'),
            ),
          ],
        },
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
      ? 'SELF-TEST PASS:10/10 判据反例全覆盖(timeout/非目标文件/混错/skip/零执行/收集错/TypeError红/混合错误红/正控红)'
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
      { cwd: editorDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
  } catch (err) {
    exitCode = err.status ?? 1
  }
  return { exitCode }
}

const evidence = {
  campaign: 'TEST-GLM-WAVE-M-1',
  generatedAt: new Date().toISOString(),
  judge: '',
  controls: [],
}

if (process.argv.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1)
}

const tmpDir = mkdtempSync(join(tmpdir(), 'glm-wave-m-cc-'))
const posJson = join(tmpDir, 'positive.json')
const negJson = join(tmpDir, 'negative.json')
let allValid = false
try {
  for (const c of controls) {
    const original = readFileSync(join(uiDir, c.source), 'utf8')
    const occurrences = original.split(c.old).length - 1
    if (occurrences !== 1) {
      throw new Error(`${c.id}: 输入变异锚点不唯一(出现 ${occurrences} 次)—— 拒绝非单针注入`)
    }

    // 正控：无注入原文件（不写源文件）。
    const pos = runVitest(`src/ui/${c.source}`, posJson)
    const posSummary = summarize(posJson)

    // 反控：隔离副本（src/ui 内才能被 vitest include；用后即删；源文件零写入）。
    const tmpName = c.source.replace(/\.test\.tsx$/, '.cc-injected.test.tsx')
    const tmpPath = join(uiDir, tmpName)
    writeFileSync(tmpPath, original.replace(c.old, c.new))
    let neg
    try {
      const negRun = runVitest(`src/ui/${tmpName}`, negJson)
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
      source: `packages/editor/src/ui/${c.source}`,
      inputMutation: c.inputMutation,
      positive: { exitCode: pos.exitCode, ...posSummary },
      negativeCopyDeleted: true,
      negative: neg,
    })
  }
  allValid = evidence.controls.every((c) => c.negative.verdict.valid)
  evidence.judge = allValid
    ? 'PASS:4/4 反控有效(合法输入单轴变异;正控 exit0;注入后恰一个指定业务断言红且来自注入副本绝对路径;红色为 AssertionError 业务断言而非 TypeError 等非业务错;exit1;执行数非零;无 skip/timeout/收集错;临时副本已删)'
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
  // evidence.json 总是落盘供诊断；FAIL 时随后以非零退出（判据③）。
  writeFileSync(join(thisDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
  if (!allValid) process.exit(1)
}
