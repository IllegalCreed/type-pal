import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'

const folder = 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/status-tools-closeout'
const review = JSON.parse(fs.readFileSync(`${folder}/review.json`, 'utf8'))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const check = ({ path, sha256 }) =>
  assert.equal(hash(fs.readFileSync(path)), sha256, `STALE: scoped input ${path}`)
for (const entry of [
  ...review.files,
  ...review.context,
  ...review.inheritance,
  ...review.browser.screenshots,
  review.proof,
  review.receipts,
])
  check(entry)
const archive = JSON.parse(gunzipSync(fs.readFileSync(review.receipts.path)).toString())
assert.equal(archive.members.length, review.receipts.members.length)
const members = new Map()
for (const frozen of review.receipts.members) {
  const entry = archive.members.find((member) => member.name === frozen.name)
  assert(entry, `missing ${frozen.name}`)
  const bytes = Buffer.from(entry.base64, 'base64')
  assert.equal(bytes.length, frozen.bytes)
  assert.equal(hash(bytes), frozen.sha256)
  members.set(entry.name, bytes)
}
const json = (name) => JSON.parse(members.get(name).toString())
const direct = json('directed.native.json')
assert.equal(direct.testResults.length, 16)
assert.equal(direct.numTotalTests, 125)
assert.equal(direct.numPassedTests, 125)
assert.equal(direct.numFailedTests, 0)
assert.equal(members.get('directed.stderr.raw').length, 0)
for (const id of ['directed', 'game-typecheck', 'browser-functional-r2', 'refactor-proof-r4'])
  assert.equal(json(`${id}.execution.json`).exit, 0, id)
const control = json('keys-control.json')
assert.equal(control.results[0].failed, 0)
assert.equal(control.results[0].passed, 16)
assert.equal(control.results[1].failed, 1)
assert.equal(control.results[1].passed, 15)
assert.match(control.results[1].failedTests[0].failureMessages.join(''), /AssertionError/)
assert.deepEqual(control.restored, { source: true, test: true })
const names = (result) =>
  result.testResults.flatMap((suite) => suite.assertionResults.map((test) => test.fullName)).sort()
const mapping = review.testMapping.main.renamed
assert.deepEqual(
  names(json('keys-old.native.json'))
    .map((name) => name.replace(mapping.from, mapping.to))
    .sort(),
  names(json('keys-new.native.json')),
)
const browser = json('browser-r2/browser-functional.json')
assert.equal(browser.ok, true)
assert.deepEqual(browser.diagnostics, []) // This is the producer's limited error/warn filter; debug/log disclosed.
assert.equal(browser.pixelComparison.changedPixels, 262)
assert.equal(browser.pixelComparison.changedOutsidePoisonRow, 0)
assert.equal(browser.poisonEntry.after, 188)
assert.deepEqual(browser.partyReset.party, [1, 2])
const proof = execFileSync('node', [`${folder}/prove-refactor.cjs`], { encoding: 'utf8' })
assert.equal(JSON.parse(proof).panel.wholeReconstructedJsEqual, true)
console.log(
  'PASS: scoped source/body/reuse bindings, raw/native identities and browser receipts; 53/58 remain partial; unified gates not run.',
)
