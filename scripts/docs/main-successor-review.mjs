// One bounded successor over the existing owner set. Sparse inverse views keep
// every older acceptance root verifiable instead of extending its old meaning.
import assert from 'node:assert/strict'
import {
  mainSuccessorAdmission as admission,
  mainSuccessorAcceptance,
  mainSuccessorTargets,
} from './main-successor-admission.mjs'
import {
  plannedReviewInverse,
  restorePlannedReview,
  reviewPlanHash,
} from './rollforward-review-plan.mjs'

const headerKey = 'mainSuccessorPublication'
const header = () => structuredClone(admission)
function predecessorContent(records) {
  return [...records]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([owner, record]) => [
      owner,
      {
        ...record,
        entries: record.entries.map((row) => {
          const value = { ...row }
          delete value.afterSha256
          delete value.maintenanceDeltas
          return value
        }),
      },
    ])
}

export function pendingSuccessorRow(row) {
  const value = structuredClone(row)
  delete value.currentIndependentAcceptance
  delete value.maintenanceDeltas
  value.afterSha256 = row.successorIntake.acceptedBodySha256
  value.contentReviewStatus = 'partial-review-unknown'
  value.templateCompliance = 'needs-migration'
  value.nonAuthorReviewer = false
  return value
}

export function priorSuccessorRecord(record, cohort) {
  if (!cohort) return record
  const prior = structuredClone(record)
  delete prior[headerKey]
  prior.entries = prior.entries.flatMap((row) => {
    if (!row.successorIntake) return [row]
    const item = cohort.byPath.get(row.path)
    assert(item, 'unknown successor identity')
    return row.successorPrior ? [restorePlannedReview(row, 'successorPrior')] : []
  })
  return prior
}

function signature(row, acceptance) {
  assert(
    acceptance?.path === row.path &&
      acceptance.author === 'Codex' &&
      acceptance.reviewer === 'GLM' &&
      acceptance.nonAuthorReviewer === true &&
      /^[a-f\d]{40}$/u.test(acceptance.reviewedCandidate ?? '') &&
      /^[a-f\d]{64}$/u.test(acceptance.reportSha256 ?? '') &&
      acceptance.contentSha256 === reviewPlanHash(pendingSuccessorRow(row)),
    'exact external successor content acceptance required',
  )
  return {
    protocol: 'document-delivery-acceptance/1.0.0',
    kind: admission.kind,
    generationId: admission.generationId,
    ...structuredClone(acceptance),
    acceptedBodySha256: row.successorIntake.acceptedBodySha256,
    ownerDecision: {
      actor: 'Codex',
      task: 'DOCS-FULL-TEMPLATE-1/S87',
      currentBodyReview: true,
      currentTemplateMigration: true,
      oldClaimRestored: false,
      runtimeCredit: false,
      childSemanticCredit: false,
    },
  }
}

export function inspectMainSuccessor(records) {
  const value = records.get(admission.semanticOwner)?.[headerKey]
  if (value === undefined) {
    assert(
      ![...records.values()].some((record) => record.entries.some((row) => row.successorIntake)),
      'mixed or unqualified successor rows',
    )
    return undefined
  }
  assert.deepEqual(value, header(), 'successor header differs')
  assert.equal(records.size, admission.owners, 'successor owner inventory differs')
  const byPath = new Map()
  let rows = 0
  const states = new Set()
  for (const [owner, record] of records)
    for (const [index, row] of record.entries.entries()) {
      rows++
      if (!row.successorIntake) continue
      const target = mainSuccessorTargets.find((item) => item.path === row.path)
      assert(
        target && target.owner === owner && target.index === index,
        'successor target location differs',
      )
      assert(!byPath.has(row.path), 'duplicate successor identity')
      assert.deepEqual(row.successorIntake, {
        generationId: admission.generationId,
        owner,
        index,
        acceptedBodySha256: row.successorIntake.acceptedBodySha256,
      })
      assert(
        /^[a-f\d]{64}$/u.test(row.successorIntake.acceptedBodySha256),
        'bad successor body identity',
      )
      assert.equal(row.templateId, target.templateId, 'successor role differs')
      assert.deepEqual(row.fieldRoles.governance, [`${owner}#entries/${index}`])
      assert.equal(
        Boolean(row.successorPrior),
        target.kind === 'amendment',
        'successor inverse axis differs',
      )
      assert(
        row.creditGranted === 0 && row.runtimeExecutionPerformed === false && !row.claimCorrection,
        'successor borrowed execution or old withdrawn credit',
      )
      const pending =
        row.contentReviewStatus === 'partial-review-unknown' &&
        row.templateCompliance === 'needs-migration' &&
        row.nonAuthorReviewer === false &&
        row.currentIndependentAcceptance === undefined
      if (!pending) {
        assert(
          row.contentReviewStatus === 'content-reviewed' &&
            row.templateCompliance === 'template-compliant' &&
            row.nonAuthorReviewer === true,
          'unqualified successor state',
        )
        assert.deepEqual(
          row.currentIndependentAcceptance,
          signature(
            row,
            mainSuccessorAcceptance.find((item) => item.path === row.path),
          ),
          'successor signature differs',
        )
      }
      states.add(pending ? 'candidate' : 'accepted')
      byPath.set(row.path, { owner, index, row })
    }
  assert.equal(states.size, 1, 'mixed successor candidate/grant states')
  assert.equal(rows, admission.registeredRows, 'successor row inventory differs')
  assert.equal(byPath.size, admission.changes, 'successor target inventory differs')
  assert.equal(records.get(admission.semanticOwner).entries.length, admission.successorOwnerRows)
  const changes = [...byPath.values()]
    .map(({ owner, index, row }) => ({
      path: row.path,
      owner,
      index,
      beforeSha256: row.successorPrior?.sha256 ?? null,
      after: pendingSuccessorRow(row),
    }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  assert.equal(
    reviewPlanHash(changes),
    admission.changesSha256,
    'successor accepted content/source/inverse differs',
  )
  const cohort = { byPath, changes, state: [...states][0] }
  const priorRecords = new Map(
    [...records].map(([owner, record]) => [owner, priorSuccessorRecord(record, cohort)]),
  )
  assert.equal(
    [...priorRecords.values()].reduce((n, record) => n + record.entries.length, 0),
    admission.predecessorRows,
  )
  assert.equal(
    reviewPlanHash(predecessorContent(priorRecords)),
    admission.predecessorContentSha256,
    'unaffected predecessor content/signatures differ',
  )
  return { ...cohort, priorRecords }
}

/** Only these sixteen declared content rows may extend the predecessor. */
export function prepareMainSuccessorReviews(records, rows) {
  assert.equal(records.size, admission.owners)
  assert.equal(records.get(admission.semanticOwner).entries.length, admission.predecessorOwnerRows)
  assert(!records.get(admission.semanticOwner)[headerKey], 'already prepared successor')
  assert.equal(reviewPlanHash(predecessorContent(records)), admission.predecessorContentSha256)
  assert.deepEqual(
    rows.map(({ path, owner, index, kind, after }) => ({
      path,
      owner,
      index,
      kind,
      templateId: after.templateId,
    })),
    mainSuccessorTargets,
  )
  const next = new Map([...records].map(([owner, record]) => [owner, structuredClone(record)]))
  for (const item of rows) {
    const row = structuredClone(item.after)
    assert(
      row.contentReviewStatus === 'partial-review-unknown' &&
        row.templateCompliance === 'needs-migration' &&
        row.nonAuthorReviewer === false &&
        !row.currentIndependentAcceptance,
      'pending author content required',
    )
    assert(!row.successorIntake && !row.successorPrior, 'pre-normalized author content rejected')
    assert.equal(
      row.evidence?.path,
      item.path,
      'successor evidence requires its actual carrier path',
    )
    const entries = next.get(item.owner).entries
    const previous = entries[item.index]
    assert(
      item.kind === 'amendment' ? previous?.path === item.path : item.index === entries.length,
      'successor source position differs',
    )
    row.successorIntake = {
      generationId: admission.generationId,
      owner: item.owner,
      index: item.index,
      acceptedBodySha256: row.afterSha256,
    }
    if (previous) row.successorPrior = plannedReviewInverse(previous, row)
    entries[item.index] = row
  }
  next.get(admission.semanticOwner)[headerKey] = header()
  return { records: next, cohort: inspectMainSuccessor(next) }
}

export function grantMainSuccessorReviews(records) {
  const cohort = inspectMainSuccessor(records)
  assert(cohort?.state === 'candidate', 'exact pending successor required')
  assert.equal(
    mainSuccessorAcceptance.length,
    admission.changes,
    'non-author successor acceptance is not compiled',
  )
  const next = new Map([...records].map(([owner, record]) => [owner, structuredClone(record)]))
  for (const { owner, index } of cohort.byPath.values()) {
    const row = next.get(owner).entries[index]
    row.currentIndependentAcceptance = signature(
      row,
      mainSuccessorAcceptance.find((item) => item.path === row.path),
    )
    row.contentReviewStatus = 'content-reviewed'
    row.templateCompliance = 'template-compliant'
    row.nonAuthorReviewer = true
  }
  inspectMainSuccessor(next)
  return next
}
