import { historicalHtmlExpansionAdmissions } from './historical-html-expansion-admission.mjs'
// Three owned pilots only. Format and content acceptance remain distinct.
export const historicalHtmlCarrierRevision = 'c801f5fd5f9a59e1db4bac0babe8a6a1403bfcff'
export const historicalHtmlContracts = Object.freeze({
  mockup: {
    templateId: 'design-spec-v1',
    variant: 'historical-ui-mockup-native-v1',
    format: 'html-native',
    templateVersion: '1.0.0',
    metadataLocation: 'existing-current-review',
    sourceCarrierRevision: 'c801f5fd5f9a59e1db4bac0babe8a6a1403bfcff',
    lifecycle: 'historical',
  },
  host: {
    templateId: 'evidence-receipt-v1',
    variant: 'historical-browser-host-native-v1',
    format: 'html-native',
    templateVersion: '1.0.0',
    metadataLocation: 'existing-current-review',
    sourceCarrierRevision: 'c801f5fd5f9a59e1db4bac0babe8a6a1403bfcff',
    lifecycle: 'historical',
  },
})
export const historicalHtmlPilots = Object.freeze([
  {
    path: 'docs/phase2/archive/mockups/actor-mode-v2.html',
    family: 'mockup',
    carrierSha256: '688008dcc0c1db9d478a15f375ce60bbbf139ed8910e0667aa78dc7de367ba60',
    carrierGitObject: '38182d2e8757b046b987a9fe3ce214e61e8ed3ec',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r33-phase2-lore.json',
    reviewIndex: 4,
    historicalSourceRevision: '0d5311075b4f5e67362d1953a138d678c0a4aa42',
    historicalSourceSha256: '688008dcc0c1db9d478a15f375ce60bbbf139ed8910e0667aa78dc7de367ba60',
    historicalSourceGitObject: '38182d2e8757b046b987a9fe3ce214e61e8ed3ec',
    expectedMissingReferences: [],
    archivedBuildSource: null,
  },
  {
    path: 'docs/testing/archive/legacy/batches/glm-new-waves/wave-F/browser-host/index.html',
    family: 'host',
    carrierSha256: '8f7a1b7da0950d1e8688bacc2a1b202d1dcf3ab2fc6ad4d5e1bc8783018cf848',
    carrierGitObject: '2317eec3a23be33bd25e5894e697b188880089b5',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r67-testing-legacy-html.json',
    reviewIndex: 5,
    historicalSourceRevision: 'bfd78102163886d32f54e7d99d6b076d57f318d6',
    historicalSourceSha256: '8f7a1b7da0950d1e8688bacc2a1b202d1dcf3ab2fc6ad4d5e1bc8783018cf848',
    historicalSourceGitObject: '2317eec3a23be33bd25e5894e697b188880089b5',
    expectedMissingReferences: [],
    archivedBuildSource: null,
  },
  {
    path: 'docs/testing/archive/legacy/batches/glm-runtime-resource-wave/hosts/rv2/index.html',
    family: 'host',
    carrierSha256: '2d7b6398cafc41071b4dfc07e69572316483968ef2ee36cbf38981fc66784971',
    carrierGitObject: '9446acc091c5bff8b750bf5649eb9547bebc42ab',
    reviewRecord: 'docs/phase-governance/reviews/20261017-r67-testing-legacy-html.json',
    reviewIndex: 9,
    historicalSourceRevision: 'bfd78102163886d32f54e7d99d6b076d57f318d6',
    historicalSourceSha256: '2d7b6398cafc41071b4dfc07e69572316483968ef2ee36cbf38981fc66784971',
    historicalSourceGitObject: '9446acc091c5bff8b750bf5649eb9547bebc42ab',
    expectedMissingReferences: ['./main.js'],
    archivedBuildSource:
      'docs/testing/archive/legacy/batches/glm-runtime-resource-wave/hosts/rv2/entry.ts',
  },
])
export const historicalHtmlContentAcceptance = Object.freeze({
  reviewer: 'GLM',
  reportSha256: '332beaede073aa9075c9492d3e485c1ea117b1cf0b3459bb117e11610c04f08d',
  contentByPath: {
    'docs/phase2/archive/mockups/actor-mode-v2.html':
      '8cb644cea455be564e7c20cb78fdbc5a8ecb2e119bb57f5d65647ee3d861bb54',
    'docs/testing/archive/legacy/batches/glm-new-waves/wave-F/browser-host/index.html':
      '14519a2b7c9b527bf28d14605c5fe023d5efd67e6be30a91b90728a4cde15af3',
    'docs/testing/archive/legacy/batches/glm-runtime-resource-wave/hosts/rv2/index.html':
      '1f1a45badc9ec403645da1f39925eaa2319ae82031ec57ea4b6c76d215b8c69f',
  },
})
export const historicalHtmlAdmissions = Object.freeze([
  ...historicalHtmlPilots,
  ...historicalHtmlExpansionAdmissions,
])
