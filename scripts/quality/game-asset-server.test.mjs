import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

// A broken stream must be allowed to kill its isolated child: an exception handler in
// the test process would hide the original server-survival defect. The parent owns cleanup.
for (const [mode, title] of [
  ['normal', 'dev and preview serve exact bytes and resource headers'],
  ['missing', 'a file disappearing after stat reports failure and leaves the server usable'],
  ['abort', 'a disconnected client releases its in-flight native file stream'],
  [
    'late-error',
    'a read failure after headers closes the response and leaves later requests usable',
  ],
]) {
  test(`game asset server: ${title}`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'type-pal-asset-server-'))
    try {
      const result = spawnSync(
        process.execPath,
        [fileURLToPath(new URL('./fixtures/asset-server.mjs', import.meta.url)), mode, directory],
        { encoding: 'utf8', timeout: 10000 },
      )
      assert.equal(result.error, undefined, result.error?.message)
      assert.equal(result.signal, null, result.stderr)
      assert.equal(result.status, 0, result.stderr || result.stdout)
      assert.equal(result.stderr, '', 'the surviving server must not leave uncaught diagnostics')
      assert.deepEqual(JSON.parse(result.stdout), { mode, hooks: ['dev', 'preview'] })
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
}
