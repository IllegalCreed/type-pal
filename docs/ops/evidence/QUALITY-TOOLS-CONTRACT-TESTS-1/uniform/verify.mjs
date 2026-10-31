import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import zlib from 'node:zlib'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../../../..')
const read = (file) => fs.readFileSync(path.resolve(root, file))
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')
const json = (file) => JSON.parse(fs.readFileSync(path.join(here, file)))
const index = json('native-index.json')
const packed = fs.readFileSync(path.join(here, index.native.path))
assert.equal(hash(packed), index.native.sha256)
const native = JSON.parse(zlib.gunzipSync(packed)).members
for (const row of index.native.members) {
  assert.equal(hash(Buffer.from(native[row.name])), row.sha256, row.name)
  assert.equal(Buffer.byteLength(native[row.name]), row.bytes, row.name)
}
assert.equal(Object.keys(native).length, index.native.members.length)
const blobs = {}
for (const row of index.blobs) {
  const packed = fs.readFileSync(path.join(here, row.path))
  assert.equal(hash(packed), row.sha256)
  const bytes = zlib.gunzipSync(packed)
  assert.equal(hash(bytes), row.rawSha256)
  assert.equal(bytes.length, row.rawBytes)
  blobs[row.path] = JSON.parse(bytes)
}
const parent = JSON.parse(fs.readFileSync(path.join(here, '../review.json')))
const ciPath = path.join(here, 'ci-rng/review.json')
const ciReview = fs.existsSync(ciPath) ? JSON.parse(fs.readFileSync(ciPath)) : undefined
assert.equal(Boolean(parent.ciFollowup), Boolean(ciReview), 'missing CI follow-up evidence')
if (ciReview) await import('./ci-rng/verify.mjs')
assert.equal(parent.actualPrimaryFilesReviewed, 100)
assert.equal(parent.files.length, 100)
assert.equal(new Set(parent.files.map((row) => row.path)).size, 100)
for (const row of parent.files) {
  assert.equal(row.readExtent, 'full', row.path)
  assert.equal(row.decision, 'code-accepted', row.path)
  assert.equal(hash(read(row.path)), row.sha256, row.path)
  assert.deepEqual(Object.keys(row.axes).sort(), 'ABCDEFGH'.split(''))
  for (const axis of 'ABCDEFGH') assert(row.axes[axis].length > 15, `${row.path}:${axis}`)
}
for (const row of parent.dependencies) assert.equal(hash(read(row.path)), row.sha256, row.path)
for (const row of parent.retiredFiles)
  assert(!fs.existsSync(path.resolve(root, row.path)), row.path)
const current = ciReview
  ? JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(here, 'ci-rng/summary.current.json.gz'))))
  : blobs['summary.current.json.gz']
const main = blobs['summary.main.json.gz']
const old = JSON.parse(native['window100-baseline.before.json'])
const recount = json('recount.json')
assert.equal(hash(JSON.stringify(old)), recount.baselineStructuralDigest)
assert.equal(current.sourceFileCount, 809)
assert.equal(main.sourceFileCount, 812)
assert.equal(current.testCount, 20188)
assert.equal(main.testCount, 20203)
const { compareCoverage, aggregateMetrics, normalizeMetrics } = await import(
  pathToFileURL(path.resolve(root, 'scripts/coverage/metrics.mjs'))
)
const { auditScope } = await import(
  pathToFileURL(path.resolve(root, 'scripts/coverage/inventory.mjs'))
)
const { adjustApprovedBaseline } = await import(
  pathToFileURL(path.resolve(root, 'scripts/coverage/approved-baseline-adjustments.mjs'))
)
const { isApprovedTestRetirement } = await import(
  pathToFileURL(path.resolve(root, 'scripts/coverage/approved-test-retirements.mjs'))
)
const summaries = blobs['coverage-summaries.json.gz'].members
const ciSummaries = ciReview
  ? JSON.parse(
      zlib.gunzipSync(
        fs.readFileSync(path.join(here, 'ci-rng/coverage-summaries.current.json.gz')),
      ),
    )
  : undefined
for (const id of Object.keys(old.packages)) {
  assert.deepEqual(main.packages[id].metrics, old.packages[id].metrics)
  assert.deepEqual(
    normalizeMetrics(JSON.parse(summaries[`main/${id}`]).total),
    old.packages[id].metrics,
  )
  assert.deepEqual(
    normalizeMetrics(JSON.parse(ciSummaries?.[id] ?? summaries[`current/${id}`]).total),
    current.packages[id].metrics,
  )
  if (id !== 'pal-extract') assert.deepEqual(current.packages[id].metrics, old.packages[id].metrics)
}
const adjusted = await adjustApprovedBaseline(old, async (file) => read(file))
assert.deepEqual(adjusted.applied, ['quality-window100-exact-test-migration-20261027'])
assert.deepEqual(adjusted.baseline.packages['pal-extract'].metrics.branches, {
  covered: 661,
  total: 790,
})
assert.deepEqual(compareCoverage(current, adjusted.baseline).regressions, [])
assert.deepEqual(
  aggregateMetrics(Object.values(current.packages).map((row) => row.metrics)),
  current.total,
)
assert.deepEqual(auditScope(current, old), recount.scope)
for (const removal of recount.scope.removals) {
  if (removal.kind !== 'test-count') {
    assert(!fs.existsSync(path.resolve(root, removal.value)), removal.value)
    continue
  }
  const entry = (snapshot) =>
    Object.values(snapshot.packages)
      .flatMap((row) => row.fastTests.fileEntries)
      .find((row) => row.file === removal.value)
  assert(
    isApprovedTestRetirement({
      removal,
      previous: entry(old),
      current: entry(current),
      fileSha256: hash(read(removal.value)),
    }),
  )
}
const ts = createRequire(path.resolve(root, 'package.json'))('typescript')
const runner = read('scripts/coverage/run.mjs').toString('utf8')
assert.equal(hash(runner), '87c5e8049444e8d5b6195b5d01ced2061420f04ed9a572a7e8f80f9b67a29d45')
const ast = ts.createSourceFile('run.mjs', runner, ts.ScriptTarget.Latest, true)
const projection = ast.statements
  .filter(ts.isVariableStatement)
  .flatMap((row) => row.declarationList.declarations)
  .find((row) => row.name.getText(ast) === 'baselineView')
  .initializer.getText(ast)
assert.deepEqual(
  Function(`return (${projection})`)()(current),
  JSON.parse(read('scripts/coverage/baseline.fast.json')),
)
const executions = [
  'window100-check-final',
  'window100-ratchet-replay',
  'window100-protected-replay',
]
for (const id of executions) {
  const execution = JSON.parse(native[`${id}.execution.json`])
  assert.equal(execution.exit, 0, id)
  assert.equal(execution.signal, null, id)
  assert.equal(execution.spawnError, null, id)
  assert.equal(native[`${id}.stderr.raw`], '', id)
}
assert(native['window100-check-final.stdout.raw'].includes('0 errors / 0 warnings / 0 infos'))
assert(
  !/^stderr \||DeprecationWarning:|Warning:.*act\(/m.test(
    native['window100-check-final.stdout.raw'],
  ),
)
const first = JSON.parse(native['window100-official-ratchet.execution.json'])
assert.equal(first.exit, 1)
assert(native['window100-official-ratchet.stderr.raw'].includes('pal-extract.branches'))
console.log(
  ciReview
    ? 'PASS:100 full A-H identities; original whole check + current CI-focused validation; two justified candidate collections; exact recount/retirements/protected guards. No duplicate full review.'
    : 'PASS:100 full A-H identities; immutable originals; actual final check; one official report; exact recount/retirements and protected guards. Hashes do not replace semantic review.',
)
