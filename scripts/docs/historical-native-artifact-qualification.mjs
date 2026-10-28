import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { nativeArtifactContentAcceptance } from './historical-native-artifact-admission.mjs'
import { nativeFamilyContentFields } from './historical-native-family-qualification.mjs'
import { canonicalTerminalJson } from './terminal-json.mjs'

const fields = [
  ...nativeFamilyContentFields,
  'docType',
  'templateId',
  'templateVariant',
  'templateVersion',
  'historyOverlay',
  'artifactOnly',
  'documentStatus',
  'sourceGitRevision',
  'sourceSha256',
  'afterSha256',
]
export function nativeArtifactContentSha256(row) {
  const content = Object.fromEntries(
    fields.filter((k) => Object.hasOwn(row, k)).map((k) => [k, row[k]]),
  )
  return createHash('sha256').update(canonicalTerminalJson(content)).digest('hex')
}

// The optional parameter is a pure validator seam; public guards always use the fixed Owner table.
export function nativeArtifactQualificationIssues(
  row,
  binding,
  acceptance = nativeArtifactContentAcceptance[binding.path],
) {
  if (
    row.contentReviewStatus === 'partial-review-unknown' &&
    row.templateCompliance === 'needs-migration' &&
    row.currentIndependentAcceptance === undefined
  )
    return []
  if (
    !acceptance ||
    acceptance.nonAuthorReviewer !== true ||
    !acceptance.reviewer ||
    !/^[a-f\d]{64}$/u.test(acceptance.contentSha256 ?? '') ||
    !/^[a-f\d]{64}$/u.test(acceptance.reportSha256 ?? '') ||
    acceptance.contentSha256 !== nativeArtifactContentSha256(row) ||
    row.contentReviewStatus !== 'content-reviewed' ||
    row.templateCompliance !== 'template-compliant' ||
    row.claimCorrection !== undefined ||
    !isDeepStrictEqual(row.currentIndependentAcceptance, {
      protocol: 'document-delivery-acceptance/1.0.0',
      path: binding.path,
      reviewer: acceptance.reviewer,
      nonAuthorReviewer: true,
      verdict: 'accept',
      afterSha256: binding.carrierSha256,
      contentSha256: acceptance.contentSha256,
      reportSha256: acceptance.reportSha256,
      ownerDecision: {
        actor: 'Codex',
        task: acceptance.task,
        currentBodyReview: true,
        currentTemplateMigration: true,
        oldClaimRestored: false,
        runtimeCredit: false,
      },
    })
  )
    return [
      'native artifact promotion requires exact external content acceptance and a separate Owner decision',
    ]
  return []
}
