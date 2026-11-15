// Independent acceptance pin for the bounded repository-wide relocation + reviewed body-change
// manifest. A candidate manifest cannot authorize itself by recomputing hashes.
export const documentLocationAdmission = Object.freeze({
  baseRevision: '159cd0e2f8753536800ba4635e896020a897fddc',
  manifestSha256: '0c106eabf4852f9f4e3e0752c9e875aa9cf8334874e1ff9140e412bc5a83ea16',
  // Exact accepted E2E catalog bytes precede the separately checked main source bridge.
  testingCatalogMaintenanceRevision: '98628aa7593a2d0867cb85b1d08f2be694e047d3',
  testingCatalogStagePublicationBaseRevision: 'c3273852ec273299d8caf41062bdc2a15442784d',
  testingCatalogPalacePublicationBaseRevision: 'cb3556d83905af362b6e79688449438e226dee77',
  testingCatalogPostPalaceBaseRevision: '8f6c0033d7351454608f9507067db9dd75dc9c90',
  testingAcquisitionSourceBaseRevision: '0973c2c25795fd2aacf78daedebb8d8f2a5113fc',
  testingBattleDefeatSourceRevision: '31002d214bb106272f34af46c86c57872b9b2849',
  testingBattleVictorySourceRevision: '840625b531130f6a9c4819c509ed3bf3a47353a5',
  testingBattleHandoffSourceRevision: '39d5bf7eb080a2a569421c50b79ebe60f38eecb0',
  testingBattleLifecycleSourceRevision: '4d50dbed3ed2ad18eb2dba9814dfe187739e0338',
  testingBattleReviewSourceRevision: '4a8cf1d83be4152132786d3dfe22531e0fb49d08',
  testingCatalogBattlePublicationBaseRevision: '43fea71735236272cfb7f6a1c61c3ac2e691a349',
})
