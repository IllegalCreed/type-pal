import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Final R2: reuse the exact frozen judge; only change the probe table.
const root = resolve(process.argv[2])
const directory = dirname(fileURLToPath(import.meta.url))
const original = readFileSync(
  join(directory, 'parallel-guard-command-r2-review-witnesses.mjs'),
  'utf8',
)
const start = original.indexOf('const probes =\n')
const end = original.indexOf('const results = []\n')
assert.ok(start > 0 && end > start)
assert.equal(original.indexOf('const probes =\n', start + 1), -1)
assert.equal(original.indexOf('const results = []\n', end + 1), -1)
const probes = [
  {
    id: 'final-defeated-input-mutation',
    test: 'enemy-hook',
    target: 'enemy-script.ts',
    from: 'if (!Array.isArray(value)) throw new Error(`${path}: 期望 EnemyOnDefeatedCommand[]`)',
    to: 'if (!Array.isArray(value)) { if (value && typeof value === "object") Object.assign(value, { __codex_mutation: true }); throw new Error(`${path}: 期望 EnemyOnDefeatedCommand[]`) }',
    expected: 1,
  },
]
const work = mkdtempSync(join(tmpdir(), 'codex-guard-final-runner-'))
const runner = join(work, 'witnesses.mjs')
writeFileSync(
  runner,
  `${original.slice(0, start)}const probes = ${JSON.stringify(probes)}\n${original.slice(end)}`,
)
const env = { ...process.env }
delete env.NODE_COMPILE_CACHE
const run = spawnSync(process.execPath, [runner, 'glm', root], { env, stdio: 'inherit' })
assert.equal(run.signal, null)
assert.equal(run.status, 0)
