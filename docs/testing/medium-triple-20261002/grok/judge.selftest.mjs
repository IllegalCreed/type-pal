/**
 * 拒收自测。只调用 judge.mjs，不启动产品测试，不写 counters/。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { judgeHashes, judgeMutant, judgeTriple } from './judge.mjs'

const NEW_FILE = '/tmp/tree/packages/game/src/shell/bootstrap-resources.grok-mid-1.test.ts'
const OLD_FILE = '/tmp/tree/packages/game/src/shell/bootstrap-resources.test.ts'
const TARGET = 'grok-mid-1 bootstrap barriers target oracle'
const OLD_NAME = 'bootstrap resource lifecycle starts soundfont first'

function leaf(fullName, status, failureMessages = []) {
  return { fullName, status, failureMessages }
}

function report(files, extra = {}) {
  const leaves = files.flatMap((file) => file.leaves)
  const passed = leaves.filter((item) => item.status === 'passed').length
  const failed = leaves.filter((item) => item.status === 'failed').length
  const pending = leaves.filter(
    (item) => item.status === 'pending' || item.status === 'skipped',
  ).length
  const todo = leaves.filter((item) => item.status === 'todo').length
  return {
    numTotalTests: leaves.length,
    numPassedTests: passed,
    numFailedTests: failed,
    numPendingTests: pending,
    numTodoTests: todo,
    numRuntimeErrorTestSuites: 0,
    testResults: files.map((file) => ({
      name: file.name,
      status: file.leaves.some((item) => item.status === 'failed') ? 'failed' : 'passed',
      assertionResults: file.leaves,
    })),
    ...extra,
  }
}

function run(exitCode, stdout = '', stderr = '') {
  return { exitCode, signal: null, stdout, stderr }
}

const registered = {
  file: 'src/shell/bootstrap-resources.grok-mid-1.test.ts',
  fullName: TARGET,
  oldFile: 'src/shell/bootstrap-resources.test.ts',
}

const sha = {
  product: { original: 'aaa', mutant: 'bbb', restored: 'aaa' },
  test: { original: 'ccc', mutant: 'ccc', restored: 'ccc' },
}

function states(mutantReport, mutantRun = run(1)) {
  const clean = report([
    { name: NEW_FILE, leaves: [leaf(TARGET, 'passed')] },
    { name: OLD_FILE, leaves: [leaf(OLD_NAME, 'passed')] },
  ])
  return {
    original: { report: clean, run: run(0) },
    mutant: { report: mutantReport, run: mutantRun },
    restored: { report: clean, run: run(0) },
  }
}

function reasons(mutantReport, mutantRun, options = {}) {
  return judgeTriple(states(mutantReport, mutantRun), registered, {
    tempRoot: '/tmp/tree',
    sha,
    ...options,
  }).reasons
}

const acceptedMutant = report([
  {
    name: NEW_FILE,
    leaves: [leaf(TARGET, 'failed', ['AssertionError: expected 1 to be 2'])],
  },
  { name: OLD_FILE, leaves: [leaf(OLD_NAME, 'passed')] },
])

test('accepts one AssertionError with old leaves green and stable identity', () => {
  assert.deepEqual(reasons(acceptedMutant), [])
})

test('rejects a green mutant', () => {
  const green = report([
    { name: NEW_FILE, leaves: [leaf(TARGET, 'passed')] },
    { name: OLD_FILE, leaves: [leaf(OLD_NAME, 'passed')] },
  ])
  assert.ok(reasons(green, run(0)).some((reason) => reason.includes('exit 0')))
})

test('rejects skip, pending, and todo', () => {
  const skipped = report([
    { name: NEW_FILE, leaves: [leaf(TARGET, 'failed', ['AssertionError: x'])] },
    { name: OLD_FILE, leaves: [leaf(OLD_NAME, 'skipped')] },
  ])
  assert.ok(reasons(skipped).some((reason) => reason.includes('pending')))
  const todo = report([
    { name: NEW_FILE, leaves: [leaf(TARGET, 'todo')] },
    { name: OLD_FILE, leaves: [leaf(OLD_NAME, 'passed')] },
  ])
  assert.ok(reasons(todo, run(0)).some((reason) => reason.includes('todo')))
})

test('rejects zero leaves, collection failure, and runtime suites', () => {
  const empty = report([])
  empty.numTotalTests = 0
  assert.ok(reasons(empty).some((reason) => reason.includes('zero leaf')))
  const collected = report([])
  collected.testResults = [{ name: NEW_FILE, status: 'failed', assertionResults: [] }]
  assert.ok(reasons(collected).some((reason) => reason.includes('collection failure')))
  const runtime = report([
    {
      name: NEW_FILE,
      leaves: [leaf(TARGET, 'failed', ['AssertionError: x'])],
    },
    { name: OLD_FILE, leaves: [leaf(OLD_NAME, 'passed')] },
  ])
  runtime.numRuntimeErrorTestSuites = 1
  assert.ok(reasons(runtime).some((reason) => reason.includes('runtime error')))
})

test('rejects unhandled text, multiple reds, wrong identity, and non-assertions', () => {
  assert.ok(
    reasons(acceptedMutant, run(1, 'Unhandled Rejection')).some((reason) =>
      reason.includes('unhandled'),
    ),
  )
  const two = report([
    {
      name: NEW_FILE,
      leaves: [
        leaf(TARGET, 'failed', ['AssertionError: a']),
        leaf('other', 'failed', ['AssertionError: b']),
      ],
    },
    { name: OLD_FILE, leaves: [leaf(OLD_NAME, 'passed')] },
  ])
  assert.ok(reasons(two).some((reason) => reason.includes('failed count 2')))
  const wrong = report([
    { name: NEW_FILE, leaves: [leaf('other oracle', 'failed', ['AssertionError: a'])] },
    { name: OLD_FILE, leaves: [leaf(OLD_NAME, 'passed')] },
  ])
  assert.ok(reasons(wrong).some((reason) => reason.includes('wrong target')))
  const typeError = report([
    { name: NEW_FILE, leaves: [leaf(TARGET, 'failed', ['TypeError: boom'])] },
    { name: OLD_FILE, leaves: [leaf(OLD_NAME, 'passed')] },
  ])
  assert.ok(reasons(typeError).some((reason) => reason.includes('non-assertion')))
})

test('rejects signal, old red, identity drift, and hash mistakes', () => {
  const signaled = reasons(acceptedMutant, {
    exitCode: 1,
    signal: 'SIGTERM',
    stdout: '',
    stderr: '',
  })
  assert.ok(signaled.some((reason) => reason.includes('signal')))
  const oldRed = report([
    {
      name: NEW_FILE,
      leaves: [leaf(TARGET, 'failed', ['AssertionError: x'])],
    },
    { name: OLD_FILE, leaves: [leaf(OLD_NAME, 'failed', ['AssertionError: old'])] },
  ])
  assert.ok(reasons(oldRed).some((reason) => reason.includes('old leaf not green')))
  const drifted = states(acceptedMutant)
  drifted.mutant.report = report([
    {
      name: NEW_FILE,
      leaves: [leaf('renamed', 'failed', ['AssertionError: x'])],
    },
    { name: OLD_FILE, leaves: [leaf(OLD_NAME, 'passed')] },
  ])
  const driftReasons = judgeTriple(drifted, registered, { tempRoot: '/tmp/tree', sha }).reasons
  assert.ok(driftReasons.some((reason) => reason.includes('identity multiset')))
  assert.ok(
    judgeHashes({
      product: { original: 'aaa', mutant: 'aaa', restored: 'aaa' },
      test: { original: 'ccc', mutant: 'ccc', restored: 'ccc' },
    }).some((reason) => reason.includes('did not change')),
  )
  assert.ok(
    judgeHashes({
      product: { original: 'aaa', mutant: 'bbb', restored: 'zzz' },
      test: { original: 'ccc', mutant: 'ddd', restored: 'ccc' },
    }).includes('test bytes changed'),
  )
})

test('judgeMutant rejects a null spawn status', () => {
  const result = judgeMutant(
    acceptedMutant,
    { exitCode: null, signal: null, stdout: '', stderr: '' },
    registered,
    {
      tempRoot: '/tmp/tree',
    },
  )
  assert.ok(result.reasons.includes('spawn error'))
})
