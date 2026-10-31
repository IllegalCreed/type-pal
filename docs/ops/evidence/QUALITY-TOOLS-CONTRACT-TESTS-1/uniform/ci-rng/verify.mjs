import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../../../../..')
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')
const review = JSON.parse(fs.readFileSync(path.join(here, 'review.json')))
for (const row of review.sources)
  assert.equal(hash(fs.readFileSync(path.join(root, row.path))), row.sha256, row.path)
const packed = fs.readFileSync(path.join(here, review.native.path))
assert.equal(hash(packed), review.native.sha256)
const native = JSON.parse(zlib.gunzipSync(packed)).members
for (const row of review.native.members) {
  assert.equal(hash(Buffer.from(native[row.name])), row.sha256, row.name)
  assert.equal(Buffer.byteLength(native[row.name]), row.bytes, row.name)
}
const readReport = (id) => JSON.parse(native[`${id}.vitest.json`])
const cases = (id) => readReport(id).testResults.flatMap((row) => row.assertionResults)
const before = cases('window100-ci-no-raw-before')
assert.equal(before.length, 1)
assert.equal(before[0].status, 'failed')
assert(before[0].failureMessages.join('').includes('ENOENT'))
for (const id of ['window100-ci-no-raw-after', 'window100-ci-counter-old']) {
  const rows = cases(id)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].status, 'passed')
}
const counter = cases('window100-ci-counter-new')
assert.equal(counter.length, 1)
assert.equal(counter[0].status, 'failed')
assert.equal(
  counter[0].title,
  'writeRngAssets preserves chunk slots, sparse frame identities and exact delta bytes',
)
assert(counter[0].failureMessages.join('').includes('AssertionError'))
assert(!counter[0].failureMessages.join('').includes('ENOENT'))
const original = Buffer.from(native['window100-ci-rng-before.ts'])
assert.equal(hash(original), review.rawCompanion.sha256)
assert(fs.readFileSync(path.join(root, review.rawCompanion.path)).equals(original))
assert.deepEqual(Object.keys(review.rawCompanion.axes).sort(), 'ABCDEFGH'.split(''))
const vectors = JSON.parse(native['window100-ci-native-vectors.json'])
assert.equal(vectors.rows.length, 3)
for (const row of vectors.rows) {
  assert.deepEqual(row.native.bytes, row.expected)
  assert.equal(row.native.length, row.expected.length)
  assert(row.native.readBits > 0)
}
const full = JSON.parse(native['window100-ci-full-inventory.vitest.json'])
const fast = JSON.parse(native['window100-ci-fast-inventory.json'])
const isRaw = (row) => row.file.endsWith('/animation-assets.rng.pal.test.ts')
assert.equal(full.filter(isRaw).length, 1)
assert.equal(fast.filter(isRaw).length, 0)
assert.equal(full.length, 413)
assert.equal(fast.length, 357)
const selected = new Set(full.map((row) => `${row.file}\0${row.name}`))
for (const row of fast) assert(selected.has(`${row.file}\0${row.name}`))
for (const id of [
  'window100-ci-no-raw-after',
  'window100-ci-native-vectors',
  'window100-ci-directed',
  'window100-ci-extract-check',
  'window100-ci-typecheck',
  'window100-ci-official-ratchet',
  'window100-ci-protected',
]) {
  const execution = JSON.parse(native[`${id}.execution.json`])
  assert.equal(execution.exit, 0, id)
  assert.equal(execution.signal, null, id)
  assert.equal(execution.spawnError, null, id)
  assert.equal(native[`${id}.stderr.raw`], '', id)
}
const currentBytes = zlib.gunzipSync(fs.readFileSync(path.join(here, 'summary.current.json.gz')))
assert.equal(hash(currentBytes), review.currentReportSha256)
const current = JSON.parse(currentBytes)
assert.equal(current.sourceFileCount, 809)
assert.equal(current.testCount, 20188)
assert.equal(review.validation.currentOfficial.exit, 0)
assert.equal(review.validation.protected.exit, 0)
console.log(
  'PASS:raw contract bytes retained; no-data fast execution; independent EOS vectors; unique business counter; actual full/fast routing; fresh current report and protected gate.',
)
