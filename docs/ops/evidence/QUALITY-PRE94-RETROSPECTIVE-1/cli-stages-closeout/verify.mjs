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
const json = (name) => JSON.parse(readFileSync(join(folder, name), 'utf8'))
const report = json('review.json')
const manifest = json('manifest.json')
const currentPins = [...report.files, ...report.testIdentityPins, ...report.dependencyPins]
const stale = currentPins.filter((pin) => hash(readFileSync(join(root, pin.path))) !== pin.sha256)
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', files: stale.map((pin) => pin.path) }))
  process.exit(2)
}
for (const pin of manifest.files)
  assert.equal(hash(readFileSync(join(folder, pin.path))), pin.sha256, pin.path)
for (const row of report.files) assert.deepEqual(Object.keys(row.dimensions), [...'ABCDEFGH'])
const archive = JSON.parse(gunzipSync(readFileSync(join(folder, 'receipts.json.gz'))))
for (const [name, row] of Object.entries(archive)) {
  const bytes = Buffer.from(row.base64, 'base64')
  assert.equal(bytes.length, row.bytes, name)
  assert.equal(hash(bytes), row.sha256, name)
}
const raw = (name) => Buffer.from(archive[name].base64, 'base64').toString()
const receipt = (name) => JSON.parse(raw(name))
const native = receipt('cli-regression.native.json')
assert.equal(native.success, true)
assert.equal(native.numTotalTests, 39)
assert.equal(native.numPassedTests, 39)
assert.equal(native.numFailedTests, 0)
assert.equal(native.numPendingTests, 0)
assert.equal(native.testResults.length, 6)
assert(
  native.testResults.every((suite) =>
    suite.assertionResults.every((test) => test.status === 'passed'),
  ),
)
assert.equal(raw('cli-regression.stderr.raw'), '')
const execution = receipt('cli-regression.execution.json')
assert.equal(execution.exit, 0)
assert.equal(execution.signal, null)
assert.equal(execution.spawnError, null)
assert.equal(execution.head, report.codeHead)
const suites = [
  ['cli-battle-assets.glm-q', [0, 0]],
  ['cli-error-exits.kimi-r1', [2, 1, 1, 1, 1, 1, 1, 1, 1]],
  ['cli-font-lookup.glm-q', [0, 0]],
  ['cli-global-entries.glm-q', Array(14).fill(0)],
  ['cli-isolated.glm-q', [1, 1, 1, 0, 1, 1]],
]
let children = 0
for (const [name, exits] of suites) {
  const runs = receipt(`children-${name}.json`)
  assert.deepEqual(
    runs.map((run) => run.exitCode),
    exits,
    name,
  )
  for (const run of runs) {
    assert.equal(run.signal, null)
    assert.equal(run.spawnError, null)
    assert(!/Unhandled|not wrapped in act|Warning:|Not implemented/.test(run.stdout + run.stderr))
    if (run.exitCode === 0) assert(run.stdout.includes('done. output →'))
  }
  children += runs.length
}
assert.equal(children, 33)
assert.equal(receipt('cli-observer-restoration.json').restored, true)
for (const [name, expected] of [['sprites-before.json', 'sprites-after.json']]) {
  const a = receipt(name),
    b = receipt(expected)
  for (const key of ['inputs', 'refs', 'files']) assert.deepEqual(a[key], b[key], key)
  assert.equal(a.files.length, 809)
  assert.equal(a.refs.length, 172)
  assert.equal(
    b.sourceHash,
    report.files.find((pin) => pin.path.endsWith('/sprite-assets.ts')).sha256,
  )
}
// These proofs only read frozen Git blobs. They never run extract, tests, coverage or write files.
const commands = [
  ['prove-data.mjs', report.proofChain[0].candidate],
  [
    'prove-stage-moves.mjs',
    join(folder, 'bitmap-animation-recipe.json'),
    report.proofChain[1].candidate,
  ],
  [
    'prove-stage-moves.mjs',
    join(folder, 'sprite-sound-lookup-recipe.json'),
    report.proofChain[2].candidate,
  ],
  ['prove-cleanup.mjs', report.codeHead],
]
for (const [script, ...args] of commands) {
  const result = JSON.parse(
    execFileSync(process.execPath, [join(folder, script), ...args], {
      cwd: root,
      encoding: 'utf8',
    }),
  )
  assert.equal(result.state, 'MATCH')
}
const master = JSON.parse(
  readFileSync(join(root, 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.json')),
)
assert.equal(master.cards.length, 83)
assert.equal(new Set(master.cards.map((card) => card.id)).size, 83)
const actual = { pending: 0, partial: 0, accept: 0 }
for (const card of master.cards) actual[card.currentReview]++
assert.deepEqual(master.currentReviewCounts, actual)
assert.deepEqual(master.lastIncrementalReview.fixed83, actual)
assert.equal(master.currentAccepted, actual.accept)
assert.equal(master.cards.find((card) => card.id === '3g').currentReview, 'accept')
console.log(
  JSON.stringify({
    state: 'CODE MATCH',
    files: report.files.length,
    nativeTests: 39,
    completeCliHostChildren: children,
    readOnlyGitProofs: 4,
    realSpriteFiles: 809,
    fixed83: actual,
    limitations:
      'Scoped code evidence; does not grant final unified gates, complete pre94, audio, browser or E2E acceptance.',
  }),
)
