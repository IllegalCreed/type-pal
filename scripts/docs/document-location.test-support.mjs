import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { documentLocationAdmission } from './document-location-admission.mjs'

/** Older-contract CLI fixtures deliberately deploy the older admission state.
 * This changes only their copied tool configuration, never the production gate. */
export function installHistoricalLocationFixture(root) {
  assert.notEqual(
    resolve(root),
    fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/u, ''),
  )
  writeFileSync(
    join(root, 'scripts/docs/document-location-admission.mjs'),
    `export const documentLocationAdmission = Object.freeze(${JSON.stringify({ ...documentLocationAdmission, manifestSha256: null })})\n`,
  )
}
