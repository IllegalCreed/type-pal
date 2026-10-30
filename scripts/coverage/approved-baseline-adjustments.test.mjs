import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { adjustApprovedBaseline } from './approved-baseline-adjustments.mjs'
import { aggregateMetrics, compareCoverage } from './metrics.mjs'

const metrics = (covered, total) =>
  Object.fromEntries(
    ['statements', 'branches', 'functions', 'lines'].map((key) => [key, { covered, total }]),
  )
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const fixture = () => {
  const baseline = {
    packages: { changed: { metrics: metrics(9, 10) }, untouched: { metrics: metrics(4, 5) } },
    total: metrics(13, 15),
  }
  return {
    baseline,
    approval: {
      id: 'finite-removal',
      baselineSha256: digest(JSON.stringify(baseline)),
      sources: [{ path: 'src/changed.ts', sha256: digest('current source') }],
      packages: { changed: { before: metrics(9, 10), after: metrics(8, 9) } },
    },
  }
}

test('an exact approved structural removal changes only its package counters, retaining scope and raw baseline', async () => {
  const { baseline, approval } = fixture()
  const before = structuredClone(baseline)
  const actual = {
    packages: { changed: { metrics: metrics(8, 9) }, untouched: { metrics: metrics(4, 5) } },
    total: metrics(12, 14),
  }
  assert.equal(compareCoverage(actual, baseline).regressions.length, 8)
  const adjusted = await adjustApprovedBaseline(
    baseline,
    async (path) => {
      assert.equal(path, 'src/changed.ts')
      return 'current source'
    },
    [approval],
  )
  assert.deepEqual(adjusted.applied, ['finite-removal'])
  assert.deepEqual(adjusted.baseline, actual)
  assert.deepEqual(baseline, before)
  assert.deepEqual(compareCoverage(actual, adjusted.baseline).regressions, [])
})

test('changed source or stale approval counters fail closed; unknown baseline receives no adjustment', async () => {
  const { baseline, approval } = fixture()
  await assert.rejects(
    () => adjustApprovedBaseline(baseline, async () => 'changed again', [approval]),
    /源码已变化/,
  )
  const invalid = structuredClone(approval)
  invalid.packages.changed.before = metrics(8, 10)
  await assert.rejects(
    () => adjustApprovedBaseline(baseline, async () => 'current source', [invalid]),
    /旧计数不匹配/,
  )
  const unknown = structuredClone(baseline)
  unknown.packages.changed.metrics = metrics(8, 10)
  unknown.total = aggregateMetrics(Object.values(unknown.packages).map((p) => p.metrics))
  assert.deepEqual(
    await adjustApprovedBaseline(unknown, async () => {
      throw new Error('must not read')
    }, [approval]),
    { baseline: unknown, applied: [] },
  )
})

test('approval never accepts an extra regression in the adjusted package or in another package', async () => {
  const { baseline, approval } = fixture()
  const adjusted = await adjustApprovedBaseline(baseline, async () => 'current source', [approval])
  for (const id of ['changed', 'untouched']) {
    const actual = structuredClone(adjusted.baseline)
    actual.packages[id].metrics.lines.covered--
    actual.total = aggregateMetrics(Object.values(actual.packages).map((p) => p.metrics))
    assert.deepEqual(
      compareCoverage(actual, adjusted.baseline).regressions.map((x) => x.split(':')[0]),
      [`${id}.lines`, 'total.lines'],
    )
  }
})
