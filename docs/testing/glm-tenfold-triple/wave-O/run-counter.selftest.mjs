#!/usr/bin/env node
/** 反控 judge 自测：直接调用与 runner 相同的 counter-judge.mjs（唯一判据源）。
 *  r8 修正重点：整段合法三态生命周期（0→1→0，目标状态按相变化）必须通过；
 *  spec 短 title 误拒与 collection/runtime 漏收必须有反例。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import {
  judgePhase,
  sameExecutionIdentity,
  flattenTests,
  assertNoCollectionErrors,
} from './counter-judge.mjs'

const repo = mkdtempSync(resolve(tmpdir(), 'glm-o-selftest-'))
const spec = { test: { file: 'src/x.glm-o.test.ts', title: '目标合同' } }
const pkg = 'content'
const file = resolve(repo, 'packages/content/src/x.glm-o.test.ts')
const T = (fullName, status, failureMessages = []) => ({
  file,
  fullName,
  status,
  failureMessages,
})
const counts = (passed, failed) => ({ numPassedTestSuites: passed, numFailedTestSuites: failed })
const run = (tests, extra = {}) => ({
  exitCode: 1,
  json: {
    ...counts(0, tests.length > 0 ? 1 : 0),
    numRuntimeErrorTestSuites: 0,
    numPendingTestSuites: 0,
    numTODOTests: 0,
    testResults:
      tests.length > 0 ? [{ name: file, status: 'failed', assertionResults: tests }] : [],
  },
  stdout: '',
  stderr: '',
  ...extra,
})
const greenRun = (tests, extra = {}) => {
  const r = run(tests, { exitCode: 0, ...extra })
  r.json = { ...r.json, ...counts(1, 0), testResults: [{ name: file, status: 'passed', assertionResults: tests }] }
  return r
}
const pass = (fullName) => T(fullName, 'passed')
const red = (fullName, msg = 'AssertionError: expected 1 to be 2') =>
  T(fullName, 'failed', [msg])

let n = 0
const ok = (label, fn) => {
  fn()
  n++
}
const rejects = (label, fn, match) => {
  let err
  try {
    fn()
  } catch (error) {
    err = error
  }
  assert.ok(err, `${label} 应拒收`)
  assert.match(err.message, match, `${label} 拒收消息不符`)
  n++
}

// ═══ 正控 1：整段合法三态生命周期（0→1→0，目标状态按相变化）═══
const TARGET = 'O08 组 目标合同'
const other = 'a 其它合同'
const controlRun = greenRun([pass(TARGET), pass(other)])
const injectedRun = run([red(TARGET), pass(other)])
const restoredRun = greenRun([pass(TARGET), pass(other)])
const controlTests = flattenTests(controlRun.json)
const injectedTests = flattenTests(injectedRun.json)
const restoredTests = flattenTests(restoredRun.json)
ok('正常生命周期：control 全绿', () =>
  judgePhase(controlRun, spec, 'control', pkg))
ok('正常生命周期：injected 恰一业务红', () => {
  const t = judgePhase(injectedRun, spec, 'injected', pkg)
  assert.equal(t.fullName, TARGET)
})
ok('正常生命周期：restored 全绿', () =>
  judgePhase(restoredRun, spec, 'restored', pkg))
ok(
  '正常生命周期：身份比较允许 passed→failed→passed（不再误拒状态变化）',
  () => {
    sameExecutionIdentity(controlTests, injectedTests, 'control↔injected')
    sameExecutionIdentity(injectedTests, restoredTests, 'injected↔restored')
  },
)

// ═══ 正控 2：spec.test.target 显式完整目标 ═══
ok('spec.test.target 精确匹配', () =>
  judgePhase(injectedRun, { test: { file: 'src/x.glm-o.test.ts', target: TARGET } }, 'injected', pkg))
ok('spec.test.title 迁移字段在裸 title 形态下精确匹配', () =>
  judgePhase(run([red('目标合同')]), spec, 'injected', pkg))

// ═══ 正控 3：身份一致时比较通过 ═══
ok('身份一致通过', () =>
  sameExecutionIdentity(
    [pass('a'), red('b')],
    [pass('a'), red('b')],
    'x↔y',
  ))

// ═══ 拒收：collection / runtime 总门（r8 新增）═══
rejects(
  'numRuntimeErrorTestSuites>0',
  () => {
    const r = greenRun([pass(TARGET)])
    r.json = { ...r.json, numRuntimeErrorTestSuites: 1 }
    return judgePhase(r, spec, 'control', pkg)
  },
  /numRuntimeErrorTestSuites/,
)
rejects(
  'numPendingTestSuites>0',
  () =>
    judgePhase(
      (() => {
        const r = greenRun([pass(TARGET)])
        r.json = { ...r.json, numPendingTestSuites: 1 }
        return r
      })(),
      spec,
      'control',
      pkg,
    ),
  /numPendingTestSuites/,
)
rejects(
  '空断言 failed suite（collection 错误；计数先闭合触发 suite 检查）',
  () =>
    judgePhase(
      (() => {
        const r = run([])
        r.json.numFailedTestSuites = 2
        r.json.testResults = [
          { name: file, status: 'failed', assertionResults: [] },
          { name: file, status: 'failed', assertionResults: [red(TARGET)] },
        ]
        return r
      })(),
      spec,
      'injected',
      pkg,
    ),
  /空断言 failed suite/,
)
rejects(
  '单红叠 runtime suite 计数不闭合',
  () => {
    const r = run([red(TARGET)])
    r.json.numFailedTestSuites = 1
    r.json.testResults = [
      { name: file, status: 'failed', assertionResults: [red(TARGET)] },
      { name: resolve(repo, 'packages/content/src/x.glm-o.test.ts'), status: 'failed', assertionResults: [] },
    ]
    return assertNoCollectionErrors(r.json, 'injected')
  },
  /suite 结论数 1 ≠ 报告 suite 数 2/,
)

// ═══ 拒收：执行集与状态 ═══
rejects('零执行', () => judgePhase(run([]), spec, 'injected', pkg), /零执行/)
rejects(
  'skip 叶',
  () => judgePhase(run([T(TARGET, 'skipped')]), spec, 'injected', pkg),
  /非叶状态 skipped/,
)
rejects(
  '多文件',
  () =>
    judgePhase(
      (() => {
        const r = greenRun([pass('a')])
        r.json = {
          ...r.json,
          numPassedTestSuites: 2,
          testResults: [
            { name: file, status: 'passed', assertionResults: [pass('a')] },
            { name: resolve(repo, 'packages/content/src/y.glm-o.test.ts'), status: 'passed', assertionResults: [pass('b')] },
          ],
        }
        return r
      })(),
      spec,
      'control',
      pkg,
    ),
  /单文件/,
)
rejects(
  'control 红（exit0 形态）',
  () => judgePhase(greenRun([red(TARGET)]), spec, 'control', pkg),
  /control 须全绿/,
)

// ═══ 拒收：目标精确性 ═══
rejects(
  '双红',
  () => judgePhase(run([red(TARGET), red(other)]), spec, 'injected', pkg),
  /恰一红/,
)
rejects(
  '错目标',
  () => judgePhase(run([red('完全不同的合同')]), spec, 'injected', pkg),
  /fullName 不符/,
)
rejects(
  'fullName 附加错后缀',
  () => judgePhase(run([red('a 目标合同XX')]), spec, 'injected', pkg),
  /fullName 不符/,
)
rejects(
  '错文件',
  () =>
    judgePhase(
      (() => {
        const r = run([red(TARGET)])
        r.json.testResults = [
          { name: resolve(repo, 'packages/content/src/z.glm-o.test.ts'), status: 'failed', assertionResults: [red(TARGET)] },
        ]
        return r
      })(),
      spec,
      'injected',
      pkg,
    ),
  /文件不符/,
)

// ═══ 拒收：非业务红与 harness 形态 ═══
rejects(
  '未处理 Promise 异常红',
  () =>
    judgePhase(run([red(TARGET, 'Error: promise resolved "x" instead of rejecting')]), spec, 'injected', pkg),
  /非业务 AssertionError/,
)
rejects(
  '崩溃栈红',
  () => judgePhase(run([red(TARGET, 'TypeError: cannot read')]), spec, 'injected', pkg),
  /非业务 AssertionError/,
)
rejects(
  'raw Unhandled 公告',
  () => judgePhase(run([red(TARGET)], { stderr: 'Unhandled Error: boom' }), spec, 'injected', pkg),
  /未处理异常公告/,
)
rejects(
  'exit=-1',
  () => judgePhase(greenRun([pass(TARGET)], { exitCode: -1 }), spec, 'control', pkg),
  /非正常退出码 -1/,
)
rejects(
  'injected exit=2',
  () => judgePhase(run([red(TARGET)], { exitCode: 2 }), spec, 'injected', pkg),
  /非正常退出码 2/,
)
rejects(
  'signal',
  () => judgePhase(greenRun([pass(TARGET)], { exitCode: 0, signal: 'SIGKILL' }), spec, 'control', pkg),
  /signal=SIGKILL/,
)
rejects(
  'spawn error',
  () =>
    judgePhase(greenRun([pass(TARGET)], { exitCode: 0, error: new Error('spawn ENOENT') }), spec, 'control', pkg),
  /spawn 失败/,
)

// ═══ 拒收：三相身份（多重集合不一致）═══
rejects(
  '异身份（injected 多一条）',
  () => sameExecutionIdentity([pass('a'), pass('b')], [pass('a')], 'c↔i'),
  /执行身份/,
)

rmSync(repo, { recursive: true, force: true })
console.log(`selftest ${n} 判据用例全过（整段生命周期正控 8 + 拒收 20，全部经 counter-judge.mjs 唯一判据）`)
