// Independent acceptance pin for the bounded repository-wide relocation + reviewed body-change
// manifest. A candidate manifest cannot authorize itself by recomputing hashes.
export const documentLocationAdmission = Object.freeze({
  baseRevision: '159cd0e2f8753536800ba4635e896020a897fddc',
  manifestSha256: '92860e2227ad1482d696e07eca4f5fffb295dfb37b5583cc75ba8134eb229131',
  // Exact accepted E2E catalog bytes precede the separately checked main source bridge.
  testingCatalogMaintenanceRevision: '98628aa7593a2d0867cb85b1d08f2be694e047d3',
  testingCatalogStagePublicationBaseRevision: 'c3273852ec273299d8caf41062bdc2a15442784d',
})
