import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { approvedTestRetirements } from '../../../../../scripts/coverage/approved-test-retirements.mjs'

const folder = 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/gamestate-save-closeout'
const review = JSON.parse(fs.readFileSync(`${folder}/review.json`, 'utf8'))
const hash = (b) => createHash('sha256').update(b).digest('hex')
for (const entry of [
  ...review.files,
  ...review.context,
  ...review.inheritance,
  review.proof,
  review.screenshot,
  review.receipts,
]) {
  assert.equal(
    hash(fs.readFileSync(entry.path)),
    entry.sha256,
    `STALE scoped binding: ${entry.path}`,
  )
}
const members = new Map(
  JSON.parse(gunzipSync(fs.readFileSync(review.receipts.path))).members.map((m) => [m.name, m]),
)
assert.equal(members.size, review.receipts.members.length)
for (const m of review.receipts.members) {
  const bytes = Buffer.from(members.get(m.name).base64, 'base64')
  assert.equal(bytes.length, m.bytes, m.name)
  assert.equal(hash(bytes), m.sha256, m.name)
}
const bytes = (name) => Buffer.from(members.get(name).base64, 'base64')
const json = (name) => JSON.parse(bytes(name))
for (const [id, total] of [
  ['related-final', 340],
  ['export-final', 4],
]) {
  const n = json(`${id}.native.json`)
  assert.equal(n.numTotalTests, total)
  assert.equal(n.numPassedTests, total)
  assert.equal(n.numFailedTests, 0)
  assert.equal(n.numPendingTests, 0)
  assert.equal(bytes(`${id}.stderr.raw`).length, 0)
  assert.equal(json(`${id}.execution.json`).exit, 0)
}
assert.equal(json('related-final.native.json').testResults.length, 11)
assert.equal(json('export-red.execution.json').exit, 1)
assert.equal(json('export-red.native.json').numFailedTests, 1)
assert.match(bytes('export-red.stderr.raw').toString(), /AssertionError/)
assert.match(bytes('export-red.stderr.raw').toString(), /caught 1 unhandled error/)
for (const run of json('controls-sealed.json').runs) {
  assert.equal(run.failed, 1)
  assert.equal(run.exit, 1)
  assert.equal(run.restored.equal, true)
  assert.equal(hash(fs.readFileSync(run.test.path)), run.test.sha256)
  assert.equal(hash(fs.readFileSync(run.source.path)), run.restored.sha256)
  assert.match(run.failureMessages.join(''), /AssertionError/)
  assert.equal(json(`${run.id}.native.json`).numPendingTests, 0)
}
const previous = json('controls.json').runs
for (const run of previous.filter((r) => r.id.endsWith('-old'))) {
  assert.equal(run.passed, 65)
  assert.equal(run.failed, 0)
}
const save = json('save-fields-control.json')
assert.deepEqual(
  save.runs.map((r) => [r.passed, r.failed]),
  [
    [29, 0],
    [30, 1],
  ],
)
assert.match(save.runs[1].failedTests[0].messages.join(''), /AssertionError/)
assert.equal(save.restored.source, true)
assert.equal(save.restored.test, true)
assert.equal(json('typecheck-final.execution.json').exit, 0)
assert.equal(json('retirement-tools.execution.json').exit, 0)
const browser = json('browser-export-r2.json')
assert.equal(browser.ok, true)
assert.equal(browser.failureVisual.text, '✗ 导出失败:浏览器禁止读取存档')
assert.deepEqual(browser.diagnostics, [])
assert.deepEqual(browser.downloads, [])
assert.equal(browser.emptyAfter, '✗ 存档位 1 暂无存档')
assert.equal(browser.cleanupError, undefined)
const mapping = review.testMapping
assert.equal(mapping.length, 61)
assert.equal(mapping.filter((m) => m.decision === 'retire').length, 5)
const current = json('related-final.native.json').testResults.find((r) =>
  r.name.endsWith('/core/game-state.test.ts'),
).assertionResults
assert.deepEqual(
  mapping
    .filter((m) => m.after)
    .map((m) => m.after)
    .sort(),
  current.map((t) => t.fullName).sort(),
)
const identities = current
  .map(
    (t) =>
      `${review.retirement.file} :: project root :: ${[...t.ancestorTitles, t.title].join(' > ')}`,
  )
  .sort((a, b) => a.localeCompare(b))
assert.equal(hash(JSON.stringify(identities)), review.retirement.currentIdentityDigest)
assert.deepEqual(
  approvedTestRetirements.find((e) => e.file === review.retirement.file),
  review.retirement,
)
assert.equal(hash(fs.readFileSync(review.retirement.file)), review.retirement.fileSha256)
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
  assert.equal(gate.exit, gate.id === 'ledger-first' ? 1 : 0, gate.id)
assert.match(
  Buffer.from(staticMembers.get('lint-final.stdout.raw').base64, 'base64').toString(),
  /0 errors \/ 0 warnings \/ 0 infos; complete report/,
)
const proof = JSON.parse(execFileSync('node', [`${folder}/prove-module.cjs`], { encoding: 'utf8' }))
assert.equal(proof.wholeRootOutsideMovedFunctionsEqual, true)
assert.equal(proof.wholeMovedFunctionsIncludingTypesEqual, true)
assert.equal(proof.rootExportsPreserved, true)
assert.equal(proof.leafRuntimeDependencies, 0)
console.log(
  'PASS: scoped source/type/export bridge, exact five retirements, raw/native controls and export red/green/browser receipts. Cards remain partial; unified gates deferred.',
)
