import { createHash } from 'node:crypto'
import { isDeepStrictEqual as same } from 'node:util'
import { currentNativeControlAcceptance } from './current-native-control-acceptance.mjs'
import { canonicalTerminalJson } from './terminal-json.mjs'

const kind = 'current-native-control-publication'
const events = (row) => (row.history ?? []).filter((e) => e.kind === kind)
const hex = (v, n) => typeof v === 'string' && new RegExp(`^[a-f\\d]{${n}}$`, 'u').test(v)
export function currentNativeControlContentSha256(row) {
  const value = structuredClone(row)
  const withdrawal = row.claimCorrection ?? events(row)[0]?.priorClaimCorrection ?? null
  for (const k of [
    'afterSha256',
    'maintenanceDeltas',
    'currentIndependentAcceptance',
    'contentReviewStatus',
    'templateCompliance',
    'claimCorrection',
  ])
    delete value[k]
  value.history = (row.history ?? []).filter((e) => e.kind !== kind)
  return createHash('sha256')
    .update(canonicalTerminalJson({ content: value, withdrawal }))
    .digest('hex')
}
function admitted(a, b) {
  return (
    a?.path === b.path &&
    ['Codex', 'GLM'].includes(a.author) &&
    ['Codex', 'GLM'].includes(a.reviewer) &&
    a.author !== a.reviewer &&
    a.nonAuthorReviewer === true &&
    hex(a.reportSha256, 64) &&
    hex(a.contentSha256, 64) &&
    hex(a.reviewedCandidate, 40) &&
    typeof a.task === 'string' &&
    a.task.length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/u.test(a.date ?? '')
  )
}
function signature(a, b, row) {
  return {
    protocol: 'document-delivery-acceptance/1.0.0',
    path: b.path,
    author: a.author,
    reviewer: a.reviewer,
    nonAuthorReviewer: true,
    verdict: 'accept',
    reportSha256: a.reportSha256,
    contentSha256: a.contentSha256,
    reviewedCandidate: a.reviewedCandidate,
    controlIdentity: {
      role: b.role,
      source: b.source,
      structureSha256: row.evidence.structureSha256,
      membershipSha256: row.evidence.membershipSha256,
      reviewRecord: b.reviewRecord,
      index: b.index,
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
export function currentNativeControlQualificationIssues(
  row,
  b,
  acceptance = currentNativeControlAcceptance[b.path],
) {
  if (
    row.contentReviewStatus === 'partial-review-unknown' &&
    row.templateCompliance === 'needs-migration' &&
    row.currentIndependentAcceptance === undefined &&
    events(row).length === 0
  )
    return []
  const e = events(row)[0]
  if (
    !admitted(acceptance, b) ||
    row.evidence?.author !== acceptance.author ||
    row.path !== b.path ||
    row.contentReviewStatus !== 'content-reviewed' ||
    row.templateCompliance !== 'template-compliant' ||
    row.claimCorrection !== undefined ||
    currentNativeControlContentSha256(row) !== acceptance.contentSha256 ||
    events(row).length !== 1 ||
    !same(row.currentIndependentAcceptance, signature(acceptance, b, row)) ||
    !same(e, {
      kind,
      task: acceptance.task,
      date: acceptance.date,
      reviewedCandidate: acceptance.reviewedCandidate,
      contentSha256: acceptance.contentSha256,
      priorClaimCorrection: e?.priorClaimCorrection ?? null,
      oldClaimRestored: false,
      runtimeCredit: false,
      childSemanticAcceptanceGranted: false,
    })
  )
    return [
      'current native control requires exact compiled non-author acceptance and a separate Owner grant',
    ]
  return []
}
export function applyCurrentNativeControlGrant(before, b) {
  const a = currentNativeControlAcceptance[b.path]
  if (
    !admitted(a, b) ||
    before.evidence?.author !== a.author ||
    before.path !== b.path ||
    currentNativeControlContentSha256(before) !== a.contentSha256 ||
    before.contentReviewStatus !== 'partial-review-unknown' ||
    before.templateCompliance !== 'needs-migration' ||
    before.currentIndependentAcceptance !== undefined ||
    events(before).length !== 0
  )
    throw new Error(`current native control lacks compiled independent acceptance: ${b.path}`)
  const row = structuredClone(before),
    priorClaimCorrection = row.claimCorrection ?? null
  delete row.claimCorrection
  row.contentReviewStatus = 'content-reviewed'
  row.templateCompliance = 'template-compliant'
  row.currentIndependentAcceptance = signature(a, b, row)
  row.history ??= []
  row.history.push({
    kind,
    task: a.task,
    date: a.date,
    reviewedCandidate: a.reviewedCandidate,
    contentSha256: a.contentSha256,
    priorClaimCorrection,
    oldClaimRestored: false,
    runtimeCredit: false,
    childSemanticAcceptanceGranted: false,
  })
  if (currentNativeControlQualificationIssues(row, b).length)
    throw new Error('assembled current native grant failed qualification')
  return row
}
