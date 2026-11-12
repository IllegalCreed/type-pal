// Independent acceptance pin for the bounded repository-wide relocation + reviewed body-change
// manifest. A candidate manifest cannot authorize itself by recomputing hashes.
export const documentLocationAdmission = Object.freeze({
  baseRevision: '159cd0e2f8753536800ba4635e896020a897fddc',
  manifestSha256: 'bf83d661b073e1854854c55a0acc90ec8bd93671a9555140676f4a0c9d111000',
  // Exact accepted E2E catalog bytes precede the separately checked main source bridge.
  testingCatalogMaintenanceRevision: '98628aa7593a2d0867cb85b1d08f2be694e047d3',
  testingCatalogStagePublicationBaseRevision: 'c3273852ec273299d8caf41062bdc2a15442784d',
  testingCatalogPalacePublicationBaseRevision: 'cb3556d83905af362b6e79688449438e226dee77',
  testingCatalogPostPalaceBaseRevision: '8f6c0033d7351454608f9507067db9dd75dc9c90',
  testingAcquisitionSourceBaseRevision: '0973c2c25795fd2aacf78daedebb8d8f2a5113fc',
  testingCatalogBattlePublicationBaseRevision: '43fea71735236272cfb7f6a1c61c3ac2e691a349',
})
