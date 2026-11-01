import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

test('retained evidence restoration enforces native bytes, safe filesystem IO, recovery and complete CI gate ownership', () => {
  const result = spawnSync(
    'python3',
    [
      '-B',
      '-W',
      'error',
      fileURLToPath(new URL('./e2e-evidence-restore.test.py', import.meta.url)),
    ],
    {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    },
  )
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.match(result.stderr, /Ran [1-9]\d* tests? in [\d.]+s/)
  assert.match(result.stderr, /\nOK\s*$/)
  assert.doesNotMatch(result.stderr, /skipped=|Warning:|Error:/)
})
