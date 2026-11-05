// Independent acceptance pin for the bounded repository-wide relocation + reviewed body-change
// manifest. A candidate manifest cannot authorize itself by recomputing hashes.
export const documentLocationAdmission = Object.freeze({
  baseRevision: '159cd0e2f8753536800ba4635e896020a897fddc',
  manifestSha256: 'ebac3a2f81b128fb0f27900db716db9c3a40f0136d9c836501a1e67578d2eea7',
  // Exact accepted E2E catalog bytes precede the separately checked main source bridge.
  testingCatalogMaintenanceRevision: '37bf91067012bebf1f4fedd707326c5149f4a429',
})
