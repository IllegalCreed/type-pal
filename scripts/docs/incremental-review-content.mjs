// Normalization and qualification of the already reviewed S77 content.
// This module has no filesystem authority and never treats a hash as a reading claim.
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { canonicalTerminalJson } from './terminal-json.mjs'

export const incrementalReviewPath = 'docs/phase-governance/reviews/20261018-semantic-rework.json'
export const incrementalEntryOffset = 28
export const incrementalTargetCount = 1916
export const incrementalPublicationKind = 'incremental-document-publication/1.0.0'
export const incrementalContentHash = (value) =>
  createHash('sha256').update(canonicalTerminalJson(value)).digest('hex')

const pilotPaths = new Set([
  'docs/ops/archive/tasks/cancelled/GAME-PLAYER-POISON-KEY-DOMAIN-1.md',
  'docs/ops/evidence/CODE-QUALITY-90/gate-ratchet-result.json',
  'docs/ops/evidence/GAME-ANALYTICS-FAILED-INSTALL-OWNERSHIP-1/browser-console.json',
  'docs/ops/evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c2/initial-static-gates.json',
  'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/editor-ui-small/retry.json',
])
export const incrementalAcceptanceBasis = (path) =>
  pilotPaths.has(path)
    ? [
        {
          author: 'Codex',
          reviewer: 'GLM',
          scope:
            'Owner pilot interpretation and original body; excludes later contributor supplements',
          reportSha256: '63a67ce27dd6355951c5e63b2dae53cecc8314630a800e750f62855b788536fb',
        },
        {
          author: 'GLM',
          reviewer: 'Codex',
          scope: 'Exact mechanical supplements and retention; pilot core and body unchanged',
          reportSha256: '9978c24851c0ea74ac6f5a8fa7e451cbbff7e95ad793dc2d9f44f331017f9b45',
        },
      ]
    : [
        {
          author: 'GLM',
          reviewer: 'Codex',
          scope:
            'S77 specific content, declared semantic read domain, native witnesses and retention',
          reportSha256: '9978c24851c0ea74ac6f5a8fa7e451cbbff7e95ad793dc2d9f44f331017f9b45',
        },
      ]

/** A single recorded relocation, not another copy of the contributor ledger. */
export function normalizeIncrementalReview(original, index) {
  if (!Number.isSafeInteger(index) || index < 0 || index >= incrementalTargetCount)
    throw new Error('incremental review: index outside exact cohort')
  const row = structuredClone(original)
  const semantic = row.semanticAssessment
  const source = row.primarySource?.[0]
  if (!source || source.path !== row.path || !/^[a-f\d]{64}$/u.test(row.afterSha256 ?? ''))
    throw new Error('incremental review: original candidate source/body identity missing')
  row.provenance = [
    ...(Array.isArray(row.provenance) ? row.provenance : [row.provenance]),
    {
      kind: 'accepted-contributor-content',
      authorCandidate: '62f27e854466f540fb595dc4ca4fbcb3bf4adf56',
      ownerCandidate: '6995a8ec10598695e62df67e6f1d38da72bba38f',
      originalRowSha256: incrementalContentHash(original),
    },
  ]
  if (semantic) {
    row.readDomain = {
      coverage: 'full-file',
      actual: `${semantic.method}; ${semantic.readScope}`,
      reusedFrom: row.readDomain.reusedFrom,
      notRead: [
        ...semantic.unverified,
        'Historical commands, product implementation, browser/E2E and coverage were not reexecuted by document governance.',
      ],
    }
  }
  row.readMethod = 'per-document-semantic-assessment-with-explicit-read-domain'
  row.reviewDepth = 'partial-semantic'
  row.reviewedLines = {
    scope: semantic?.readScope ?? row.readDomain.actual,
    boundary: 'Source parsing and stated semantic scope; not a full product/code/runtime audit.',
  }
  row.fieldRoles.governance = [`${incrementalReviewPath}#entries/${index + incrementalEntryOffset}`]
  row.evidence.path = row.path
  row.versionScope = row.applicability
  row.userVisibleBeforeAfter = row.path.endsWith('.json')
    ? 'Native bytes unchanged; specific governance explanation in the one existing review owner.'
    : 'Specific visible template prose plus exact original source; no product execution credit.'
  row.history = [
    ...row.history,
    {
      kind: 'incremental-candidate-intake',
      date: '2026-10-31',
      priorRowSha256: incrementalContentHash(original),
      priorGovernanceLocation: original.fieldRoles.governance,
      priorReadDomain:
        'Recoverable in the frozen S77 candidate row; not overwritten in its original delivery.',
      sourceCarrierSha256: source.sha256,
      oldClaimRestored: false,
      runtimeCredit: false,
    },
  ]
  row.revision = {
    currentSha: row.path.endsWith('.json')
      ? source.revision
      : '6995a8ec10598695e62df67e6f1d38da72bba38f',
    history: [
      ...row.revision.history,
      {
        value: original.revision.currentSha,
        meaning:
          'The candidate generator used this field for fixed carrier SHA256, not a Git commit.',
      },
    ],
  }
  return row
}

export function incrementalQualifiedContent(row) {
  const content = structuredClone(row)
  for (const key of [
    'contentReviewStatus',
    'templateCompliance',
    'currentIndependentAcceptance',
    'nonAuthorReviewer',
    'creditGranted',
    'maintenanceDeltas',
  ])
    delete content[key]
  return content
}

export function incrementalGrantSignature(row) {
  const basis = incrementalAcceptanceBasis(row.path)
  return {
    protocol: 'document-delivery-acceptance/1.0.0',
    kind: incrementalPublicationKind,
    path: row.path,
    contentSha256: incrementalContentHash(incrementalQualifiedContent(row)),
    acceptedBodySha256: row.afterSha256,
    reviewedCandidate: '62f27e854466f540fb595dc4ca4fbcb3bf4adf56',
    adoptedCandidate: '6995a8ec10598695e62df67e6f1d38da72bba38f',
    nonAuthorReviewer: true,
    basis,
    ownerDecision: {
      actor: 'Codex',
      task: 'DOCS-FULL-TEMPLATE-1/S78',
      currentBodyReview: true,
      currentTemplateMigration: true,
      oldClaimRestored: false,
      runtimeCredit: false,
    },
  }
}

export function incrementalQualificationIssues(row) {
  if (
    row.contentReviewStatus === 'partial-review-unknown' &&
    row.templateCompliance === 'needs-migration' &&
    row.currentIndependentAcceptance === undefined
  )
    return []
  return row.contentReviewStatus === 'content-reviewed' &&
    row.templateCompliance === 'template-compliant' &&
    row.claimCorrection === undefined &&
    row.nonAuthorReviewer === true &&
    row.creditGranted === 0 &&
    isDeepStrictEqual(row.currentIndependentAcceptance, incrementalGrantSignature(row))
    ? []
    : ['incremental review requires its exact field-scoped non-author basis and Owner grant']
}

export function grantIncrementalReview(before) {
  if (
    before.contentReviewStatus !== 'partial-review-unknown' ||
    before.templateCompliance !== 'needs-migration' ||
    before.currentIndependentAcceptance !== undefined ||
    before.claimCorrection !== undefined
  )
    throw new Error('incremental review: only the exact pending candidate may be granted')
  const row = structuredClone(before)
  row.contentReviewStatus = 'content-reviewed'
  row.templateCompliance = 'template-compliant'
  row.nonAuthorReviewer = true
  row.currentIndependentAcceptance = incrementalGrantSignature(row)
  return row
}
