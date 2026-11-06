// Independent acceptance pin for the bounded repository-wide relocation + reviewed body-change
// manifest. A candidate manifest cannot authorize itself by recomputing hashes.
export const documentLocationAdmission = Object.freeze({
  baseRevision: '159cd0e2f8753536800ba4635e896020a897fddc',
  manifestSha256: '16878d6e06d7c60852b5075f70c5e189676d4ad54c313c1325a2399722016fd2',
  // Exact accepted E2E catalog bytes precede the separately checked main source bridge.
  testingCatalogMaintenanceRevision: '37bf91067012bebf1f4fedd707326c5149f4a429',
})
