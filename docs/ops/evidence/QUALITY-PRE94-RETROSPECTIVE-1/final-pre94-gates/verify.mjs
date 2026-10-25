import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const folder = dirname(fileURLToPath(import.meta.url))
const root = resolve(folder, '../../../../..')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const review = JSON.parse(readFileSync(join(folder, 'review.json')))
const readArchive = (receipt) => {
  const compressed = readFileSync(join(folder, receipt.path))
  assert.equal(hash(compressed), receipt.sha256)
  const rows = JSON.parse(gunzipSync(compressed))
  for (const [name, row] of Object.entries(rows)) {
    const bytes = Buffer.from(row.base64, 'base64')
    assert.equal(bytes.length, row.bytes, name)
    assert.equal(hash(bytes), row.sha256, name)
  }
  return rows
}
const archive = readArchive(review.receipts)
readArchive(review.bootstrap.receipts)
readArchive(review.configContract.receipts)
const workerArchive = readArchive(review.workerBudget.receipts)
const resourceBridge = review.workerBudget.sourceProof
const serialArchive = readArchive(review.serialCI.receipts)
const bridges = [
  { ...resourceBridge, archive: workerArchive },
  ...review.serialCI.bridges.map((bridge) => ({ ...bridge, archive: serialArchive })),
]
const member = (name) => {
  const row = archive[name]
  assert(row, `Missing original: ${name}`)
  const bytes = Buffer.from(row.base64, 'base64')
  assert.equal(bytes.length, row.bytes, name)
  assert.equal(hash(bytes), row.sha256, name)
  return bytes
}
const json = (name) => JSON.parse(member(name))
const pins = [
  ...json('collection-inputs.json').files,
  ...review.policyPins,
  ...(review.bootstrap?.files ?? []),
]
const stale = []
for (const pin of pins) {
  try {
    const observed = readFileSync(join(root, pin.path))
    if (hash(observed) === pin.sha256) continue
    const bridge = bridges.find(
      (entry) =>
        pin.path === entry.path &&
        pin.sha256 === entry.beforeSha256 &&
        hash(observed) === entry.sha256,
    )
    if (bridge) {
      const original = Buffer.from(bridge.archive[bridge.beforeSource].base64, 'base64')
      assert.equal(hash(original), pin.sha256)
      let expected = original.toString()
      for (const edit of bridge.replacements) {
        assert.equal(expected.split(edit.before).length, 2)
        expected = expected.replace(edit.before, edit.after)
      }
      assert.equal(observed.toString(), expected)
    } else stale.push(pin.path)
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
    console.log(JSON.stringify({ state: 'UNAVAILABLE', path: pin.path }))
    process.exit(3)
  }
}
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', affected: stale }))
  process.exit(2)
}
execFileSync('git', ['merge-base', '--is-ancestor', review.codeFreeze, 'HEAD'], { cwd: root })
assert.equal(hash(member('collection-inputs.json')), review.sourceInputs.sha256)
for (const id of [
  'full-check-r2',
  'coverage-tools-final',
  'ratchet-same-report',
  'protected-same-report',
]) {
  assert.equal(json(`${id}.execution.json`).exit, 0, id)
  assert.equal(member(`${id}.stderr.raw`).length, 0, id)
}
assert.equal(json('full-check.execution.json').exit, 1)
assert.equal(json('official-coverage.execution.json').exit, 1)
assert.equal(json('recount-producer-initial.execution.json').exit, 1)
assert.equal(json('recount-producer-final.execution.json').exit, 0)
assert.match(
  member('official-coverage.stderr.raw').toString(),
  /^\n\[coverage:fast\] FAIL\n覆盖率不得下降:/,
)
for (const id of ['full-check-r2', 'official-coverage']) {
  assert.equal(
    (
      member(`${id}.stdout.raw`)
        .toString()
        .match(/^stderr \|/gm) ?? []
    ).length,
    0,
    id,
  )
}
assert.match(member('coverage-tools-final.stdout.raw').toString(), /# tests 117\n/)
const reports = JSON.parse(gunzipSync(member('official-current-reports.json.gz')))
for (const [name, row] of Object.entries(reports)) {
  const bytes = Buffer.from(row.base64, 'base64')
  assert.equal(bytes.length, row.bytes, name)
  assert.equal(hash(bytes), row.sha256, name)
}
const summary = JSON.parse(Buffer.from(reports['coverage/fast/summary.json'].base64, 'base64'))
assert.equal(summary.testCount, 20180)
assert.equal(summary.sourceFileCount, 807)
summary.packages.reforge.fastTests.executionDigest = resourceBridge.executionDigest.after
summary.packages.reforge.selectedTests.executionDigest = resourceBridge.executionDigest.after
summary.packages.game.fastTests.executionDigest =
  review.serialCI.gameInventory.executionDigest.after
summary.packages.game.selectedTests.executionDigest =
  review.serialCI.gameInventory.executionDigest.after
const baseline = JSON.parse(readFileSync(join(root, 'scripts/coverage/baseline.fast.json')))
assert.deepEqual(baseline.total, summary.total)
for (const [id, value] of Object.entries(summary.packages)) {
  assert.deepEqual(baseline.packages[id].metrics, value.metrics, id)
  assert.deepEqual(baseline.packages[id].fastTests.fileEntries, value.fastTests.fileEntries, id)
  assert.equal(baseline.packages[id].fastTests.executionDigest, value.fastTests.executionDigest, id)
}
assert.equal(
  hash(readFileSync(join(root, 'scripts/coverage/run.mjs'))),
  json('replay-proof.json').officialSha256,
)
assert.equal(hash(member('replay-current-official.mjs')), json('replay-proof.json').generatedSha256)
assert.deepEqual(review.fixed83, { accept: 83, partial: 0, pending: 0 })
console.log(
  JSON.stringify({
    state: 'MATCH',
    sourceInputs: review.sourceInputs.files,
    exactInputs: review.serialCI.matchedInputs,
    exactWholeFileBridges: bridges.length,
    codeScopes: 83,
    wholeCheckTests: 20617,
    officialTests: summary.testCount,
    officialCollections: 1,
    scope:
      'Frozen originals, current inputs, finite policy data and recorded gate outcomes match; semantic eight-axis judgments and remote CI/merge require their own evidence.',
  }),
)
