import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

assert.equal(process.argv.length, 2, 'read-only receipt verifier takes no arguments')
const directory = dirname(fileURLToPath(import.meta.url))
const root = resolve(directory, '../../../../..')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const manifest = JSON.parse(readFileSync(resolve(directory, 'native-index.json'), 'utf8'))
const compressed = readFileSync(resolve(directory, 'native.json.gz'))
assert.equal(hash(compressed), manifest.sha256)
const originals = JSON.parse(gunzipSync(compressed))
assert.deepEqual(Object.keys(originals).sort(), manifest.members.map((m) => m.name).sort())
for (const member of manifest.members) {
  const bytes = Buffer.from(originals[member.name], 'utf8')
  assert.equal(bytes.length, member.bytes, member.name)
  assert.equal(hash(bytes), member.sha256, member.name)
}
const json = (name) => JSON.parse(originals[name])
for (const id of manifest.cleanGates) {
  const run = json(`${id}.execution.json`)
  assert.equal(run.exit, 0, id)
  assert.equal(run.signal, null, id)
  assert.equal(run.spawnError, null, id)
  assert.equal(originals[`${id}.stderr.raw`], '', id)
  assert.doesNotMatch(
    originals[`${id}.stdout.raw`],
    /stderr\s*\||not wrapped in act|does not support act|\bDeprecationWarning\b/,
    id,
  )
}
assert.equal(json('window2-check.execution.json').exit, 1)
assert.equal(json('window2-editor-resume.execution.json').exit, 1)
assert.equal(json('window2-ledger-projection-red.execution.json').exit, 1)
assert.equal(originals['window2-official.execution.json'], undefined)
assert.equal(originals['window2-official.stderr.raw'], '')
const resume = json('official-resume-start.json')
assert.equal(resume.originalExit, null)
assert.equal(resume.originals.length, 6)
for (const item of resume.originals) {
  assert.equal(hash(originals[`coverage/${item.id}.json`]), item.coverageSha256)
  assert.equal(hash(originals[`inventory/${item.id}.json`]), item.inventorySha256)
}
const report = json('coverage-summary.json')
assert.equal(report.sourceFileCount, 809)
assert.equal(report.testCount, 20154)
assert.equal(report.profile, 'fast')
assert.equal(
  Object.values(report.packages).reduce((sum, p) => sum + p.selectedTests.testCount, 0),
  report.testCount,
)
const baseline = readFileSync(resolve(root, 'scripts/coverage/baseline.fast.json'))
assert.equal(hash(baseline), hash(originals['baseline-after.json']))
const recount = JSON.parse(readFileSync(resolve(directory, 'recount.json'), 'utf8'))
assert.equal(recount.rows.length, 8)
assert.equal(
  recount.rows.reduce((sum, row) => sum + row.previous - row.current, 0),
  23,
)
assert.equal(
  recount.deleted.reduce((sum, row) => sum + row.testCount, 0),
  12,
)
for (const row of recount.rows)
  assert.equal(hash(readFileSync(resolve(root, row.file))), row.fileSha256, row.file)
for (const row of recount.guardSources)
  assert.equal(hash(readFileSync(resolve(root, row.path))), row.sha256, row.path)
assert.equal(hash(readFileSync(resolve(root, 'scripts/coverage/run.mjs'))), resume.runnerSha256)
assert.match(originals['window2-lint-final.stdout.raw'], /0 errors \/ 0 warnings \/ 0 infos/)
console.log(
  'PASS: complete native gates, explicit failed/interrupted attempts, exact coverage/test scope and unchanged official guards; publication checked separately.',
)
