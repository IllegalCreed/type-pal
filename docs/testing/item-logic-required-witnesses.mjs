import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Audit runners intentionally succeed even when a candidate misses a mutant: their job is to
// record the comparison. This read-only wrapper additionally requires the eight candidate reds.
const root = resolve(process.argv[2])
const here = dirname(fileURLToPath(import.meta.url))
const required = [
  'growth-no-op',
  'drop-unrelated-inventory',
  'drop-external-money',
  'learned-input-mutation',
  'throw-input-mutation',
  'drop-equipped-usable',
  'growth-extra-rng',
  'drop-external-hp',
]
const env = { ...process.env }
delete env.NODE_COMPILE_CACHE
const rows = []
for (const script of [
  'item-logic-r2-review-witnesses.mjs',
  'item-logic-r3-residual-witnesses.mjs',
]) {
  const result = spawnSync(process.execPath, [join(here, script), root], {
    encoding: 'utf8',
    env,
    maxBuffer: 4 * 1024 * 1024,
  })
  process.stdout.write(result.stdout ?? '')
  process.stderr.write(result.stderr ?? '')
  assert.equal(result.signal, null, `${script}: interrupted`)
  assert.equal(result.status, 0, `${script}: invalid audit run`)
  const directory = result.stdout.trim().split('\n').at(-1)
  assert.ok(directory?.startsWith('/'), `${script}: missing fresh evidence directory`)
  rows.push(...JSON.parse(readFileSync(join(directory, 'summary.json'), 'utf8')))
}
const mutants = rows.filter((row) => row.name.endsWith('-candidate-mutant'))
assert.deepEqual(
  mutants.map((row) => row.name.replace(/-candidate-mutant$/, '')).sort(),
  [...required].sort(),
  'All eight required candidate mutations must execute exactly once',
)
const missed = mutants.filter((row) => row.exit !== 1 || row.failed < 1)
console.log(
  JSON.stringify({ candidateMutationGate: missed.length === 0, missed: missed.map((r) => r.name) }),
)
if (missed.length > 0) process.exitCode = 1
