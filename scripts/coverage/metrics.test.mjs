import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregateMetrics, compareCoverage, compareRatio, normalizeMetrics } from './metrics.mjs'

const metrics = (covered, total) =>
  Object.fromEntries(
    ['statements', 'branches', 'functions', 'lines'].map((metric) => [metric, { covered, total }]),
  )

test('normalizeMetrics 只接受完整的整数计数', () => {
  assert.deepEqual(
    normalizeMetrics({
      statements: { covered: 1, total: 2 },
      branches: { covered: 2, total: 3 },
      functions: { covered: 3, total: 4 },
      lines: { covered: 4, total: 5 },
    }),
    {
      statements: { covered: 1, total: 2 },
      branches: { covered: 2, total: 3 },
      functions: { covered: 3, total: 4 },
      lines: { covered: 4, total: 5 },
    },
  )
  assert.throws(() => normalizeMetrics({ statements: { covered: 2, total: 1 } }))
})

test('aggregateMetrics 按 covered/total 汇总，不平均百分比', () => {
  assert.deepEqual(aggregateMetrics([metrics(1, 2), metrics(9, 10)]), metrics(10, 12))
})

test('compareRatio 用精确分数识别两位小数看不出的回退', () => {
  assert.equal(
    compareRatio({ covered: 9_999, total: 10_000 }, { covered: 1_000, total: 1_000 }),
    -1,
  )
  assert.equal(compareRatio({ covered: 3, total: 4 }, { covered: 6, total: 8 }), 0)
  assert.equal(compareRatio({ covered: 8, total: 10 }, { covered: 3, total: 4 }), 1)
})

test('compareCoverage 同时守住每包与全仓，不能用别包提升掩盖回退', () => {
  const baseline = {
    packages: {
      a: { metrics: metrics(8, 10) },
      b: { metrics: metrics(2, 10) },
    },
    total: metrics(10, 20),
  }
  const actual = {
    packages: {
      a: { metrics: metrics(7, 10) },
      b: { metrics: metrics(4, 10) },
    },
    total: metrics(11, 20),
  }
  const result = compareCoverage(actual, baseline)
  assert.ok(result.regressions.some((message) => message.startsWith('a.lines:')))
  assert.ok(result.improvements.includes('total.lines'))
})

test('ratchet 可在全仓比例不下降时接纳新 package，普通比较仍拒绝', () => {
  const baseline = { packages: { a: { metrics: metrics(1, 1) } }, total: metrics(1, 1) }
  const actual = {
    packages: { a: { metrics: metrics(1, 1) }, b: { metrics: metrics(1, 1) } },
    total: metrics(2, 2),
  }
  assert.ok(compareCoverage(actual, baseline).regressions.some((item) => item.startsWith('b:')))
  assert.deepEqual(compareCoverage(actual, baseline, { allowNewPackages: true }).regressions, [])
})
