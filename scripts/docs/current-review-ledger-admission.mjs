import { additionalCurrentReviewLedgers } from './current-review-ledger-bindings.mjs'

export const currentReviewLedgerContract = Object.freeze({
  templateId: 'evidence-receipt-v1',
  variant: 'current-review-ledger-native-v1',
  templateVersion: '1.0.0',
  format: 'json-native',
  metadataLocation: 'existing-current-review',
  lifecycle: 'current',
  purpose:
    'Explain a live review ledger and its ownership, history and safe storage without accepting child document semantics or old execution.',
})
export const currentReviewLedgerBaseline = '9d3e6834e9f41475a5802f37db4f898aa42179ba'
export const currentReviewLedgerPilots = Object.freeze(
  [
    {
      path: 'docs/phase-governance/reviews/20261004-structured-content-ops-03.json',
      reviewRecord: 'docs/phase-governance/reviews/20261017-r93-phase-governance-artifacts.json',
      index: 8,
      id: 'governed-document-structured-content-ops-03-20261004',
      headerSha256: '3fdac12aaecc31eaf7773137e07f13a11f77e6f1539a3da5786e632ab671038f',
      membershipSha256: '2fcb4648adf3b589875d35549afb019398e3310e3260dca34cb05a72a276e88d',
      entryCount: 1,
      transfers: 0,
      initialStorage: 'flat',
    },
    {
      path: 'docs/phase-governance/reviews/20261004-structured-content-phase2-01.json',
      reviewRecord: 'docs/phase-governance/reviews/20261017-r93-phase-governance-artifacts.json',
      index: 12,
      id: 'governed-document-structured-content-phase2-01-20261004',
      headerSha256: '846bc4a21570af50d19f5cd7010aa97fd67e702792ce756c83096b43d726f502',
      membershipSha256: '37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570',
      entryCount: 0,
      transfers: 5,
      initialStorage: 'flat',
    },
    {
      path: 'docs/phase-governance/reviews/20261017-r85-testing-archive.json',
      reviewRecord: 'docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json',
      index: 16,
      id: 'r85-testing-archive',
      headerSha256: '40493a19ab9beee5750d7d8d9d1e8d98ebfa1fc924d43b27269ada01484da21f',
      membershipSha256: '746f8e972ef211c2737826cf1971e64d3094627f6ab45fbf46f2749d26c37116',
      entryCount: 100,
      transfers: 0,
      initialStorage: 'manifest',
    },
  ].map(Object.freeze),
)
export const currentReviewLedgerAdmissions = Object.freeze([
  ...currentReviewLedgerPilots,
  ...additionalCurrentReviewLedgers,
])
