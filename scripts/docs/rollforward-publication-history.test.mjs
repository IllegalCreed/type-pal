import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { test } from 'node:test'
import {
  publishRollforwardHistory,
  verifyRollforwardHistoryPublication,
} from './rollforward-history-publication.mjs'
import { rollforwardFixture, rollforwardTestRoot } from './rollforward-publication.test-support.mjs'
import {
  grantRollforwardPlan,
  inspectRollforwardCohort,
  priorRollforwardRecord,
  repairRollforwardPublicationHistory,
  rollforwardHistoryEvent,
} from './rollforward-review.mjs'

test('all205 real accepted rows gain only an exact publication observation, preserving original4351 and signatures', () => {
  const { plan, records: prior } = rollforwardFixture()
  const published = grantRollforwardPlan(plan)
  const original = structuredClone(published)
  const repaired = repairRollforwardPublicationHistory(published)
  assert.equal(repaired.repaired, 205)
  assert.equal(repaired.alreadyRecorded, 0)
  const cohort = inspectRollforwardCohort(repaired.records)
  for (const { owner, index, row } of cohort.byPath.values()) {
    const before = original.get(owner).entries[index]
    assert.deepEqual(before.history, [])
    assert.deepEqual(row.history, [rollforwardHistoryEvent(before)])
    assert.deepEqual(row.currentIndependentAcceptance, before.currentIndependentAcceptance)
    assert.deepEqual({ ...row, history: [] }, before)
  }
  assert.deepEqual(published, original, 'pure repair must not mutate its input')
  assert.deepEqual(
    new Map(
      [...repaired.records].map(([owner, record]) => [
        owner,
        priorRollforwardRecord(record, cohort),
      ]),
    ),
    prior,
  )
  const replay = repairRollforwardPublicationHistory(repaired.records)
  assert.equal(replay.repaired, 0)
  assert.equal(replay.alreadyRecorded, 205)
  assert.deepEqual(replay.records, repaired.records)
})

test('altered publication, subject, accepted identity, credit, extra fields and duplicate events cannot bypass the frozen root', () => {
  const repaired = repairRollforwardPublicationHistory(
    grantRollforwardPlan(rollforwardFixture().plan),
  ).records
  const { owner, index } = inspectRollforwardCohort(repaired).byPath.values().next().value
  for (const [key, value] of [
    ['publicationRevision', '0'.repeat(40)],
    ['path', 'docs/ops/forged.md'],
    ['acceptedBodySha256', '0'.repeat(64)],
    ['acceptedContentSha256', '0'.repeat(64)],
    ['runtimeCredit', true],
    ['childSemanticCredit', true],
    ['newSemanticCredit', 1],
    ['originalHistory', [{ kind: 'fabricated-reading' }]],
    ['unreviewedExtension', true],
  ]) {
    const bad = structuredClone(repaired)
    bad.get(owner).entries[index].history[0][key] = value
    assert.throws(() => inspectRollforwardCohort(bad), /publication history/, key)
  }
  const bad = structuredClone(repaired)
  const history = bad.get(owner).entries[index].history
  history.push(structuredClone(history[0]))
  assert.throws(() => inspectRollforwardCohort(bad), /publication history/)
})

test('history normalization cannot launder changed conclusions, signatures or unrelated prior records', () => {
  const repaired = repairRollforwardPublicationHistory(
    grantRollforwardPlan(rollforwardFixture().plan),
  ).records
  const { owner, index } = inspectRollforwardCohort(repaired).byPath.values().next().value
  const bad = structuredClone(repaired)
  bad.get(owner).entries[index].coreConclusion += ' forged conclusion'
  assert.throws(() => inspectRollforwardCohort(bad), /signature changed/)
  const changed = structuredClone(repaired)
  const row = changed.get(owner).entries[index]
  row.currentIndependentAcceptance.contentSha256 = '0'.repeat(64)
  row.history = [rollforwardHistoryEvent(row)]
  assert.throws(() => inspectRollforwardCohort(changed), /signature changed/)
  const unrelated = structuredClone(repaired)
  const old = [...unrelated.values()]
    .flatMap((record) => record.entries)
    .find((item) => !item.rollforwardIntake)
  old.history.push({ kind: 'unrelated unapproved change' })
  assert.throws(() => inspectRollforwardCohort(unrelated), /unaffected original review content/)
})

test('all205 observations resolve the real f6a publication; forged handles and unavailable Git cannot publish', () => {
  const published = grantRollforwardPlan(rollforwardFixture().plan)
  assert.deepEqual(verifyRollforwardHistoryPublication(rollforwardTestRoot, published), {
    publicationRevision: 'f6a956529cfa5efdb79a72af89feef08a21cab60',
    verifiedRows: 205,
  })
  const repaired = repairRollforwardPublicationHistory(published).records
  assert.deepEqual(
    verifyRollforwardHistoryPublication(rollforwardTestRoot, repaired),
    verifyRollforwardHistoryPublication(rollforwardTestRoot, published),
  )
  assert.throws(() => verifyRollforwardHistoryPublication(tmpdir(), published))
  assert.throws(
    () => publishRollforwardHistory({ repaired: 205 }, { allowWrite: true }),
    /original history-repair capability/,
  )
})
