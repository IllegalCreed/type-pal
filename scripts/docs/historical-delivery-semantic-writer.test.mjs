import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import {
  prepareHistoricalDeliveryUpdate,
  publishHistoricalDeliveryUpdate,
  validateHistoricalDeliveryChanges,
} from './historical-delivery-semantic-writer.mjs'
import { historicalDeliveryPilots } from './historical-document-delivery-admission.mjs'
import { historicalDeliveryCohort } from './historical-document-delivery-cohort.mjs'
import { publishCurrentReviewTransaction } from './review-current-generation-transaction.mjs'
import { canonicalTerminalJson } from './terminal-json.mjs'

const hash = (v) => createHash('sha256').update(canonicalTerminalJson(v)).digest('hex')
// Boundary-only synthetic records. No real 599-row corpus or raw receipt copies.
function fixture() {
  const records = new Map(),
    changes = []
  for (const binding of historicalDeliveryCohort) {
    if (!records.has(binding.reviewRecord)) records.set(binding.reviewRecord, { entries: [] })
    const before = {
      path: binding.path,
      sourceSha256: binding.historicalSourceSha256,
      sourceGitRevision: binding.historicalSourceGitRevision,
      contentReviewStatus: 'partial-review-unknown',
      templateCompliance: 'needs-migration',
      history: [{ kind: 'old-error-retained' }],
      provenance: ['old-author'],
      revision: { currentSha: binding.sourceSha256, history: [{ kind: 'old-source' }] },
    }
    records.get(binding.reviewRecord).entries[binding.reviewIndex] = before
    changes.push({
      path: binding.path,
      reviewRecord: binding.reviewRecord,
      index: binding.reviewIndex,
      beforeEntrySha256: hash(before),
      after: { ...structuredClone(before), owner: 'New governance explanation; no credit' },
    })
  }
  return { records, changes }
}
test('closed 212 identity/role/position admission preserves the accepted six pilot boundaries', () => {
  assert.equal(historicalDeliveryCohort.length, 212)
  assert.equal(new Set(historicalDeliveryCohort.map((e) => e.path)).size, 212)
  assert.equal(
    new Set(historicalDeliveryCohort.map((e) => `${e.reviewRecord}#${e.reviewIndex}`)).size,
    212,
  )
  assert.deepEqual(
    ['author-contribution-ledger', 'readonly-review-verdict', 'candidate-acceptance-verdict'].map(
      (role) => historicalDeliveryCohort.filter((e) => e.historicalRole === role).length,
    ),
    [72, 69, 71],
  )
  for (const pilot of historicalDeliveryPilots) {
    const expanded = historicalDeliveryCohort.find((e) => e.path === pilot.path)
    for (const key of Object.keys(pilot))
      assert.deepEqual(expanded[key], pilot[key], `${pilot.path}:${key}`)
  }
})
test('complete current-source delta rejects missing/duplicate/rebound/stale before rows', () => {
  const { records, changes } = fixture()
  assert.deepEqual(validateHistoricalDeliveryChanges(changes, records), {
    targets: 212,
    sourceRevisionErrata: 0,
    creditGranted: 0,
  })
  for (const mutate of [
    (a) => a.pop(),
    (a) => (a[0] = a[1]),
    (a) => a[0].index++,
    (a) => (a[0].beforeEntrySha256 = '0'.repeat(64)),
  ]) {
    const changed = structuredClone(changes)
    mutate(changed)
    assert.throws(
      () => validateHistoricalDeliveryChanges(changed, records),
      /exact212|duplicate|binding|before row/,
    )
  }
})
test('no status promotion or source-SHA washing; historical and revision prefixes survive', () => {
  const { records, changes } = fixture()
  for (const mutate of [
    (a) => (a[0].after.contentReviewStatus = 'content-reviewed'),
    (a) => (a[0].after.templateCompliance = 'template-compliant'),
    (a) => (a[0].after.sourceSha256 = '0'.repeat(64)),
    (a) => (a[0].after.history = []),
    (a) => (a[0].after.revision.history = []),
  ]) {
    const changed = structuredClone(changes)
    mutate(changed)
    assert.throws(() => validateHistoricalDeliveryChanges(changed, records), /immutable|history/)
  }
})
test('historical revision correction needs an explicit old pointer and unchanged source SHA', () => {
  const { records, changes } = fixture(),
    first = historicalDeliveryCohort[0]
  const before = records.get(first.reviewRecord).entries[first.reviewIndex]
  before.sourceGitRevision = '0'.repeat(40)
  changes[0].beforeEntrySha256 = hash(before)
  assert.throws(
    () => validateHistoricalDeliveryChanges(changes, records),
    /explicit old-source pointer/,
  )
  changes[0].after.history.push({
    kind: 'historical-source-revision-erratum',
    previousSourceGitRevision: before.sourceGitRevision,
    actualSourceGitRevision: first.historicalSourceGitRevision,
    sourceSha256Unchanged: before.sourceSha256,
  })
  assert.equal(validateHistoricalDeliveryChanges(changes, records).sourceRevisionErrata, 1)
})
test('invented prepare capabilities and a mismatched external plan are never writable', () => {
  assert.throws(
    () => publishHistoricalDeliveryUpdate({}, { allowWrite: true }),
    /prepare capability/,
  )
  assert.throws(
    () => publishCurrentReviewTransaction({}, { allowWrite: true }),
    /prepare capability/,
  )
  assert.throws(
    () => prepareHistoricalDeliveryUpdate({ root: '.', plan: {}, planSha256: '0'.repeat(64) }),
    /exact zero-credit plan/,
  )
})
