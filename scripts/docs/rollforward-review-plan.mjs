// Pure, closed planning boundary. This module cannot grant credit or write a repository.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual as same } from 'node:util'
import { incrementalReviewPath } from './incremental-review-content.mjs'

export const rollforwardReviewContract = Object.freeze({
  kind: 'rollforward-review-plan/1.0.0',
  authorCandidate: '7273d7aa5a8bbe96ddebcb437765e2e8f7f3e911',
  acceptedBase: 'f17181f96d97301a3fdabfb94d1d860963d379bc',
  rowsSha256: '4b7149c465c6de850a0680dda5d68923d25643ba25bcdee016a70a1ddb10e1a0',
  ownerVerdictSha256: '1521a721e6839ba87916ddd0f789a125c3bffc681def1c0e44446ea4b1f385ae',
  seedVerdictSha256: '151f5f1e960e1c76cda1d82d0c125a26363a109087158d8d9fe0a6e751848af3',
  originalOwners: 114,
  originalRows: 4351,
  additions: 179,
  amendments: 28,
  appendOffset: 1944,
  formalGrants: 0,
})
export const reviewPlanHash = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')
const missingStatus = new Set([
  'docs/testing/e2e/stages/001-opening/README.md',
  'docs/testing/e2e/stages/001-opening/report.md',
  'docs/testing/e2e/stages/006-doctor-boat/README.md',
])
const pairedNative = new Set([
  'docs/testing/domains/phase1-runtime/control-rotation/evidence.json',
  'docs/testing/domains/phase1-runtime/dependencies/dependency-ownership/evidence.json',
  'docs/testing/e2e/evidence/e2e-001.json',
  'docs/testing/e2e/evidence/e2e-common-issues.json',
])

// A sparse inverse keeps original signatures and absent keys exact, rather than
// replacing the old row with a second full ledger or silently dropping history.
function inverseFields(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(
      (key) =>
        !same(before[key], after[key]) || Object.hasOwn(before, key) !== Object.hasOwn(after, key),
    )
    .map((key) => ({
      key,
      present: Object.hasOwn(before, key),
      ...(Object.hasOwn(before, key) ? { value: structuredClone(before[key]) } : {}),
    }))
}

export function restorePlannedReview(row, field) {
  assert(['rollforwardIntake', 'rollforwardPrior'].includes(field), 'unknown inverse axis')
  const inverse = row[field]
  assert(inverse && Array.isArray(inverse.fields), 'missing sparse inverse')
  const restored = structuredClone(row)
  delete restored[field]
  // The prior-review inverse is attached after candidate normalization; it is
  // not an original candidate field and must not leak into that restore axis.
  if (field === 'rollforwardIntake') delete restored.rollforwardPrior
  const seen = new Set()
  for (const item of inverse.fields) {
    assert(!seen.has(item.key) && item.key !== '__proto__', 'duplicate or unsafe inverse key')
    seen.add(item.key)
    if (item.present)
      Object.defineProperty(restored, item.key, {
        value: structuredClone(item.value),
        writable: true,
        enumerable: true,
        configurable: true,
      })
    else delete restored[item.key]
  }
  // JSON object insertion order is preserved separately: restoring deleted keys
  // at the end would retain values but lose the byte-level logical fingerprint.
  const ordered = Object.fromEntries(inverse.keys.map((key) => [key, restored[key]]))
  assert.deepEqual(Object.keys(restored).sort(), [...inverse.keys].sort(), 'inverse key inventory')
  assert.equal(reviewPlanHash(ordered), inverse.sha256, 'sparse inverse fingerprint differs')
  return ordered
}

export function normalizeRollforwardReview(candidate, location, previous) {
  assert(
    candidate.contentReviewStatus === 'partial-review-unknown' &&
      candidate.templateCompliance === 'needs-migration',
    'only pending candidates may enter planning',
  )
  assert(
    candidate.nonAuthorReviewer === false &&
      candidate.creditGranted === 0 &&
      candidate.runtimeExecutionPerformed === false &&
      !Object.hasOwn(candidate, 'currentIndependentAcceptance'),
    'author grant or execution claim rejected',
  )
  assert(
    !Object.hasOwn(candidate, 'rollforwardIntake') && !Object.hasOwn(candidate, 'rollforwardPrior'),
    'already normalized candidate',
  )
  assert(
    location.owner.startsWith('docs/phase-governance/reviews/') &&
      Number.isSafeInteger(location.index) &&
      location.index >= 0,
    'one real owner/index required',
  )
  const row = structuredClone(candidate)
  row.fieldRoles.governance = [`${location.owner}#entries/${location.index}`]
  row.provenance = [
    ...(Array.isArray(row.provenance) ? row.provenance : [row.provenance]),
    {
      kind: 'accepted-rollforward-content-planning',
      candidate: rollforwardReviewContract.authorCandidate,
      reportSha256: rollforwardReviewContract.ownerVerdictSha256,
      productionPublication: false,
    },
  ]
  row.readMethod = 'contributor-declared-scope-and-Owner-evidence-verification'
  row.reviewDepth = 'partial-semantic'
  row.reviewedLines = {
    scope: row.readDomain.actual,
    boundary:
      'Preserves the declared reading domain; not a second full-text, code or execution audit.',
  }
  row.phaseAnchors = [row.phaseAnchor]
  row.evidence.path = row.path
  row.versionScope = row.applicability
  row.revision = {
    currentSha: rollforwardReviewContract.authorCandidate,
    history: [
      ...row.revision.history,
      {
        value: candidate.revision.currentSha,
        meaning:
          'Prior candidate value retained verbatim; currentSha now names the real tree containing the accepted carrier.',
      },
    ],
  }
  if (missingStatus.has(row.path)) {
    assert(
      !Object.hasOwn(candidate, 'documentStatus'),
      'missing-status exception no longer applies',
    )
    row.documentStatus = 'current'
    row.documentationStatusBasis =
      'Current documentation lifecycle only; YAML publication status and historic lastVerified are unchanged, with no execution grant.'
  }
  if (pairedNative.has(row.path)) {
    assert(
      previous && row.path.endsWith('.json'),
      'paired amendment needs its existing production binding',
    )
    for (const key of [
      'docType',
      'templateId',
      'templateVersion',
      'templateVariant',
      'historyOverlay',
    ]) {
      if (Object.hasOwn(previous, key)) row[key] = structuredClone(previous[key])
      else delete row[key]
    }
    row.documentStatus = previous.documentStatus ?? 'current'
    row.productionBindingBasis =
      'Retain the existing paired publication contract; candidate source witnesses do not replace its live native variant or certify execution.'
  }
  row.rollforwardIntake = {
    keys: Object.keys(candidate),
    sha256: reviewPlanHash(candidate),
    fields: inverseFields(candidate, row),
  }
  assert.deepEqual(restorePlannedReview(row, 'rollforwardIntake'), candidate)
  if (previous) {
    assert.equal(previous.path, candidate.path, 'wrong prior review identity')
    row.rollforwardPrior = {
      keys: Object.keys(previous),
      sha256: reviewPlanHash(previous),
      fields: inverseFields(previous, row),
    }
    assert.deepEqual(restorePlannedReview(row, 'rollforwardPrior'), previous)
  }
  return row
}

/** No caller-selected roots: the accepted rows and complete old group are fixed. */
export function prepareRollforwardReviewPlan({ rows, sources, records }) {
  assert.equal(
    reviewPlanHash(rows),
    rollforwardReviewContract.rowsSha256,
    'accepted rows changed, truncated or reordered',
  )
  assert.equal(records.size, 114, 'exact old114 owner set required')
  const locations = new Map()
  for (const [owner, record] of records)
    for (const [index, row] of record.entries.entries()) {
      assert(!locations.has(row.path), 'old current review has duplicate identity')
      locations.set(row.path, { owner, index, row })
    }
  assert.equal(locations.size, 4351, 'exact old4351 rows required')
  assert.equal(
    records.get(incrementalReviewPath).entries.length,
    1944,
    'old semantic owner membership changed',
  )
  assert.equal(sources.length, rows.length, 'source membership differs')
  const changes = [],
    reused = []
  let added = 0
  for (const [index, row] of rows.entries()) {
    const source = sources[index],
      prior = locations.get(row.path)
    assert(
      source.path === row.path &&
        source.sourceSha256 === row.sourceSha256 &&
        source.sourceRevision === row.sourceGitRevision,
      'row/source mapping differs',
    )
    if (source.kind === 'addition') assert(!prior, 'addition collides with an old current owner')
    else assert(source.kind === 'amendment' && prior, 'amendment lost its old owner')
    if (prior && prior.row.afterSha256 === row.afterSha256) {
      reused.push({
        path: row.path,
        owner: prior.owner,
        index: prior.index,
        rowSha256: reviewPlanHash(prior.row),
      })
      continue
    }
    const location = prior ?? { owner: incrementalReviewPath, index: 1944 + added++ }
    changes.push({
      path: row.path,
      owner: location.owner,
      index: location.index,
      beforeSha256: prior ? reviewPlanHash(prior.row) : null,
      after: normalizeRollforwardReview(row, location, prior?.row),
    })
  }
  assert.equal(added, 179, 'exact179 additions required')
  assert.equal(changes.length, 205, 'exact205 changed/new reviews required')
  assert.equal(reused.length, 2, 'two unchanged reviews must be reused without regrant')
  const next = new Map([...records].map(([owner, record]) => [owner, structuredClone(record)]))
  for (const change of changes) next.get(change.owner).entries[change.index] = change.after
  const restored = new Map([...next].map(([owner, record]) => [owner, structuredClone(record)]))
  for (const change of [...changes].reverse()) {
    const entries = restored.get(change.owner).entries
    if (change.beforeSha256 === null)
      assert.equal(entries.pop().path, change.path, 'append positions are not reversible')
    else entries[change.index] = restorePlannedReview(entries[change.index], 'rollforwardPrior')
  }
  assert.deepEqual(restored, records, 'all original4351 reviews and headers must restore exactly')
  return {
    kind: rollforwardReviewContract.kind,
    changes,
    reused,
    records: next,
    summary: {
      sourceRows: 207,
      additions: 179,
      amendments: 26,
      unchangedReused: 2,
      logicalOwners: 114,
      registeredIdentities: 4530,
      activeIdentities: 4524,
      priorRecordsRestoredExactly: 4351,
      productionPublication: false,
      formalGrants: 0,
      runtimeCredit: 0,
    },
  }
}
