import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { documentLocationAdmission } from './document-location-admission.mjs'

/* Isolated CLI fixtures copy the same runtime modules from the real checkout. */
export const docsCliModulePaths = Object.freeze([
  'scripts/docs/artifact-compression.mjs',
  'scripts/docs/artifact-content-alias.mjs',
  'scripts/docs/artifact-retirement.mjs',
  'scripts/docs/check.mjs',
  'scripts/docs/config.mjs',
  'scripts/docs/document-integrity.mjs',
  'scripts/docs/document-location-admission.mjs',
  'scripts/docs/document-location.mjs',
  'scripts/docs/git-document-snapshot.mjs',
  'scripts/docs/git-inventory.mjs',
  'scripts/docs/markdown-source-spans.mjs',
  'scripts/docs/markdown.mjs',
  'scripts/docs/relocate.mjs',
  'scripts/docs/review-record-storage-io.mjs',
  'scripts/docs/review-record-storage.mjs',
  'scripts/docs/terminal-codec.mjs',
  'scripts/docs/terminal-contract.mjs',
  'scripts/docs/terminal-git.mjs',
  'scripts/docs/terminal-json.mjs',
  'scripts/docs/terminal-namespace.mjs',
  'scripts/docs/testing-acquisition-source-bridge.mjs',
  'scripts/docs/testing-battle-publication.mjs',
  'scripts/docs/testing-source-bridge.mjs',
  'scripts/docs/testing-source-maintenance-admission.mjs',
  'scripts/docs/testing-source-maintenance.mjs',
  'scripts/docs/testing-source-refs.mjs',
])

/** Older-contract CLI fixtures deliberately deploy the older admission state.
 * This changes only their copied tool configuration, never the production gate. */
export function installHistoricalLocationFixture(root) {
  assert.notEqual(
    resolve(root),
    fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/u, ''),
  )
  const {
    testingAcquisitionSourceBaseRevision: _acquisitionBase,
    testingCatalogBattlePublicationBaseRevision: _battlePublicationBase,
    ...historicalAdmission
  } = documentLocationAdmission
  writeFileSync(
    join(root, 'scripts/docs/document-location-admission.mjs'),
    `export const documentLocationAdmission = Object.freeze(${JSON.stringify({ ...historicalAdmission, manifestSha256: null })})\n`,
  )
}
