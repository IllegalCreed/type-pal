import { createHash } from 'node:crypto'
import { isDeepStrictEqual as same } from 'node:util'
import { currentLedgerContentAcceptance } from './current-review-ledger-acceptance.mjs'
import { currentReviewLedgerBaseline } from './current-review-ledger-admission.mjs'
import { canonicalTerminalJson } from './terminal-json.mjs'

const eventKind = 'current-ledger-publication'
const hex = (value, length) =>
  typeof value === 'string' && new RegExp(`^[a-f\\d]{${length}}$`, 'u').test(value)
const publicationEvents = (row) => (row.history ?? []).filter((h) => h.kind === eventKind)

/** Current after pins may change; reviewed explanation, source and prior withdrawal may not. */
export function currentLedgerContentSha256(row) {
  const value = structuredClone(row),
    events = publicationEvents(row)
  const withdrawal = row.claimCorrection ?? events[0]?.priorClaimCorrection ?? null
  for (const key of [
    'afterSha256',
    'maintenanceDeltas',
    'currentIndependentAcceptance',
    'contentReviewStatus',
    'templateCompliance',
    'claimCorrection',
  ])
    delete value[key]
  value.history = (row.history ?? []).filter((h) => h.kind !== eventKind)
  return createHash('sha256')
    .update(canonicalTerminalJson({ content: value, withdrawal }))
    .digest('hex')
}

function admittedAcceptance(a, binding) {
  return (
    a?.path === binding.path &&
    a.nonAuthorReviewer === true &&
    typeof a.reviewer === 'string' &&
    a.reviewer.length > 0 &&
    hex(a.contentSha256, 64) &&
    hex(a.reportSha256, 64) &&
    hex(a.reviewedCandidate, 40) &&
    typeof a.task === 'string' &&
    a.task.length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/u.test(a.date ?? '') &&
    Array.isArray(a.basis) &&
    a.basis.length >= 2 &&
    a.basis.every(
      (basis) =>
        ['Codex', 'GLM'].includes(basis.author) &&
        ['Codex', 'GLM'].includes(basis.reviewer) &&
        basis.author !== basis.reviewer &&
        basis.nonAuthorReviewer === true &&
        typeof basis.scope === 'string' &&
        basis.scope.length > 0 &&
        hex(basis.reportSha256, 64) &&
        hex(basis.candidate, 40),
    )
  )
}

function signature(a, binding) {
  return {
    protocol: 'document-delivery-acceptance/1.0.0',
    path: binding.path,
    reviewer: a.reviewer,
    nonAuthorReviewer: true,
    verdict: 'accept',
    contentSha256: a.contentSha256,
    reportSha256: a.reportSha256,
    reviewedCandidate: a.reviewedCandidate,
    basis: structuredClone(a.basis),
    controlIdentity: {
      baselineRevision: currentReviewLedgerBaseline,
      headerSha256: binding.headerSha256,
      membershipSha256: binding.membershipSha256,
      reviewRecord: binding.reviewRecord,
      index: binding.index,
    },
    ownerDecision: {
      actor: 'Codex',
      task: a.task,
      currentBodyReview: true,
      currentTemplateMigration: true,
      oldClaimRestored: false,
      runtimeCredit: false,
      childSemanticAcceptanceGranted: false,
    },
  }
}

// The optional argument is a pure validator fixture seam; public guards/writers use the fixed table.
export function currentLedgerQualificationIssues(
  row,
  binding,
  acceptance = currentLedgerContentAcceptance[binding.path],
) {
  if (
    row.contentReviewStatus === 'partial-review-unknown' &&
    row.templateCompliance === 'needs-migration' &&
    row.currentIndependentAcceptance === undefined
  )
    return []
  const events = publicationEvents(row),
    event = events[0]
  if (
    !admittedAcceptance(acceptance, binding) ||
    row.path !== binding.path ||
    row.contentReviewStatus !== 'content-reviewed' ||
    row.templateCompliance !== 'template-compliant' ||
    row.claimCorrection !== undefined ||
    currentLedgerContentSha256(row) !== acceptance.contentSha256 ||
    events.length !== 1 ||
    !same(row.currentIndependentAcceptance, signature(acceptance, binding)) ||
    !same(event, {
      kind: eventKind,
      task: acceptance.task,
      date: acceptance.date,
      reviewedCandidate: acceptance.reviewedCandidate,
      contentSha256: acceptance.contentSha256,
      priorClaimCorrection: event?.priorClaimCorrection ?? null,
      oldClaimRestored: false,
      runtimeCredit: false,
      childSemanticAcceptanceGranted: false,
    })
  )
    return [
      'current ledger promotion requires exact scoped non-author evidence and separate Owner grant',
    ]
  return []
}

/** Assemble a grant only for a compiled, independently accepted explanation. No caller-supplied table. */
export function applyCurrentLedgerGrant(before, binding) {
  const acceptance = currentLedgerContentAcceptance[binding.path]
  if (
    !admittedAcceptance(acceptance, binding) ||
    before.path !== binding.path ||
    currentLedgerContentSha256(before) !== acceptance.contentSha256 ||
    before.contentReviewStatus !== 'partial-review-unknown' ||
    before.templateCompliance !== 'needs-migration' ||
    before.currentIndependentAcceptance !== undefined ||
    publicationEvents(before).length !== 0
  )
    throw new Error(`current ledger lacks compiled scoped non-author acceptance: ${binding.path}`)
  const row = structuredClone(before),
    priorClaimCorrection = row.claimCorrection ?? null
  delete row.claimCorrection
  row.contentReviewStatus = 'content-reviewed'
  row.templateCompliance = 'template-compliant'
  row.currentIndependentAcceptance = signature(acceptance, binding)
  row.history ??= []
  row.history.push({
    kind: eventKind,
    task: acceptance.task,
    date: acceptance.date,
    reviewedCandidate: acceptance.reviewedCandidate,
    contentSha256: acceptance.contentSha256,
    priorClaimCorrection,
    oldClaimRestored: false,
    runtimeCredit: false,
    childSemanticAcceptanceGranted: false,
  })
  if (currentLedgerQualificationIssues(row, binding).length)
    throw new Error('compiled current-ledger grant failed its own public qualification')
  return row
}
