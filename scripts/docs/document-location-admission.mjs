// Independent acceptance pin for the bounded repository-wide relocation + reviewed body-change
// manifest. A candidate manifest cannot authorize itself by recomputing hashes.
export const documentLocationAdmission = Object.freeze({
  baseRevision: '159cd0e2f8753536800ba4635e896020a897fddc',
  manifestSha256: '0d745fc2e53575fddf23cd9f44fa134d60e3d9dd0ec8df71a2dbe0b283b941b0',
  // Exact accepted E2E catalog bytes precede the separately checked main source bridge.
  testingCatalogMaintenanceRevision: '37bf91067012bebf1f4fedd707326c5149f4a429',
})
