import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

assert.equal(process.argv.length, 2)
const directory = dirname(fileURLToPath(import.meta.url))
const root = resolve(directory, '../../../..')
const read = (name) => readFileSync(resolve(directory, name))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const audit = JSON.parse(read('audit.json'))
assert.equal(audit.files.length, 46)
assert.equal(new Set(audit.files.map((f) => f.path)).size, 46)
for (const file of [...audit.files, audit.expandedRecent200Primary, audit.adjacentHost]) {
  const path = file.currentPath ?? file.path
  assert.equal(hash(readFileSync(resolve(root, path))), file.currentSha256, path)
  assert.equal(
    readFileSync(resolve(root, path), 'utf8').trimEnd().split('\n').length,
    file.currentLines,
    path,
  )
  for (const axis of 'ABCDEFGH') assert.ok(file.axes[axis]?.length > 15, `${path}/${axis}`)
}
for (const file of audit.consumerImportOnlyDeltas)
  assert.equal(hash(readFileSync(resolve(root, file.path))), file.currentSha256, file.path)
const screen = JSON.parse(read('screen-200.json'))
assert.equal(screen.currentIdentityPins.length, 200)
for (const file of screen.currentIdentityPins)
  assert.equal(hash(readFileSync(resolve(root, file.currentPath))), file.sha256, file.currentPath)
for (const file of audit.dependencies)
  assert.equal(hash(readFileSync(resolve(root, file.path))), file.sha256, file.path)
for (const file of audit.frozenReceipts)
  assert.equal(
    hash(execFileSync('git', ['show', `${audit.base}:${file.path}`], { cwd: root })),
    file.atBaseSha256,
  )
const index = JSON.parse(read('native-index.json'))
const archive = read('native.json.gz')
assert.equal(hash(archive), index.archiveSha256)
const entries = JSON.parse(gunzipSync(archive))
assert.deepEqual(Object.keys(entries).sort(), index.members.map((f) => f.name).sort())
for (const file of index.members) {
  const bytes = Buffer.from(entries[file.name])
  assert.equal(hash(bytes), file.sha256, file.name)
  assert.equal(bytes.length, file.bytes, file.name)
}
const json = (name) => JSON.parse(entries[name])
for (const [name, count] of [
  ['fixture-consumers-before', 169],
  ['fixture-consumers-after', 169],
  ['dialogue-official-green', 18],
  ['oracle-improvements-green', 61],
  ['frame-sequence-cleanup-green', 45],
]) {
  const execution = json(`${name}.execution.json`)
  assert.equal(execution.exit, 0, name)
  assert.equal(execution.signal, null, name)
  assert.equal(entries[`${name}.stderr.raw`], '', name)
  const result = json(`${name}.vitest.json`)
  assert.equal(result.numPassedTests, count, name)
  assert.equal(result.numFailedTests, 0, name)
}
for (const [name, expected] of [
  ['dialogue-official-red', 2],
  ['present-sides-new', 1],
]) {
  assert.equal(json(`${name}.execution.json`).exit, 1)
  const failures = json(`${name}.vitest.json`)
    .testResults.flatMap((f) => f.assertionResults)
    .filter((t) => t.status === 'failed')
  assert.equal(failures.length, expected)
  assert.ok(failures.every((t) => t.failureMessages.join('').includes('AssertionError')))
}
assert.equal(json('present-sides-old.execution.json').exit, 0)
const restoration = json('present-side-restoration.json')
assert.equal(
  hash(readFileSync(resolve(root, 'packages/game/src/present/present.ts'))),
  restoration.productSha256,
)
assert.equal(
  hash(readFileSync(resolve(root, 'packages/game/src/present/present.test.ts'))),
  restoration.testSha256,
)
execFileSync(process.execPath, [resolve(directory, 'fixture-conservation.mjs')], {
  cwd: root,
  stdio: 'pipe',
})
const gateIndex = JSON.parse(read('gates-native-index.json'))
const gateArchive = read('gates-native.json.gz')
assert.equal(hash(gateArchive), gateIndex.archiveSha256)
const gateEntries = JSON.parse(gunzipSync(gateArchive))
for (const member of gateIndex.members) {
  assert.equal(hash(Buffer.from(gateEntries[member.name])), member.sha256, member.name)
  assert.equal(Buffer.byteLength(gateEntries[member.name]), member.bytes, member.name)
}
for (const name of [
  'full-check',
  'official-ratchet-protected',
  'protected-same-report',
  'final-docs-r3',
  'final-lint-r2',
  'final-ledger',
  'final-diff',
  'final-proof',
]) {
  assert.equal(JSON.parse(gateEntries[`${name}.execution.json`]).exit, 0, name)
  assert.equal(gateEntries[`${name}.stderr.raw`], '', name)
}
const official = JSON.parse(gateEntries['official-report.json'])
assert.equal(official.testCount, 20157)
assert.equal(official.sourceFileCount, 809)
console.log(
  'PASS:47 recent200 primaries +1 adjacent; explicit A-H/source pins; complete native bytes; formal2-red/green; location counter; fixture conservation. Gates/publication separate.',
)
