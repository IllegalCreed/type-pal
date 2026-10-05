/**
 * TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 反控判据 selftest(r2 返工)。
 *
 * Codex 一审:r1 runner 判据误收。本 selftest 用合成三相位反例逐项证明:
 *   (a) r1 旧判据(validateNeedleR1)确实会放行这些反例(误收证明);
 *   (b) r2 新判据(validateNeedleR2)全部拒绝,且对合法针形不过严(sanity-valid 通过)。
 * 合成相位与 runPhase 产出同构(makePhase),不触产品源、不落临时树;除
 * selftest-results.json 外零写入,前后对产品源取 sha 作清理证明。
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  digest,
  executionSet,
  failedAssertions,
  identitySet,
  validateNeedleR1,
  validateNeedleR2,
} from './mutation-lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..', '..', '..')
const productPath = join(repoRoot, 'packages/game/src/core/event-system.ts')

const CONTRACT_A =
  'TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 控制流残差合同 resolveConfirmGoto fail-closed(3442-3452):0x0A 否提交时 operand[0] 目标不在 labelMap → 清问句 + 终止脚本回 explore(不落是分支)'
const CONTRACT_B =
  'TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 控制流残差合同 0x7F[0,0,0xFFFF] 回正豁免(2388-2391,script.c:2314):唯一不清屏组合 —— 残留 box/立绘保留,后续无 setDialogStyle 对话 append 继承 portrait 90;[0,0,0] 清屏后新建无立绘'
const CONTRACT_C = 'TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 控制流残差合同 额外冒出来的第三个用例(合成)'
const FILE = '/synthetic/packages/game/src/core/event-system.glm-event-control-flow.test.ts'

const ASSERTION_ERROR = ['AssertionError: expected 1 to be 2']

/** 合成相位:tests → detail/jsonSummary/identitySet/executionSet/failedAssertions。 */
function makePhase({
  tests,
  exitCode,
  signal = null,
  spawnError = null,
  extraSuites = [],
  numPendingTestsOverride,
}) {
  const suites = [
    {
      name: FILE,
      status: 'passed',
      assertionResults: tests.map((t) => ({
        fullName: t.fullName,
        status: t.status,
        failureMessages: t.messages ?? [],
      })),
    },
    ...extraSuites,
  ]
  const derivedExit =
    exitCode !== undefined ? exitCode : tests.some((t) => t.status === 'failed') ? 1 : 0
  const failed = suites.flatMap((s) =>
    s.assertionResults.filter((a) => a.status === 'failed').map((a) => ({ fullName: a.fullName })),
  )
  const detail = digest({
    numTotalTests: suites.reduce((n, s) => n + s.assertionResults.length, 0),
    numPassedTests: suites.reduce(
      (n, s) => n + s.assertionResults.filter((a) => a.status === 'passed').length,
      0,
    ),
    numFailedTests: failed.length,
    numPendingTests:
      numPendingTestsOverride !== undefined
        ? numPendingTestsOverride
        : suites.reduce(
            (n, s) => n + s.assertionResults.filter((a) => a.status === 'pending').length,
            0,
          ),
    success: failed.length === 0 && extraSuites.every((s) => s.status !== 'failed'),
    testResults: suites.map((s) => ({
      name: s.name,
      status: s.status,
      assertionResults: s.assertionResults,
    })),
  })
  return {
    exitCode: derivedExit,
    signal,
    spawnError,
    spawnTimedOut: false,
    parseError: null,
    detail,
    jsonSummary: {
      reporterFieldsPresent: detail.reporterFieldsPresent,
      numTotalTests: detail.numTotalTests,
      numPassedTests: detail.numPassedTests,
      numFailedTests: detail.numFailedTests,
      numPendingTests: detail.numPendingTests,
      success: detail.success,
      numRuntimeErrorTestSuites: detail.numRuntimeErrorTestSuites,
    },
    identitySet: identitySet(detail),
    executionSet: executionSet(detail),
    failedAssertions: failedAssertions(detail),
    failedFullNames: failed.map((f) => `${FILE} :: ${f.fullName}`),
  }
}

const original = makePhase({
  tests: [
    { fullName: CONTRACT_A, status: 'passed' },
    { fullName: CONTRACT_B, status: 'passed' },
  ],
})
const restored = makePhase({
  tests: [
    { fullName: CONTRACT_A, status: 'passed' },
    { fullName: CONTRACT_B, status: 'passed' },
  ],
})

const cases = [
  {
    name: 'sanity-valid',
    scenario: '恰目标合同 A 一条 AssertionError 红、exit1、执行集与状态零漂移',
    expectNewValid: true,
    expectOldValid: true,
    mutated: makePhase({
      tests: [
        { fullName: CONTRACT_A, status: 'failed', messages: ASSERTION_ERROR },
        { fullName: CONTRACT_B, status: 'passed' },
      ],
    }),
  },
  {
    name: 'two-failures',
    scenario: '目标合同 A 与无关合同 B 同时红(各含 AssertionError)',
    expectNewValid: false,
    expectOldValid: true,
    mutated: makePhase({
      tests: [
        { fullName: CONTRACT_A, status: 'failed', messages: ASSERTION_ERROR },
        { fullName: CONTRACT_B, status: 'failed', messages: ASSERTION_ERROR },
      ],
    }),
  },
  {
    name: 'wrong-contract',
    scenario: '唯一失败是无关合同 B(目标合同 A 仍绿)',
    expectNewValid: false,
    expectOldValid: true,
    mutated: makePhase({
      tests: [
        { fullName: CONTRACT_A, status: 'passed' },
        { fullName: CONTRACT_B, status: 'failed', messages: ASSERTION_ERROR },
      ],
    }),
  },
  {
    name: 'exit-zero',
    scenario: '报告 1 失败但进程 exit 0(红相位必须 exit≠0)',
    expectNewValid: false,
    expectOldValid: true,
    mutated: makePhase({
      tests: [
        { fullName: CONTRACT_A, status: 'failed', messages: ASSERTION_ERROR },
        { fullName: CONTRACT_B, status: 'passed' },
      ],
      exitCode: 0,
    }),
  },
  {
    name: 'signal-kill',
    scenario: '进程被信号杀死(exit null / signal SIGKILL),stdout 仍带可解析 JSON',
    expectNewValid: false,
    expectOldValid: true,
    mutated: makePhase({
      tests: [
        { fullName: CONTRACT_A, status: 'failed', messages: ASSERTION_ERROR },
        { fullName: CONTRACT_B, status: 'passed' },
      ],
      exitCode: null,
      signal: 'SIGKILL',
    }),
  },
  {
    name: 'spawn-error',
    scenario: 'spawn 失败(ENOENT),进程未真正执行',
    expectNewValid: false,
    expectOldValid: true,
    mutated: makePhase({
      tests: [
        { fullName: CONTRACT_A, status: 'failed', messages: ASSERTION_ERROR },
        { fullName: CONTRACT_B, status: 'passed' },
      ],
      exitCode: null,
      spawnError: 'Error: spawn pnpm ENOENT',
    }),
  },
  {
    name: 'pending-plus-fail',
    scenario: '目标合同红 + 另一用例 pending(r1 已拒,r2 同样拒绝)',
    expectNewValid: false,
    expectOldValid: false,
    mutated: makePhase({
      tests: [
        { fullName: CONTRACT_A, status: 'failed', messages: ASSERTION_ERROR },
        { fullName: CONTRACT_B, status: 'pending' },
      ],
    }),
  },
  {
    name: 'runtime-collection-error',
    scenario: '额外套件 failed 且零断言(collection/runtime error;r1 已拒,r2 同样拒绝)',
    expectNewValid: false,
    expectOldValid: false,
    mutated: makePhase({
      tests: [
        { fullName: CONTRACT_A, status: 'failed', messages: ASSERTION_ERROR },
        { fullName: CONTRACT_B, status: 'passed' },
      ],
      extraSuites: [{ name: '/synthetic/other.test.ts', status: 'failed', assertionResults: [] }],
    }),
  },
  {
    name: 'todo-status',
    scenario: '目标合同红 + 另一用例 status=todo 而 numPendingTests 报 0(汇总字段口径盲区)',
    expectNewValid: false,
    expectOldValid: true,
    mutated: makePhase({
      tests: [
        { fullName: CONTRACT_A, status: 'failed', messages: ASSERTION_ERROR },
        { fullName: CONTRACT_B, status: 'todo' },
      ],
      numPendingTestsOverride: 0,
    }),
  },
  {
    name: 'execution-set-drift',
    scenario: '红相位多出一个原始相位没有的用例 C(执行集漂移)',
    expectNewValid: false,
    expectOldValid: true,
    mutated: makePhase({
      tests: [
        { fullName: CONTRACT_A, status: 'failed', messages: ASSERTION_ERROR },
        { fullName: CONTRACT_B, status: 'passed' },
        { fullName: CONTRACT_C, status: 'passed' },
      ],
    }),
  },
]

const productShaBefore = `sha256:${createHash('sha256').update(readFileSync(productPath)).digest('hex')}`
const point = { targetContract: CONTRACT_A }
const results = []
let allMatch = true
for (const c of cases) {
  const args = {
    point,
    original,
    mutated: c.mutated,
    restored,
    targetShaOriginal: 'sha256:same',
    targetShaRestored: 'sha256:same',
  }
  const verdictNew = validateNeedleR2(args)
  const verdictOld = validateNeedleR1(args)
  const newMatches = verdictNew.valid === c.expectNewValid
  const oldMatches = verdictOld.valid === c.expectOldValid
  if (!newMatches || !oldMatches) allMatch = false
  results.push({
    case: c.name,
    scenario: c.scenario,
    expectNewValid: c.expectNewValid,
    expectOldValid: c.expectOldValid,
    newVerdict: verdictNew,
    oldVerdict: verdictOld,
    newMatchesExpectation: newMatches,
    oldMatchesExpectation: oldMatches,
  })
}
const productShaAfter = `sha256:${createHash('sha256').update(readFileSync(productPath)).digest('hex')}`
const misAccepted = results.filter((r) => r.expectOldValid && !r.expectNewValid).map((r) => r.case)

const report = {
  card: 'TEST-GLM-GAME-EVENT-CONTROL-FLOW-1',
  kind: 'mutation-criteria-selftest',
  generatedAt: new Date().toISOString(),
  provenance: '合成相位(与 runPhase 同构,makePhase 构造),不 spawn、不触产品源、零临时树',
  cleanupProof: {
    productShaBefore,
    productShaAfter,
    productUntouched: productShaBefore === productShaAfter,
  },
  misAcceptProof: {
    claim: '下列反例满足 r1 旧判据(旧 runner 判 VALID)但被 r2 新判据拒绝 —— 证明旧判据误收',
    casesOldAcceptsNewRejects: misAccepted,
  },
  summary: {
    cases: results.length,
    allExpectationsMatched: allMatch,
    oldAcceptsNewRejects: misAccepted.length,
  },
  results,
}
writeFileSync(join(here, 'selftest-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(
  `selftest: ${results.length} cases, allExpectationsMatched=${allMatch}, oldMisAccepts=${misAccepted.length} [${misAccepted.join(', ')}], productUntouched=${report.cleanupProof.productUntouched}`,
)
process.exitCode = allMatch && report.cleanupProof.productUntouched ? 0 : 1
