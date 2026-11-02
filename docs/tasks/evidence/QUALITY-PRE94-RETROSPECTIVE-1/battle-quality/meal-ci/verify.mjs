import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gunzipSync } from 'node:zlib'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../../../../..')
const require = createRequire(path.join(root, 'package.json'))
const ts = require('typescript')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const review = JSON.parse(fs.readFileSync(path.join(here, 'review.json')))
const packed = fs.readFileSync(path.join(here, review.native.path))
assert.equal(hash(packed), review.native.sha256)
const native = JSON.parse(gunzipSync(packed))
assert.deepEqual(Object.keys(native.members).sort(), Object.keys(review.native.members).sort())
for (const [name, value] of Object.entries(native.members)) {
  const bytes = Buffer.from(value.data, 'base64')
  assert.equal(value.encoding, 'base64', name)
  assert.equal(bytes.length, review.native.members[name].bytes, name)
  assert.equal(hash(bytes), review.native.members[name].sha256, name)
}
const member = (name) => Buffer.from(native.members[name].data, 'base64')
const json = (name) => JSON.parse(member(name))
const integration = JSON.parse(fs.readFileSync(path.join(here, 'integration.json')))
const integrationPacked = fs.readFileSync(path.join(here, integration.native.path))
assert.equal(hash(integrationPacked), integration.native.sha256)
const integrationNative = JSON.parse(gunzipSync(integrationPacked))
for (const [name, value] of Object.entries(integrationNative.members)) {
  const bytes = Buffer.from(value.data, 'base64')
  assert.equal(bytes.length, integration.native.members[name].bytes, name)
  assert.equal(hash(bytes), integration.native.members[name].sha256, name)
}
assert.equal(
  hash(fs.readFileSync(path.join(root, 'scripts/coverage/baseline.fast.json'))),
  integration.protectedBaselineSha256,
)
const current = fs.readFileSync(path.join(root, review.source.path), 'utf8')
assert.equal(hash(current), review.source.sha256)
const printer = ts.createPrinter({ removeComments: true })
const tests = (text) => {
  const source = ts.createSourceFile('meal.ts', text, ts.ScriptTarget.Latest, true)
  return source.statements
    .filter(
      (node) =>
        ts.isExpressionStatement(node) && node.expression.getText(source).startsWith('test'),
    )
    .map((node) => printer.printNode(ts.EmitHint.Unspecified, node, source))
}
assert.deepEqual(tests(member('before.ts').toString()), tests(current))
assert.deepEqual(
  json('before-fingerprint.result.json').snapshots,
  json('candidate-fingerprint.result.json').snapshots,
)
assert.equal(json('meal-nine.native.json').numPassedTests, 9)
assert.equal(json('meal-nine.native.json').numFailedTests, 0)
assert.equal(json('candidate-ownership.native.json').numPassedTests, 1)
for (const id of ['meal-nine', 'meal-types', 'meal-official']) {
  assert.equal(json(`${id}.execution.json`).exit, 0)
  assert(Object.values(json(`${id}.diagnostics.json`).diagnostics).every((value) => value === 0))
}
for (const id of review.gates.statics.accepted) {
  assert.equal(json(`${id}.execution.json`).exit, 0)
  assert.equal(json(`${id}.execution.json`).stderr.bytes, 0)
}
assert.equal(
  hash(fs.readFileSync(path.join(root, 'docs/phase1/game-mechanics.md'))),
  review.wordPolicy.evidence.currentMechanicsSha256,
)
assert.equal(
  hash(fs.readFileSync(path.join(root, 'packages/game/src/core/battle/battle-progression.ts'))),
  review.wordPolicy.evidence.numericSourceSha256,
)
const official = json('official-refresh-proof.json')
assert.equal(hash(fs.readFileSync(path.join(root, official.source))), official.runnerSha256)
const { compareCoverage } = await import(
  pathToFileURL(path.join(root, 'scripts/coverage/metrics.mjs'))
)
const { auditScope } = await import(
  pathToFileURL(path.join(root, 'scripts/coverage/inventory.mjs'))
)
const combined = json('combined-summary.json')
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'scripts/coverage/baseline.fast.json')))
assert.deepEqual(compareCoverage(combined, baseline), { regressions: [], improvements: [] })
assert.deepEqual(auditScope(combined, baseline), { changes: [], removals: [] })
assert.equal(combined.packages.reforge.selectedTests.testCount, 8965)
assert.equal(combined.testCount, 20032)
assert.equal(
  hash(fs.readFileSync(path.resolve(here, '../native.json.gz'))),
  review.wordPolicy.priorNativeSha256,
)
assert(
  fs
    .readFileSync(path.join(root, review.wordPolicy.source), 'utf8')
    .includes('保留TS持续增长，明确记录偏离'),
)
console.log(
  JSON.stringify({
    result: 'MATCH',
    source: review.source.path,
    nativeMembers: Object.keys(native.members).length,
    nineTestBodiesAndTimeoutsUnchanged: true,
    completeInputsEqual: true,
    freshReforge: 8965,
    combinedWithSixPackageReuse: 20032,
    noBaselineChange: true,
    newClosures: 0,
    limitations: review.limits,
  }),
)
