#!/usr/bin/env node
/**
 * 反控判据自测：把合成一手事实喂给**同一个正式判据** judge.mjs#judgeRun，
 * 断言每个用例的 invalid 判定方向。不读工作树、不跑 vitest。
 * 用法：node docs/testing/archive/legacy/batches/kimi-editor-workflows/counter-control/selftest.mjs
 */
import { fileURLToPath } from 'node:url'
import { judgeRun } from './judge.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const item = {
  label: 'demo-needle',
  tests: ['packages/editor/src/ui/Demo.kimi-workflows.test.tsx'],
  expectFailed: ['Demo describe 某用例'],
}
const controlItem = { label: 'control-demo', control: true, tests: item.tests, expectFailed: [] }
const base = {
  item,
  expectedTestFiles: [`${here}fake-root/packages/editor/src/ui/Demo.kimi-workflows.test.tsx`],
  exitCode: 1,
  signal: null,
  stdout: 'MUTATION_HIT demo-needle',
  report: {
    numTotalTests: 3,
    numPendingTests: 0,
    numTodoTests: 0,
    testResults: [
      {
        name: `${here}fake-root/packages/editor/src/ui/Demo.kimi-workflows.test.tsx`,
        assertionResults: [
          {
            fullName: 'Demo describe 某用例',
            status: 'failed',
            failureMessages: ['AssertionError: expected 1 to be 2'],
          },
          { fullName: 'Demo describe 其它用例', status: 'passed', failureMessages: [] },
        ],
      },
    ],
  },
  controlExecuted: 3,
  mutationHitExpected: true,
  productHashChanged: false,
  findOccurrences: 1,
}

const cases = [
  { name: 'valid-red 基线', mutate: () => undefined, expectInvalid: null },
  {
    name: 'exit 2（环境错）invalid',
    mutate: (input) => {
      input.exitCode = 2
    },
    expectInvalid: 'invalid:exit=2',
  },
  {
    name: 'exit null（spawn 异常）invalid',
    mutate: (input) => {
      input.exitCode = null
      input.signal = 'SIGTERM'
    },
    expectInvalid: 'invalid:signal=SIGTERM',
  },
  {
    name: 'timeout 失败 invalid',
    mutate: (input) => {
      input.report.testResults[0].assertionResults[0].failureMessages = [
        'AssertionError: Test timed out in 5000ms.',
      ]
    },
    expectInvalid: 'invalid:timeout@Demo describe 某用例',
  },
  {
    name: 'TypeError 混错 invalid',
    mutate: (input) => {
      input.report.testResults[0].assertionResults[0].failureMessages = [
        'AssertionError: expected 1 to be 2',
        'TypeError: boom is not a function',
      ]
    },
    expectInvalid: 'invalid:mixed-error@Demo describe 某用例',
  },
  {
    name: '非 AssertionError 前缀 invalid',
    mutate: (input) => {
      input.report.testResults[0].assertionResults[0].failureMessages = ['Error: boom']
    },
    expectInvalid: 'invalid:non-assertion-failure@Demo describe 某用例',
  },
  {
    name: '空 failureMessages invalid',
    mutate: (input) => {
      input.report.testResults[0].assertionResults[0].failureMessages = []
    },
    expectInvalid: 'invalid:no-failure-message@Demo describe 某用例',
  },
  {
    name: 'pending/skip invalid',
    mutate: (input) => {
      input.report.numPendingTests = 1
    },
    expectInvalid: 'invalid:pending=1+todo=0',
  },
  {
    name: 'skipped 状态 invalid',
    mutate: (input) => {
      input.report.testResults[0].assertionResults[1].status = 'skipped'
    },
    expectInvalid: 'invalid:skipped-status=skipped',
  },
  {
    name: '失败落在未声明文件 invalid',
    mutate: (input) => {
      input.report.testResults[0].name = `${here}fake-root/packages/editor/src/ui/Other.test.tsx`
    },
    expectInvalid: 'invalid:failure-file=',
  },
  {
    name: '失败集合不符 invalid',
    mutate: (input) => {
      input.report.testResults[0].assertionResults[0].fullName = 'Demo describe 别的用例'
    },
    expectInvalid: 'invalid:failed-set=',
  },
  {
    name: '执行数偏离控制 invalid',
    mutate: (input) => {
      input.controlExecuted = 2
    },
    expectInvalid: 'invalid:executed=3!=control=2',
  },
  {
    name: 'MUTATION_HIT 缺失 invalid',
    mutate: (input) => {
      input.stdout = ''
    },
    expectInvalid: 'invalid:mutation-not-loaded',
  },
  {
    name: '产品 hash 漂移 invalid',
    mutate: (input) => {
      input.productHashChanged = true
    },
    expectInvalid: 'invalid:product-hash-changed',
  },
  {
    name: 'find 多处命中 invalid',
    mutate: (input) => {
      input.findOccurrences = 2
    },
    expectInvalid: 'invalid:find-occurrences=2',
  },
  {
    name: 'valid-green-control 基线',
    mutate: (input) => {
      input.item = controlItem
      input.exitCode = 0
      input.stdout = ''
      input.mutationHitExpected = false
      input.report.testResults[0].assertionResults[0].status = 'passed'
      input.report.testResults[0].assertionResults[0].failureMessages = []
    },
    expectInvalid: null,
  },
  {
    name: '控制针意外红 invalid',
    mutate: (input) => {
      input.item = controlItem
      input.exitCode = 0
      input.stdout = ''
      input.mutationHitExpected = false
    },
    expectInvalid: 'invalid:control-red=',
  },
]

let failed = 0
const results = cases.map(({ name, mutate, expectInvalid }) => {
  const input = JSON.parse(JSON.stringify(base))
  mutate(input)
  const reasons = judgeRun(input)
  const pass =
    expectInvalid === null ? reasons.length === 0 : reasons.some((r) => r.startsWith(expectInvalid))
  if (!pass) failed += 1
  return { name, expectInvalid, reasons, pass }
})
console.log(JSON.stringify({ total: results.length, failed, results }, null, 2))
if (failed) process.exit(1)
