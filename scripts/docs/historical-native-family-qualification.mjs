import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { nativeFamilyContentAcceptance } from './historical-native-family-admission.mjs'
import { nativeFamilyExpansionContentAcceptance } from './historical-native-family-completion-admission.mjs'

// The fixed content proposal has these fields only; administrative/source history
// is retained separately by the publication transaction, not silently discarded.
export const nativeFamilyContentFields = Object.freeze([
  'owner',
  'coreConclusion',
  'truthAnchors',
  'readDomain',
  'primarySource',
  'legalInputs',
  'fieldRoles',
  'businessOracle',
  'evidence',
  'versionScope',
  'publicCallers',
  'dedupe',
  'historyBoundary',
  'unresolved',
  'stopLine',
  'nextStep',
  'readMethod',
  'reviewDepth',
  'reviewedLines',
])
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical)
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    )
  return value
}
export function nativeFamilyContentSha256(row) {
  if (!nativeFamilyContentFields.every((field) => Object.hasOwn(row, field))) return undefined
  const content = Object.fromEntries(nativeFamilyContentFields.map((field) => [field, row[field]]))
  return createHash('sha256')
    .update(JSON.stringify(canonical(content)))
    .digest('hex')
}

/** A pilot remains partial unless this exact content has an external non-author acceptance. */
export function nativeFamilyQualificationIssues(row, pilot) {
  if (
    row.contentReviewStatus === 'partial-review-unknown' &&
    row.templateCompliance === 'needs-migration' &&
    row.currentIndependentAcceptance === undefined
  )
    return []
  const accepted = Object.hasOwn(nativeFamilyContentAcceptance.contentByPath, pilot.path)
    ? nativeFamilyContentAcceptance
    : nativeFamilyExpansionContentAcceptance
  const contentSha256 = accepted.contentByPath[pilot.path]
  const expected = {
    protocol: 'document-delivery-acceptance/1.0.0',
    reviewer: accepted.reviewer,
    nonAuthorReviewer: true,
    verdict: 'accept',
    path: pilot.path,
    afterSha256: pilot.carrierSha256,
    contentSha256,
    reportSha256: accepted.reportSha256,
    ownerDecision: {
      actor: 'Codex',
      task: accepted.task ?? 'DOCS-FULL-TEMPLATE-1/S50',
      currentBodyReview: true,
      currentTemplateMigration: true,
      oldClaimRestored: false,
      runtimeCredit: false,
    },
  }
  if (
    row.contentReviewStatus !== 'content-reviewed' ||
    row.templateCompliance !== 'template-compliant' ||
    !/^[a-f\d]{64}$/u.test(contentSha256 ?? '') ||
    !/^[a-f\d]{64}$/u.test(accepted.reportSha256) ||
    nativeFamilyContentSha256(row) !== contentSha256 ||
    !isDeepStrictEqual(row.currentIndependentAcceptance, expected) ||
    row.claimCorrection !== undefined ||
    /structured-mechanical-envelope-only/u.test(row.readMethod ?? '')
  )
    return ['native family status promotion requires its exact independently accepted content']
  return []
}
