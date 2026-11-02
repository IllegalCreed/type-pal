// Exact current acceptance. The prior signed cohort is reconstructed, never re-signed.
import assert from 'node:assert/strict'
import { incrementalReviewPath } from './incremental-review-content.mjs'
import { inspectMainSuccessor, priorSuccessorRecord } from './main-successor-review.mjs'
import {
  restorePlannedReview,
  reviewPlanHash,
  rollforwardReviewContract,
} from './rollforward-review-plan.mjs'

export const rollforwardPublication = Object.freeze({
  kind: 'accepted-rollforward-publication/1.0.0',
  acceptedBase: rollforwardReviewContract.acceptedBase,
  reviewedCandidate: rollforwardReviewContract.authorCandidate,
  normalizedChangesSha256: '41d487a99cebda708c577efac7e1a87acb753a62d7128ad1413321437b464c48',
  originalReviewContentSha256: 'd0dcd6d8ec5fe5de4aecc2f011b17cef23edb605ad221e0e11df3febbec15a73',
  changes: 205,
  additions: 179,
  amendments: 26,
  reused: 2,
  registeredIdentities: 4530,
  activeDocuments: 4524,
  runtimeCredit: false,
  childSemanticCredit: false,
})
const snapshots = new WeakMap()
const seeds = new Set([
  'docs/ops/code-quality.md',
  'docs/ops/evidence/QUALITY-GAME-PRESENT-HOST-TESTS-1/README.md',
  'docs/ops/evidence/QUALITY-PENDING-100-3/base-main-ci.json',
  'docs/ops/tasks/GAME-INPUT-KEYMAP-OWN-KEY-1.md',
  'docs/testing/domains/phase1-runtime/control-rotation/evidence.json',
])
export const rollforwardHistoryPublicationRevision = 'f6a956529cfa5efdb79a72af89feef08a21cab60'

// This is a retrospective observation of the real S86 publication, not a new
// author read, independent acceptance or execution. The exact original empty
// history participates in the frozen content hash; only this derived event may
// be removed when reconstructing that already accepted view.
export function rollforwardHistoryEvent(row) {
  const signature = row.currentIndependentAcceptance
  assert(
    row.rollforwardIntake && signature?.kind === rollforwardPublication.kind,
    'existing rollforward acceptance required for publication history',
  )
  return {
    kind: 'rollforward-publication-history-repair/1.0.0',
    publicationRevision: rollforwardHistoryPublicationRevision,
    recordedOn: '2026-11-01',
    path: row.path,
    acceptedBodySha256: signature.acceptedBodySha256,
    acceptedContentSha256: signature.contentSha256,
    normalizedChangesSha256: rollforwardPublication.normalizedChangesSha256,
    originalHistory: [],
    originalIndependentAcceptanceUnchanged: true,
    newSemanticCredit: 0,
    runtimeCredit: false,
    childSemanticCredit: false,
  }
}
function pendingView(row) {
  const pending = structuredClone(row)
  if (Array.isArray(pending.history) && pending.history.length) {
    assert.deepEqual(
      pending.history,
      [rollforwardHistoryEvent(row)],
      'unknown or changed rollforward publication history',
    )
    pending.history = []
  }
  delete pending.currentIndependentAcceptance
  pending.contentReviewStatus = 'partial-review-unknown'
  pending.templateCompliance = 'needs-migration'
  pending.nonAuthorReviewer = false
  return pending
}

/** Pure proposal only. A public transaction must still resolve the fixed real
 * publication Git objects, protect all inputs and verify the complete group. */
export function repairRollforwardPublicationHistory(records) {
  const cohort = inspectRollforwardCohort(records)
  assert(cohort, 'published rollforward cohort required')
  const next = new Map([...records].map(([owner, record]) => [owner, structuredClone(record)]))
  let repaired = 0
  for (const { owner, index } of cohort.byPath.values()) {
    const row = next.get(owner).entries[index]
    if (row.history.length) continue
    assert.deepEqual(row.history, [], 'original empty history required')
    row.history = [rollforwardHistoryEvent(row)]
    repaired++
  }
  inspectRollforwardCohort(next)
  return { records: next, repaired, alreadyRecorded: cohort.byPath.size - repaired }
}
export function rollforwardSignature(row) {
  return {
    protocol: 'document-delivery-acceptance/1.0.0',
    kind: rollforwardPublication.kind,
    path: row.path,
    contentSha256: reviewPlanHash(pendingView(row)),
    acceptedBodySha256: row.afterSha256,
    reviewedCandidate: rollforwardReviewContract.authorCandidate,
    nonAuthorReviewer: true,
    basis: {
      author: seeds.has(row.path) ? 'Codex' : 'GLM',
      reviewer: seeds.has(row.path) ? 'GLM' : 'Codex',
      reportSha256: seeds.has(row.path)
        ? rollforwardReviewContract.seedVerdictSha256
        : rollforwardReviewContract.ownerVerdictSha256,
      scope: seeds.has(row.path)
        ? 'The unchanged Owner pilot source and interpretation; no product execution.'
        : 'Declared source-specific content and Owner final-link errata; not a second full product audit.',
    },
    ownerDecision: {
      actor: 'Codex',
      task: 'DOCS-FULL-TEMPLATE-1/S85',
      currentBodyReview: true,
      currentTemplateMigration: true,
      oldClaimRestored: false,
      runtimeCredit: false,
      childSemanticCredit: false,
    },
  }
}
export function grantRollforwardPlan(plan) {
  assert.equal(
    reviewPlanHash(plan.changes),
    rollforwardPublication.normalizedChangesSha256,
    'accepted normalized plan differs',
  )
  const records = new Map(
    [...plan.records].map(([path, record]) => [path, structuredClone(record)]),
  )
  for (const change of plan.changes) {
    const row = records.get(change.owner).entries[change.index]
    assert(
      row.contentReviewStatus === 'partial-review-unknown' &&
        row.templateCompliance === 'needs-migration' &&
        row.nonAuthorReviewer === false &&
        row.creditGranted === 0 &&
        !row.currentIndependentAcceptance,
      'pending planned row required',
    )
    row.contentReviewStatus = 'content-reviewed'
    row.templateCompliance = 'template-compliant'
    row.nonAuthorReviewer = true
    row.currentIndependentAcceptance = rollforwardSignature(row)
  }
  assert(
    !Object.hasOwn(records.get(incrementalReviewPath), 'rollforwardPublication'),
    'already published',
  )
  records.get(incrementalReviewPath).rollforwardPublication =
    structuredClone(rollforwardPublication)
  inspectRollforwardCohort(records)
  return records
}

function cached(records) {
  const saved = snapshots.get(records)
  if (!saved) return undefined
  assert.equal(records.size, saved.owners.size, 'published owner set changed')
  for (const [owner, record] of saved.owners)
    assert.equal(records.get(owner), record, 'published owner object replaced')
  return saved.cohort
}
export function inspectRollforwardCohort(records) {
  const saved = cached(records)
  if (saved) return saved
  const successor = inspectMainSuccessor(records)
  if (successor) records = successor.priorRecords
  const header = records.get(incrementalReviewPath)?.rollforwardPublication
  if (header === undefined) {
    assert(
      ![...records.values()].some((r) => r.entries.some((row) => row.rollforwardIntake)),
      'mixed or unqualified rollforward rows',
    )
    return undefined
  }
  assert.deepEqual(header, rollforwardPublication, 'publication header changed')
  assert.equal(records.size, 114, 'exact114 current owners required')
  const changes = [],
    byPath = new Map()
  let count = 0
  for (const [owner, record] of records)
    for (const [index, row] of record.entries.entries()) {
      count++
      if (!row.rollforwardIntake) continue
      assert(!byPath.has(row.path), 'duplicate rollforward row')
      assert(
        row.contentReviewStatus === 'content-reviewed' &&
          row.templateCompliance === 'template-compliant' &&
          row.nonAuthorReviewer === true &&
          row.creditGranted === 0 &&
          !row.claimCorrection &&
          row.runtimeExecutionPerformed === false,
        'unqualified rollforward row',
      )
      assert.deepEqual(
        row.fieldRoles.governance,
        [`${owner}#entries/${index}`],
        'current owner/index changed',
      )
      assert.deepEqual(
        row.currentIndependentAcceptance,
        rollforwardSignature(row),
        'field-scoped independent signature changed',
      )
      const pending = pendingView(row)
      const change = {
        path: row.path,
        owner,
        index,
        beforeSha256: row.rollforwardPrior?.sha256 ?? null,
        after: pending,
      }
      changes.push(change)
      byPath.set(row.path, { owner, index, row })
    }
  changes.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  assert.equal(count, 4530, 'exact4530 registered identities required')
  assert.equal(changes.length, 205, 'exact205 current grants required')
  assert.equal(
    reviewPlanHash(changes),
    rollforwardPublication.normalizedChangesSha256,
    'accepted content, source, location or sparse prior changed',
  )
  assert.equal(
    records.get(incrementalReviewPath).entries.length,
    2123,
    'exact old1944 plus179 append required',
  )
  const cohort = { byPath, changes, successor }
  const original = [...records]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([owner, record]) => {
      const prior = priorRollforwardRecord(record, cohort)
      prior.entries = prior.entries.map((row) => {
        const value = { ...row }
        delete value.afterSha256
        delete value.maintenanceDeltas
        return value
      })
      return [owner, prior]
    })
  assert.equal(
    reviewPlanHash(original),
    rollforwardPublication.originalReviewContentSha256,
    'unaffected original review content or signatures changed',
  )
  return cohort
}

export function priorRollforwardRecord(record, cohort) {
  if (!cohort) return record
  record = priorSuccessorRecord(record, cohort.successor)
  const prior = structuredClone(record)
  delete prior.rollforwardPublication
  prior.entries = prior.entries.flatMap((row) => {
    const accepted = cohort.byPath.get(row.path)
    if (!accepted) return [row]
    if (!row.rollforwardPrior) return []
    return [restorePlannedReview(pendingView(row), 'rollforwardPrior')]
  })
  return prior
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child)
    Object.freeze(value)
  }
}
export function snapshotRollforwardCohort(records) {
  const cohort = inspectRollforwardCohort(records)
  if (!cohort || snapshots.has(records)) return cohort
  for (const record of records.values()) freeze(record)
  snapshots.set(records, { cohort, owners: new Map(records) })
  return cohort
}
