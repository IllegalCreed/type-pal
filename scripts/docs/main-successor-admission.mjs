// Closed main generation. A plan is not permission to promote its own content.
function freeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child)
  return Object.freeze(value)
}
export const mainSuccessorAdmission = freeze({
  kind: 'current-review-successor/1.0.0',
  generationId: 'main-c88-20261101',
  predecessorRevision: '38a6fa16d49641951233dee60b3d77d651e0805d',
  mainRevision: 'c88be9b3b5b9dc38c77d8c440085e35b8d15fc43',
  carrierRevision: 'fcd42bd6b8b2483e8e143384d7e8dac7c08e9938',
  semanticOwner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
  owners: 114,
  predecessorRows: 4530,
  registeredRows: 4542,
  predecessorOwnerRows: 2123,
  successorOwnerRows: 2135,
  changes: 16,
  additions: 12,
  amendments: 4,
  predecessorContentSha256: '3c9571f55dcb4a661415672c69051b975b96f11711cff21e1c578e9de1c46159',
  changesSha256: 'aa8b8f6533be6a1fde9327afd414e67adcd21b61eed285305faebd24b6063869',
})
export const mainSuccessorTargets = freeze([
  {
    path: 'docs/ops/audits/code-quality-file-ledger.md',
    owner: 'docs/phase-governance/reviews/20261016-historical-cards-d.json',
    index: 13,
    kind: 'amendment',
    templateId: 'governance-index-v1',
  },
  {
    path: 'docs/ops/evidence/CODE-QUALITY-94/approved-closeout/README.md',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 187,
    kind: 'amendment',
    templateId: 'evidence-receipt-v1',
  },
  {
    path: 'docs/ops/evidence/QUALITY-GAME-LOCALIZATION-1/README.md',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 2123,
    kind: 'addition',
    templateId: 'evidence-receipt-v1',
  },
  {
    path: 'docs/ops/evidence/QUALITY-GAME-LOCALIZATION-1/coverage-recount.json',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 2124,
    kind: 'addition',
    templateId: 'test-machine-evidence-v1',
  },
  {
    path: 'docs/ops/evidence/QUALITY-GAME-LOCALIZATION-1/gates.json',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 2125,
    kind: 'addition',
    templateId: 'test-machine-evidence-v1',
  },
  {
    path: 'docs/ops/evidence/QUALITY-GAME-LOCALIZATION-1/proof.json',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 2126,
    kind: 'addition',
    templateId: 'evidence-receipt-v1',
  },
  {
    path: 'docs/ops/evidence/QUALITY-GAME-LOCALIZATION-1/review.json',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 2127,
    kind: 'addition',
    templateId: 'evidence-receipt-v1',
  },
  {
    path: 'docs/ops/evidence/QUALITY-NAMING-ORGANIZATION-1/remaining-five/README.md',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 2128,
    kind: 'addition',
    templateId: 'evidence-receipt-v1',
  },
  {
    path: 'docs/ops/evidence/QUALITY-NAMING-ORGANIZATION-1/remaining-five/context-pins.json',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 2129,
    kind: 'addition',
    templateId: 'evidence-receipt-v1',
  },
  {
    path: 'docs/ops/evidence/QUALITY-NAMING-ORGANIZATION-1/remaining-five/gates.json',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 2130,
    kind: 'addition',
    templateId: 'test-machine-evidence-v1',
  },
  {
    path: 'docs/ops/evidence/QUALITY-NAMING-ORGANIZATION-1/remaining-five/mapping.json',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 2131,
    kind: 'addition',
    templateId: 'evidence-receipt-v1',
  },
  {
    path: 'docs/ops/evidence/QUALITY-NAMING-ORGANIZATION-1/remaining-five/projection-move.json',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 2132,
    kind: 'addition',
    templateId: 'evidence-receipt-v1',
  },
  {
    path: 'docs/ops/evidence/QUALITY-NAMING-ORGANIZATION-1/remaining-five/review.json',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 2133,
    kind: 'addition',
    templateId: 'evidence-receipt-v1',
  },
  {
    path: 'docs/ops/evidence/README.md',
    owner: 'docs/phase-governance/reviews/20261017-r39-ops-evidence-readmes.json',
    index: 0,
    kind: 'amendment',
    templateId: 'governance-index-v1',
  },
  {
    path: 'docs/ops/tasks/QUALITY-GAME-LOCALIZATION-1.md',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 2134,
    kind: 'addition',
    templateId: 'task-card-v1',
  },
  {
    path: 'docs/ops/tasks/QUALITY-NAMING-ORGANIZATION-1.md',
    owner: 'docs/phase-governance/reviews/20261018-semantic-rework.json',
    index: 2114,
    kind: 'amendment',
    templateId: 'task-card-v1',
  },
])
// Filled only after a non-author accepts the exact candidate/content hashes.
export const mainSuccessorAcceptance = freeze([])
