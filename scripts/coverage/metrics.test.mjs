import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregateMetrics, compareCoverage, compareRatio, normalizeMetrics } from './metrics.mjs'

const metrics = (covered, total) =>
  Object.fromEntries(
    ['statements', 'branches', 'functions', 'lines'].map((metric) => [metric, { covered, total }]),
  )

test('normalizeMetrics 保留四种指标各自的整数计数', () => {
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
})

test('normalizeMetrics 在完整输入中拒绝 covered 大于 total', () => {
  const summary = metrics(1, 2)
  summary.lines.covered = 3
  assert.throws(() => normalizeMetrics(summary, 'game'), {
    name: 'Error',
    message: 'game.lines: covered 不得大于 total',
  })
})

for (const { label, field, value } of [
  { label: '负数', field: 'covered', value: -1 },
  { label: '小数', field: 'total', value: 2.5 },
  { label: '不安全整数', field: 'total', value: Number.MAX_SAFE_INTEGER + 1 },
  { label: '文本', field: 'covered', value: '1' },
  { label: '缺失计数', field: 'total', value: undefined },
]) {
  test(`normalizeMetrics 拒绝${label}并指出指标与字段`, () => {
    const summary = metrics(1, 2)
    summary.lines[field] = value
    assert.throws(() => normalizeMetrics(summary, 'game'), {
      name: 'Error',
      message: `game.lines.${field} 必须是非负整数`,
    })
  })
}

test('aggregateMetrics 按 covered/total 汇总，不平均百分比', () => {
  assert.deepEqual(
    aggregateMetrics([
      {
        statements: { covered: 1, total: 2 },
        branches: { covered: 2, total: 3 },
        functions: { covered: 0, total: 1 },
        lines: { covered: 4, total: 5 },
      },
      {
        statements: { covered: 9, total: 10 },
        branches: { covered: 1, total: 4 },
        functions: { covered: 2, total: 3 },
        lines: { covered: 1, total: 1 },
      },
    ]),
    {
      statements: { covered: 10, total: 12 },
      branches: { covered: 3, total: 7 },
      functions: { covered: 2, total: 4 },
      lines: { covered: 5, total: 6 },
    },
  )
})

test('compareRatio 用精确分数识别两位小数看不出的回退', () => {
  // 两个交叉积在 Number 中相等；整数真值相差 1，显示也都舍入成 100.00%。
  assert.equal(((99_999_999 / 100_000_000) * 100).toFixed(2), '100.00')
  assert.equal(((100_000_000 / 100_000_001) * 100).toFixed(2), '100.00')
  assert.equal(
    compareRatio(
      { covered: 99_999_999, total: 100_000_000 },
      { covered: 100_000_000, total: 100_000_001 },
    ),
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
  assert.deepEqual(result, {
    regressions: [
      'a.statements: 70.00% (7/10) < 80.00% (8/10)',
      'a.branches: 70.00% (7/10) < 80.00% (8/10)',
      'a.functions: 70.00% (7/10) < 80.00% (8/10)',
      'a.lines: 70.00% (7/10) < 80.00% (8/10)',
    ],
    improvements: [
      'b.statements',
      'b.branches',
      'b.functions',
      'b.lines',
      'total.statements',
      'total.branches',
      'total.functions',
      'total.lines',
    ],
  })
})

test('ratchet 可在全仓比例不下降时接纳新 package，普通比较仍拒绝', () => {
  const baseline = { packages: { a: { metrics: metrics(1, 1) } }, total: metrics(1, 1) }
  const actual = {
    packages: { a: { metrics: metrics(1, 1) }, b: { metrics: metrics(1, 1) } },
    total: metrics(2, 2),
  }
  assert.deepEqual(compareCoverage(actual, baseline).regressions, ['b: package 集合与基线不一致'])
  assert.deepEqual(compareCoverage(actual, baseline, { allowNewPackages: true }).regressions, [])
})
