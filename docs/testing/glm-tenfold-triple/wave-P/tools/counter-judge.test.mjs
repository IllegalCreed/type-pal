import assert from 'node:assert/strict'
import { test } from 'node:test'
import { judgeClean, judgeMutant } from './counter-judge.mjs'

const file = (name, status, message) => ({
  name: `/repo/packages/editor/${name}`,
  assertionResults: [{ fullName: name, status, failureMessages: message ? [message] : [] }],
})

const ok = (msg) => `AssertionError: ${msg}`
const rejectsRed = 'Error: promise resolved "undefined" instead of rejecting'

test('恰一目标 AssertionError 红 → 接受', () => {
  const r = judgeMutant({
    exitCode: 1,
    json: { testResults: [file('src/a.glm-p.test.ts', 'failed', ok('boom'))] },
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'src/a.glm-p.test.ts',
    positiveExecuted: 1,
  })
  assert.equal(r.valid, true)
  assert.equal(r.reasons.length, 0)
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

test('错误目标单红 → 拒收', () => {
  const r = judgeMutant({
    exitCode: 1,
    json: { testResults: [file('src/other.glm-p.test.ts', 'failed', ok('boom'))] },
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'src/a.glm-p.test.ts',
    positiveExecuted: 1,
  })
  assert.equal(r.valid, false)
  assert.ok(r.reasons.includes('wrong-file:src/other.glm-p.test.ts'))
})

test('fullName 不匹配 → 拒收', () => {
  const r = judgeMutant({
    exitCode: 1,
    json: { testResults: [file('src/a.glm-p.test.ts', 'failed', ok('boom'))] },
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'another-full-name',
    positiveExecuted: 1,
  })
  assert.equal(r.valid, false)
  assert.ok(r.reasons.includes('wrong-fullName'))
})

test('超时/环境/收集红 → 拒收', () => {
  for (const message of [
    'Error: Test timed out in 5000ms.',
    'Error: Cannot find module ./x',
    'Error: No test files found, exiting with code 1',
  ]) {
    const r = judgeMutant({
      exitCode: 1,
      json: { testResults: [file('src/a.glm-p.test.ts', 'failed', message)] },
      targetFile: 'src/a.glm-p.test.ts',
      targetFullName: 'src/a.glm-p.test.ts',
      positiveExecuted: 1,
    })
    assert.equal(r.valid, false, message)
    assert.ok(
      r.reasons.some((x) => x === 'harness-red'),
      message,
    )
  }
})

test('零执行/JSON缺失/exit0 → 拒收', () => {
  assert.equal(
    judgeMutant({
      exitCode: 1,
      json: { testResults: [] },
      targetFile: 'a',
      targetFullName: 'a',
      positiveExecuted: 0,
    }).valid,
    false,
  )
  assert.equal(
    judgeMutant({
      exitCode: 1,
      json: null,
      targetFile: 'a',
      targetFullName: 'a',
      positiveExecuted: 1,
    }).valid,
    false,
  )
  assert.equal(
    judgeMutant({
      exitCode: 0,
      json: { testResults: [file('a', 'passed')] },
      targetFile: 'a',
      targetFullName: 'a',
      positiveExecuted: 1,
    }).valid,
    false,
  )
})

test('执行集变化（邻居被过滤/少跑）→ 拒收', () => {
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

test('skipped/todo → 拒收', () => {
  const r = judgeMutant({
    exitCode: 1,
    json: { testResults: [file('src/a.glm-p.test.ts', 'skipped')] },
    targetFile: 'src/a.glm-p.test.ts',
    targetFullName: 'src/a.glm-p.test.ts',
    positiveExecuted: 1,
  })
  assert.equal(r.valid, false)
  assert.ok(r.reasons.some((x) => x.startsWith('skipped-or-todo:1')))
})

test('judgeClean：正控/恢复相全绿且执行数一致 → 接受；失败/执行数漂移 → 拒收', () => {
  assert.equal(
    judgeClean({
      exitCode: 0,
      json: { testResults: [file('a', 'passed')] },
      expectedExecuted: 1,
      label: 'positive',
    }).valid,
    true,
  )
  assert.equal(
    judgeClean({
      exitCode: 1,
      json: { testResults: [file('a', 'failed', ok('x'))] },
      expectedExecuted: 1,
      label: 'restored',
    }).valid,
    false,
  )
  assert.equal(
    judgeClean({
      exitCode: 0,
      json: { testResults: [file('a', 'passed')] },
      expectedExecuted: 24,
      label: 'restored',
    }).valid,
    false,
  )
})
