// Repair a missing observation without re-signing content or inventing an old
// read/run. Physical writes remain owned by the existing guarded transaction.
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import {
  prepareCurrentReviewTransaction,
  publishCurrentReviewTransaction,
} from './review-current-generation-transaction.mjs'
import { packReviewDependencyClosure } from './review-dependency-packing.mjs'
import {
  assertReviewRecordSourceUnchanged,
  loadReviewRecordFromGit,
  loadReviewRecords,
} from './review-record-storage.mjs'
import { fileState } from './review-record-storage-io.mjs'
import {
  inspectRollforwardCohort,
  repairRollforwardPublicationHistory,
  rollforwardHistoryPublicationRevision,
} from './rollforward-review.mjs'

const capabilities = new WeakMap()

/** The provider here is deliberately not injectable: only real fixed Git
 * materialization can certify that the retrospectively named publication exists. */
export function verifyRollforwardHistoryPublication(root, records) {
  const cohort = inspectRollforwardCohort(records)
  assert(cohort, 'existing published cohort required')
  const originals = new Map()
  for (const { owner, index, row } of cohort.byPath.values()) {
    if (!originals.has(owner))
      originals.set(
        owner,
        loadReviewRecordFromGit({
          root,
          revision: rollforwardHistoryPublicationRevision,
          logicalPath: owner,
        }).record,
      )
    const original = originals.get(owner).entries[index]
    assert.equal(original.path, row.path, 'historical publication owner/index differs')
    assert.deepEqual(original.history, [], 'historical publication was not missing this history')
    assert.deepEqual(
      original.currentIndependentAcceptance,
      row.currentIndependentAcceptance,
      'historical independent acceptance differs',
    )
    const comparable = structuredClone(row)
    comparable.history = []
    // Existing after/pin observations are mutable, separately validated by the
    // full transaction; they cannot authorize a change to any semantic field.
    for (const key of ['afterSha256', 'maintenanceDeltas']) {
      if (Object.hasOwn(original, key)) comparable[key] = structuredClone(original[key])
      else delete comparable[key]
    }
    assert.deepEqual(comparable, original, 'published semantic fields differ')
  }
  return {
    publicationRevision: rollforwardHistoryPublicationRevision,
    verifiedRows: cohort.byPath.size,
  }
}

export function prepareRollforwardHistoryPublication({ root, baseRevision }) {
  root = resolve(root)
  const group = loadReviewRecords({ root })
  const origin = verifyRollforwardHistoryPublication(root, group.records)
  const repair = repairRollforwardPublicationHistory(group.records)
  if (!repair.repaired) {
    assertReviewRecordSourceUnchanged(group.loadedSource)
    return { mode: 'already-recorded', repaired: 0, writes: 0, semanticGrants: 0, ...origin }
  }
  assert.equal(repair.repaired, 205, 'one complete frozen missing-history repair required')
  const packed = packReviewDependencyClosure({
    root,
    baseRevision,
    group,
    records: repair.records,
    dependencies: new Map(),
    pinKind: 'rollforward-publication-history-after-pin',
  })
  assert.deepEqual(packed.upgrades, [], 'no new source storage identities allowed')
  const generated = [...packed.built.values()].flat()
  const outputs = generated.filter(
    (output) => !fileState(root, output.path, undefined, 'docs/').buffer?.equals(output.bytes),
  )
  const paths = new Set(generated.map((output) => output.path))
  const retired = [...packed.dirty].flatMap((owner) =>
    (group.storages.get(owner)?.shards ?? [])
      .map((shard) => `docs/phase-governance/reviews/${shard.path}`)
      .filter((path) => !paths.has(path)),
  )
  const transaction = prepareCurrentReviewTransaction({
    root,
    baseRevision,
    group,
    records: packed.records,
    outputs,
    retired,
    sourceProfile: 'main-rollforward-v1',
  })
  const handle = {
    mode: 'prepared-history-observation',
    baseRevision,
    ...origin,
    repaired: repair.repaired,
    semanticGrants: 0,
    runtimeCredit: 0,
    outputs: transaction.outputs,
    retired: transaction.retired,
  }
  capabilities.set(handle, { transaction, public: structuredClone(handle) })
  assertReviewRecordSourceUnchanged(group.loadedSource)
  return handle
}

export function publishRollforwardHistory(handle, { allowWrite = false } = {}) {
  const plan = capabilities.get(handle)
  assert(plan, 'original history-repair capability required')
  assert.deepEqual(handle, plan.public, 'modified history-repair capability')
  assert.equal(allowWrite, true, 'explicit history publication mode required')
  const result = publishCurrentReviewTransaction(plan.transaction, { allowWrite: true })
  capabilities.delete(handle)
  return { ...result, recordedPublicationObservations: 205, semanticGrants: 0, runtimeCredit: 0 }
}
