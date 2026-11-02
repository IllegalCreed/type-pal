// One explicit flat-to-manifest upgrade; source is a real pre-upgrade Git blob.
export const currentLedgerStorageUpgrade = Object.freeze({
  path: 'docs/phase-governance/reviews/20261017-r93-phase-governance-artifacts.json',
  revision: '10ae2c1447f7f5583bc1407024a506e174d2d914',
  gitObject: 'eba5c8346cad3c5d39ed863ccdc223e9daedddf9',
  sha256: 'c6abadaa7f66a7c51882396f6363c3eb32282d9deac75e1adb1c0b257099ae3e',
})

// Structural owner only: not a new governed document or a new semantic grant.
export const currentStructuralReviewStorageUpgrade = Object.freeze({
  path: 'docs/phase-governance/reviews/20261018-record-integrity-rework.json',
  revision: '8103c7e1879b926df0ac00acdba06a6fe4ea691f',
  gitObject: '0c324e9c636de903c5b655264e4824b3723d2254',
  sha256: '7aff0960daeec007f687d6dc882f7f2ca03bbd3e08e62e04dcd331d09a237382',
})
export const currentReviewStorageUpgrades = Object.freeze([
  currentLedgerStorageUpgrade,
  currentStructuralReviewStorageUpgrade,
])
