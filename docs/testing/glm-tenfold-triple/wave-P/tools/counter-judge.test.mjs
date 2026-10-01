import assert from 'node:assert/strict'
import { test } from 'node:test'
import { collectionErrors, judgeClean, judgeMutant } from './counter-judge.mjs'

const file = (name, status, message) => ({
  name: `/repo/packages/editor/${name}`,
  assertionResults: [{ fullName: name, status, failureMessages: message ? [message] : [] }],
})

const ok = (msg) => `AssertionError: ${msg}`
const rejectsRed = 'Error: promise resolved "undefined" instead of rejecting'

// ---------- 既有判据回归 ----------

test('恰一目标 AssertionError 红 → 接受', () => {
  const r = judgeMutant({
    exitCode: 1,
    json: { testResults: [file('src/a.glm-p.test.ts', 'failed', ok('boom'))] },
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'src/a.glm-p.test.ts',
    positiveExecuted: 1,
  })
  assert.equal(r.valid, true)
})

test('Vitest rejects 的 Error: promise resolved 前缀（源自 AssertionError）→ 接受', () => {
  const r = judgeMutant({
    exitCode: 1,
    json: { testResults: [file('src/a.glm-p.test.ts', 'failed', rejectsRed)] },
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'src/a.glm-p.test.ts',
    positiveExecuted: 1,
  })
  assert.equal(r.valid, true)
})

test('两红 → 拒收（不过滤邻居）', () => {
  const r = judgeMutant({
    exitCode: 1,
    json: {
      testResults: [
        file('src/a.glm-p.test.ts', 'failed', ok('one')),
        file('src/a.glm-p.test.ts', 'failed', ok('two')),
      ],
    },
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'src/a.glm-p.test.ts',
    positiveExecuted: 2,
  })
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => x.startsWith('multi-failed:2')))
})

test('错误目标单红 / fullName 不匹配 → 拒收', () => {
  const wrongFile = judgeMutant({
    exitCode: 1,
    json: { testResults: [file('src/other.glm-p.test.ts', 'failed', ok('boom'))] },
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'src/a.glm-p.test.ts',
    positiveExecuted: 1,
  })
  assert.equal(wrongFile.valid, false)
  const wrongName = judgeMutant({
    exitCode: 1,
    json: { testResults: [file('src/a.glm-p.test.ts', 'failed', ok('boom'))] },
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'another-full-name',
    positiveExecuted: 1,
  })
  assert.equal(wrongName.valid, false)
  assert.ok(wrongName.reasons.includes('wrong-fullName'))
})

test('执行集数量漂移 → 拒收', () => {
  const r = judgeMutant({
    exitCode: 1,
    json: { testResults: [file('src/a.glm-p.test.ts', 'failed', ok('boom'))] },
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'src/a.glm-p.test.ts',
    positiveExecuted: 24,
  })
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => x.startsWith('executed-set-changed')))
})

// ---------- r3.5 预审四反例（逐条对齐 codex-zcode-pq-preflight-20261001）----------

test('反例1：零执行 clean（exit 0、testResults=[]、expectedExecuted=0）→ 拒收', () => {
  const r = judgeClean({
    exitCode: 0,
    json: { testResults: [] },
    expectedExecuted: 0,
    label: 'positive',
  })
  assert.equal(r.valid, false)
  assert.ok(r.reasons.includes('positive:zero-executed'))
})

test('反例2：同数量不同身份（restored 只有 different-neighbor）→ 拒收', () => {
  const r = judgeClean({
    exitCode: 0,
    json: { testResults: [file('different-neighbor', 'passed')] },
    expectedExecuted: 1,
    expectedIdentitySet: ['src/a.glm-p.test.ts×target'],
    label: 'restored',
  })
  assert.equal(r.valid, false)
  assert.ok(r.reasons.includes('restored:identity-set-mismatch'))
})

test('反例3：单目标红叠加收集错误（suite 空断言 + SyntaxError + runtimeError 计数）→ 拒收', () => {
  const r = judgeMutant({
    exitCode: 1,
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'target',
    positiveExecuted: 1,
    json: {
      numRuntimeErrorTestSuites: 1,
      numFailedTestSuites: 2,
      testResults: [
        file('src/a.glm-p.test.ts', 'failed', 'AssertionError: boom'),
        {
          name: '/repo/packages/editor/src/b.glm-p.test.ts',
          status: 'failed',
          message: 'SyntaxError: broken collection',
          assertionResults: [],
        },
      ],
    },
  })
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => x.startsWith('mutated:suite-collection-error:')))
  assert.ok(r.reasons.includes('mutated:runtime-error-suites'))
})

test('反例4：pending 状态 clean → 拒收（要求每条 passed）', () => {
  const r = judgeClean({
    exitCode: 0,
    json: { testResults: [file('target', 'pending')] },
    expectedExecuted: 1,
    label: 'restored',
  })
  assert.equal(r.valid, false)
  assert.ok(r.reasons.includes('restored:non-passfail-status:pending'))
})

test('clean 相 failed 叶子 → 拒收；collectionErrors 直测', () => {
  const r = judgeClean({
    exitCode: 0,
    json: { testResults: [file('a', 'failed', ok('x'))] },
    expectedExecuted: 1,
    label: 'restored',
  })
  assert.equal(r.valid, false)
  assert.ok(r.reasons.includes('restored:failed-1'))
  assert.deepEqual(collectionErrors({ testResults: [] }), [])
})

// ---------- signal / spawn 失败分开拒收 ----------

test('signal 非空 → mutant/clean 均拒收（与 exit 分开）', () => {
  const m = judgeMutant({
    exitCode: 1,
    json: { testResults: [file('src/a.glm-p.test.ts', 'failed', ok('boom'))] },
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'src/a.glm-p.test.ts',
    positiveExecuted: 1,
    signal: 'SIGKILL',
  })
  assert.equal(m.valid, false)
  assert.ok(m.reasons.includes('mutated:signal-SIGKILL'))
  const c = judgeClean({
    exitCode: 0,
    json: { testResults: [file('a', 'passed')] },
    expectedExecuted: 1,
    label: 'restored',
    signal: 'SIGTERM',
  })
  assert.equal(c.valid, false)
  assert.ok(c.reasons.includes('restored:signal-SIGTERM'))
})

test('spawnError → mutant/clean 均拒收（即使 exitCode/json 看似正常）', () => {
  const m = judgeMutant({
    exitCode: 1,
    json: { testResults: [file('src/a.glm-p.test.ts', 'failed', ok('boom'))] },
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'src/a.glm-p.test.ts',
    positiveExecuted: 1,
    spawnError: 'ENOENT: vitest bin missing',
  })
  assert.equal(m.valid, false)
  assert.ok(m.reasons.includes('mutated:spawn-error'))
  const c = judgeClean({
    exitCode: 0,
    json: { testResults: [file('a', 'passed')] },
    expectedExecuted: 1,
    label: 'positive',
    spawnError: 'EACCES',
  })
  assert.equal(c.valid, false)
  assert.ok(c.reasons.includes('positive:spawn-error'))
})

// ---------- 身份集合比较正例 ----------

test('positive/restored 完整 file×fullName 身份集合一致 → 接受', () => {
  const identity = ['src/a.glm-p.test.ts×src/a.glm-p.test.ts', 'src/b.glm-p.test.ts×neighbor']
  const json = {
    testResults: [
      file('src/a.glm-p.test.ts', 'passed'),
      {
        name: '/repo/packages/editor/src/b.glm-p.test.ts',
        assertionResults: [{ fullName: 'neighbor', status: 'passed', failureMessages: [] }],
      },
    ],
  }
  const r = judgeClean({
    exitCode: 0,
    json,
    expectedExecuted: 2,
    expectedIdentitySet: identity,
    label: 'restored',
  })
  assert.equal(r.valid, true)
})

test('skipped/todo → mutant 拒收', () => {
  const r = judgeMutant({
    exitCode: 1,
    json: { testResults: [file('src/a.glm-p.test.ts', 'skipped')] },
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'src/a.glm-p.test.ts',
    positiveExecuted: 1,
  })
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => x.startsWith('mutated:non-passfail-status:skipped')))
})
