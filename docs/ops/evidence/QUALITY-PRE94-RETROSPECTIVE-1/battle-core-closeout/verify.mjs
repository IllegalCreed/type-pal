import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const folder = dirname(fileURLToPath(import.meta.url))
const root = resolve(folder, '../../../../..')
const read = (p) => readFileSync(join(root, p))
const hash = (b) => createHash('sha256').update(b).digest('hex')
const report = JSON.parse(readFileSync(join(folder, 'review.json')))
const stale = [...report.files, ...report.contextPins].filter(
  (pin) => hash(read(pin.path)) !== pin.sha256,
)
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', affected: stale.map((pin) => pin.path) }))
  process.exit(2)
}
const zipped = readFileSync(join(folder, report.receipts.path))
assert.equal(hash(zipped), report.receipts.sha256)
const archive = JSON.parse(gunzipSync(zipped))
for (const [name, row] of Object.entries(archive)) {
  const bytes = Buffer.from(row.base64, 'base64')
  assert.equal(bytes.length, row.bytes, name)
  assert.equal(hash(bytes), row.sha256, name)
}
const text = (name) => Buffer.from(archive[name].base64, 'base64').toString()
const json = (name) => JSON.parse(text(name))
for (const row of report.files) {
  assert.deepEqual(Object.keys(row.dimensions), [...'ABCDEFGH'])
  assert.equal(hash(read(row.inheritedEightAxes.path)), row.inheritedEightAxes.reportSha256)
}
for (const [id, cases, files] of [
  ['core-regression', 86, 7],
  ['position-adjacency', 14, 1],
]) {
  const r = json(`${id}.native.json`),
    e = json(`${id}.execution.json`)
  assert.equal(r.numTotalTests, cases)
  assert.equal(r.numPassedTests, cases)
  assert.equal(r.numFailedTests, 0)
  assert.equal(r.numPendingTests, 0)
  assert.equal(r.testResults.length, files)
  assert(r.testResults.every((s) => s.assertionResults.every((t) => t.status === 'passed')))
  assert.equal(e.exit, 0)
  assert.equal(e.signal, null)
  assert.equal(e.spawnError, null)
  assert.equal(text(`${id}.stderr.raw`), '')
}
const matrix = json('rng-mutation-matrix.native.json')
assert.equal(matrix.numTotalTests, 32)
assert.equal(matrix.numPassedTests, 30)
assert.equal(matrix.numFailedTests, 2)
assert.equal(matrix.numPendingTests, 0)
const originalRng = text('rng.before.ts'),
  currentTest = read('packages/game/src/core/rng.test.ts').toString()
assert.equal(originalRng, read('packages/game/src/core/rng.ts').toString())
const expectedFailures = new Set([
  'SeedableRng (mulberry32) range(0, 100) 总在 [0, 100)',
  'SeedableRng (mulberry32) rangeInclusive(0, 10) 总在 [0, 10] 且能取到边界',
])
for (const suite of matrix.testResults) {
  assert.equal(suite.assertionResults.length, 8)
  const failures = suite.assertionResults.filter((t) => t.status === 'failed')
  assert.equal(failures.length, suite.name.includes('-after') ? 1 : 0)
  for (const test of failures) {
    assert(expectedFailures.delete(test.fullName))
    assert(test.failureMessages.every((m) => m.includes('AssertionError')))
  }
}
assert.equal(expectedFailures.size, 0)
for (const spec of json('rng-mutation-matrix.specs.json')) {
  assert.equal(spec.source, originalRng.replace(spec.patch.before, spec.patch.after))
  assert.equal(hash(spec.source), spec.sourceSha256)
  assert.equal(hash(spec.spec), spec.specSha256)
  if (spec.testVersion === 'after') assert.equal(spec.spec, currentTest)
  else assert.equal(spec.spec, text('rng.test.before.ts'))
}
assert.equal(json('rng-counter-cleanup.json').removed, true)
const ts = createRequire(join(root, 'package.json'))('typescript')
function tokens(source) {
  const js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      removeComments: true,
    },
  }).outputText
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, js),
    result = []
  for (let k = scanner.scan(); k !== ts.SyntaxKind.EndOfFileToken; k = scanner.scan())
    result.push([k, scanner.getTokenText()])
  return result
}
for (const suffix of [
  'formulas.ts',
  'magic-damage.ts',
  'status.ts',
  'turn-queue.ts',
  '__tests__/status.test.ts',
]) {
  const p = `packages/game/src/core/battle/${suffix}`
  assert.deepEqual(
    tokens(read(p).toString()),
    tokens(execFileSync('git', ['show', `${report.base}:${p}`], { cwd: root, encoding: 'utf8' })),
  )
}
assert.equal(text('dex-native-o0-run.stdout.raw'), text('dex-native-o2-run.stdout.raw'))
const nativeDex = text('dex-native-o0-run.stdout.raw').trim().split('\n').map(Number),
  tsDex = json('dex-ts.json')
assert.equal(nativeDex.length, 159)
assert.equal(tsDex.length, 159)
assert.deepEqual(nativeDex.slice(0, 5), [999, 2, 999, 41, -32498])
assert.deepEqual(
  tsDex.slice(0, 5).map((r) => r.value),
  [999, 999, 999, 41, 33038],
)
for (let i = 5; i < 159; i++) assert.equal(nativeDex[i], tsDex[i].value)
const defense = json('defense-ts.stdout.raw').results
assert.deepEqual(
  defense.map((r) => [r.projectedDefense, r.output[0].damage, r.rngState]),
  [
    [32767, 50, 3663131668],
    [32768, 68, 3663131668],
  ],
)
const master = JSON.parse(read('docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.json')),
  counts = { pending: 0, partial: 0, accept: 0 }
for (const card of master.cards) counts[card.currentReview]++
assert.equal(master.cards.length, 83)
assert.equal(new Set(master.cards.map((c) => c.id)).size, 83)
assert.deepEqual(master.currentReviewCounts, counts)
assert.deepEqual(master.lastIncrementalReview.fixed83, counts)
assert.equal(master.currentAccepted, counts.accept)
console.log(
  JSON.stringify({
    state: 'SCOPED MATCH',
    acceptedFileScopes: 9,
    numericalReviewScopes: 4,
    coreTests: 86,
    positionAdjacent: 14,
    oldMutantsPassed: 16,
    newBusinessFailures: 2,
    fixed83: counts,
    limits:
      'Two product decisions pending in this packet; no whole3m,fullpre94,unified gate or UI/E2E acceptance.',
  }),
)
