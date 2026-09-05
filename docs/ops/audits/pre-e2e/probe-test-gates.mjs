// node docs/ops/audits/pre-e2e/probe-test-gates.mjs
// Executes ORIGINAL resource tests with read-only fs fixtures. No resources are deleted.
// Needs the local raw/extracted resources for the normal control; does not generate them.
// Success here means the documented unfixed gate behavior was reproduced.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const gameRoot = fileURLToPath(new URL('../../../../packages/game/', import.meta.url))
const runner = fileURLToPath(new URL('../../../../node_modules/vitest/vitest.mjs', import.meta.url))
const config = fileURLToPath(new URL('./probe-test-gates.config.mjs', import.meta.url))
function run(mode, filters) {
  const result = spawnSync(
    process.execPath,
    [
      runner,
      'run',
      '--config',
      config,
      ...filters,
      '--reporter=verbose',
      '--disableConsoleIntercept',
    ],
    {
      cwd: gameRoot,
      env: { ...process.env, TYPE_PAL_AUDIT_RESOURCE_CASE: mode },
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 5 * 1024 * 1024,
    },
  )
  assert.equal(result.error, undefined)
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` }
}
const raw = run('missing-raw', [
  'src/assets/rng-blob-snapshot.test.ts',
  'src/assets/tileset-blob-snapshot.test.ts',
])
assert.equal(raw.status, 1)
assert.match(raw.output, /AUDIT simulated ENOENT/)
assert.match(raw.output, /Failed Suites 2/)
const effectFilter = ['src/assets/sprite-blob-snapshot.test.ts', '-t', 'magic effect:']
const missing = run('missing-effect', effectFilter)
const normal = run('normal', effectFilter)
const assertionCount = (output) =>
  Number(output.match(/AUDIT_ASSERTION_COUNT magic effect:[^\n]*? (\d+)\s*(?:\n|$)/)?.[1])
assert.equal(missing.status, 0)
assert.equal(assertionCount(missing.output), 0)
assert.equal(normal.status, 0)
assert.equal(assertionCount(normal.output), 5)
console.log(
  'E-test-gates',
  JSON.stringify({
    missingRawExit: raw.status,
    missingRawFailedSuites: 2,
    missingEffectExit: missing.status,
    missingEffectAssertions: assertionCount(missing.output),
    normalEffectExit: normal.status,
    normalEffectAssertions: assertionCount(normal.output),
  }),
)
