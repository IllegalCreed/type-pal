import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  nativeArtifactBindings,
  nativeArtifactContentAcceptance,
} from './historical-native-artifact-admission.mjs'
import {
  nativeArtifactContentSha256,
  nativeArtifactQualificationIssues,
} from './historical-native-artifact-qualification.mjs'
import { loadReviewRecordFromGit } from './review-record-storage.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const revision = 'c948bb0bd8916aeacec89b0e84c146e9c32ef435'
const originals = new Map()
function acceptedRow(binding) {
  if (!originals.has(binding.reviewRecord))
    originals.set(
      binding.reviewRecord,
      loadReviewRecordFromGit({ root, revision, logicalPath: binding.reviewRecord }).record,
    )
  const row = structuredClone(originals.get(binding.reviewRecord).entries[binding.reviewIndex])
  const grant = nativeArtifactContentAcceptance[binding.path]
  assert.equal(nativeArtifactContentSha256(row), grant.contentSha256)
  delete row.claimCorrection
  row.contentReviewStatus = 'content-reviewed'
  row.templateCompliance = 'template-compliant'
  row.currentIndependentAcceptance = {
    protocol: 'document-delivery-acceptance/1.0.0',
    path: binding.path,
    reviewer: grant.reviewer,
    nonAuthorReviewer: true,
    verdict: 'accept',
    afterSha256: binding.carrierSha256,
    contentSha256: grant.contentSha256,
    reportSha256: grant.reportSha256,
    ownerDecision: {
      actor: 'Codex',
      task: grant.task,
      currentBodyReview: true,
      currentTemplateMigration: true,
      oldClaimRestored: false,
      runtimeCredit: false,
    },
  }
  return row
}

test('compiled acceptance binds the actual accepted content at every unique current-review position', () => {
  assert.deepEqual(
    Object.keys(nativeArtifactContentAcceptance).sort(),
    nativeArtifactBindings.map((b) => b.path).sort(),
  )
  for (const binding of nativeArtifactBindings) {
    const row = acceptedRow(binding)
    assert.deepEqual(nativeArtifactQualificationIssues(row, binding), [], binding.path)
    assert(Object.isFrozen(nativeArtifactContentAcceptance[binding.path]))
  }
})

test('an accepted document cannot reuse its approval for changed meaning, another path or restored old credit', () => {
  const binding = nativeArtifactBindings.find((b) => !b.existingVariant)
  for (const mutate of [
    (r) => {
      r.coreConclusion += ' Changed claim outside the accepted text.'
    },
    (r) => {
      r.currentIndependentAcceptance.path += '.different'
    },
    (r) => {
      r.currentIndependentAcceptance.ownerDecision.oldClaimRestored = true
    },
    (r) => {
      r.currentIndependentAcceptance.ownerDecision.runtimeCredit = true
    },
    (r) => {
      r.claimCorrection = { scope: 'unsupported claim still current' }
    },
    (r) => {
      r.currentIndependentAcceptance.nonAuthorReviewer = false
    },
  ]) {
    const row = acceptedRow(binding)
    mutate(row)
    assert(nativeArtifactQualificationIssues(row, binding).length > 0)
  }
})
