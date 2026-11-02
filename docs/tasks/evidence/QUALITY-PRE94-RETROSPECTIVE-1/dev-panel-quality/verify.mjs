import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'

const folder = 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/dev-panel-quality'
const j = JSON.parse(fs.readFileSync(`${folder}/review.json`))
const hash = (b) => createHash('sha256').update(b).digest('hex')
for (const entry of [...j.files, ...j.context, ...j.inheritance, j.proof, j.receipts]) {
  assert.equal(hash(fs.readFileSync(entry.path)), entry.sha256, `STALE scoped input: ${entry.path}`)
}
const members = new Map(
  JSON.parse(gunzipSync(fs.readFileSync(j.receipts.path))).members.map((m) => [m.name, m]),
)
assert.equal(members.size, j.receipts.members.length)
for (const m of j.receipts.members) {
  const b = Buffer.from(members.get(m.name).base64, 'base64')
  assert.equal(b.length, m.bytes)
  assert.equal(hash(b), m.sha256)
}
const bytes = (name) => Buffer.from(members.get(name).base64, 'base64')
const json = (name) => JSON.parse(bytes(name))
const direct = json('related.native.json')
assert.equal(direct.testResults.length, 10)
assert.equal(direct.numPassedTests, 106)
assert.equal(direct.numFailedTests, 0)
assert.equal(direct.numPendingTests, 0)
assert.equal(bytes('related.stderr.raw').length, 0)
assert.equal(json('related.execution.json').exit, 0)
const base = json('base-party.execution.json')
assert.equal(base.passed, 2)
assert.equal(base.failed, 2)
assert.equal(base.restored.equal, true)
assert(base.failedFullNames.every((n) => n.includes('重建寿葫芦效果')))
const identity = (n) =>
  n.testResults
    .flatMap((s) =>
      s.assertionResults.map((t) => ({
        file: s.name.split('/packages/game/')[1],
        name: t.fullName,
      })),
    )
    .sort((a, b) => (a.file + a.name).localeCompare(b.file + b.name))
assert.deepEqual(identity(json('alpha-old.native.json')), j.identityMapping.same)
assert.deepEqual(identity(json('alpha-r2-old.native.json')), j.identityMapping.same)
assert.equal(j.identityMapping.same.length, 43)
assert.equal(json('alpha-r2-old.native.json').numPassedTests, 43)
const counter = json('alpha-complete.execution.json')
assert.equal(counter.failed, 1)
assert.equal(counter.passed, 0)
assert.equal(counter.exit, 1)
assert.equal(counter.restored.equal, true)
assert.equal(
  counter.testSha256,
  hash(fs.readFileSync('packages/game/src/dev/dev-indexed-image.test.ts')),
)
assert.equal(counter.restored.sha256, hash(fs.readFileSync(counter.restored.path)))
assert.match(counter.failureMessages.join(''), /AssertionError/)
assert.equal(json('alpha-complete.native.json').numPendingTests, 0)
assert.equal(json('image-complete.native.json').numPassedTests, 1)
assert.equal(json('image-complete.execution.json').exit, 0)
assert.equal(bytes('image-complete.stderr.raw').length, 0)
assert.equal(json('typecheck-legal.execution.json').exit, 0)
assert.equal(bytes('typecheck-legal.stderr.raw').length, 0)
assert(!/error TS\d/.test(bytes('typecheck-legal.stdout.raw').toString()))
const staticReview = JSON.parse(fs.readFileSync(`${folder}/static.json`, 'utf8'))
const staticArchive = fs.readFileSync(staticReview.archive.path)
assert.equal(hash(staticArchive), staticReview.archive.sha256)
const staticMembers = new Map(JSON.parse(gunzipSync(staticArchive)).members.map((m) => [m.name, m]))
for (const entry of staticReview.archive.members) {
  const raw = Buffer.from(staticMembers.get(entry.name).base64, 'base64')
  assert.equal(hash(raw), entry.sha256)
  assert.equal(raw.length, entry.bytes)
}
for (const gate of staticReview.gates)
  assert.equal(gate.exit, gate.id === 'proof-style-first' ? 1 : 0, gate.id)
assert.match(
  Buffer.from(staticMembers.get('lint-final.stdout.raw').base64, 'base64').toString(),
  /0 errors \/ 0 warnings \/ 0 infos; complete report/,
)
const proof = JSON.parse(
  execFileSync('node', [`${folder}/prove-recompose.cjs`], { encoding: 'utf8' }),
)
for (const key of [
  'rootUnrelatedFunctionsAndPublicTypesEqual',
  'rootPublicNamesEqual',
  'wholePickerAfterResponsibilityExpansionEqual',
  'imageWholeBodyAndTypesEqual',
  'sharedCacheDeclarationEqual',
])
  assert.equal(proof[key], true)
assert.equal(proof.leafRuntimeReverseDependencies, 0)
console.log(
  'PASS: scoped A-H source/context, exact43 old identities, complete-fixture pixel counter/recovery and whole executable/type/export reconstruction. Whole cards partial; unified gates deferred.',
)
