import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: here,
  encoding: 'utf8',
}).trim()
const record = JSON.parse(readFileSync(resolve(here, 'quality.json'), 'utf8'))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const blob = (id) => execFileSync('git', ['cat-file', 'blob', id], { cwd: root })
for (const entry of record.artifacts) {
  const compressed = readFileSync(resolve(here, entry.file))
  const raw = gunzipSync(compressed)
  assert.equal(sha(compressed), entry.gzipSha256, entry.file)
  assert.equal(raw.length, entry.bytes, entry.file)
  assert.equal(sha(raw), entry.sha256, entry.file)
}
for (const entry of [
  ...record.sourceSnapshots,
  ...record.files.filter((file) => file.gitBlobSha1),
  ...record.pins,
]) {
  assert.equal(sha(blob(entry.gitBlobSha1)), entry.sha256, entry.path)
}
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const body = (bytes) =>
  ts
    .createPrinter({ removeComments: true })
    .printFile(
      ts.createSourceFile(
        'source.ts',
        bytes.toString(),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      ),
    )
for (const entry of record.sourceSnapshots)
  assert.equal(body(blob(entry.previousBlob)), body(blob(entry.gitBlobSha1)))
assert.deepEqual(record.tests.before, { passed: 43, failed: 0, pending: 0 })
assert.deepEqual(record.tests.after, { passed: 40, failed: 0, pending: 0 })
assert.deepEqual(
  record.tests.controls.map((round) => [round.passed, round.failed.length]),
  [
    [17, 0],
    [10, 4],
    [17, 0],
    [13, 1],
  ],
)
assert(record.tests.controls.every((round) => round.failed.every((test) => test.assertionError)))
assert(Object.values(record.tests.controlRestoration).every(Boolean))
assert.equal(record.ci.conclusion, 'success')
assert.equal(record.ci.head, record.base)
assert.equal(record.ci.runtimeStderrBlocks, 0)
assert.equal(record.ci.actWarnings, 0)
assert.equal(record.ci.platformDeprecationWarnings, 6)
assert.equal(record.ci.platformWarningAnnotations, 1)
const json = (name) => JSON.parse(readFileSync(resolve(here, name), 'utf8'))
const native = (name) =>
  JSON.parse(gunzipSync(readFileSync(resolve(here, `${name}.native.json.gz`))))
for (const [name, expected] of [
  ['before', [43, 0]],
  ['after-fixed', [40, 0]],
  ['clone-return-before', [17, 0]],
  ['clone-return-after', [10, 4]],
  ['warning-context-before', [17, 0]],
  ['warning-context-after', [13, 1]],
]) {
  const actual = native(name)
  assert.deepEqual(
    [actual.numPassedTests, actual.numFailedTests, actual.numPendingTests],
    [...expected, 0],
    name,
  )
  for (const suite of actual.testResults)
    for (const test of suite.assertionResults) {
      if (test.status === 'failed')
        assert(
          test.failureMessages.every((message) => message.includes('AssertionError')),
          test.fullName,
        )
    }
}
for (const report of [json('ui-fix.json'), json('recount.json'), json('fixture-refresh.json')]) {
  for (const entry of report.artifacts) {
    const compressed = readFileSync(resolve(here, entry.file))
    const raw = gunzipSync(compressed)
    assert.equal(sha(compressed), entry.gzipSha256, entry.file)
    assert.equal(raw.length, entry.bytes, entry.file)
    assert.equal(sha(raw), entry.sha256, entry.file)
  }
}
const current = json('fixture-refresh.json')
for (const entry of current.currentSourcePins)
  assert.equal(
    sha(readFileSync(resolve(root, entry.path))),
    entry.sha256,
    `STALE current source: ${entry.path}`,
  )
const red = native('ui-typed-fixture-red')
assert.deepEqual([red.numPassedTests, red.numFailedTests, red.numPendingTests], [1, 2, 0])
for (const suite of red.testResults)
  for (const test of suite.assertionResults) {
    if (test.status === 'failed')
      assert(
        test.failureMessages.every((message) => message.includes('AssertionError')),
        test.fullName,
      )
  }
assert.deepEqual(
  [native('fixture-directed').numPassedTests, native('fixture-assemble-final').numPassedTests],
  [167, 10],
)
assert.equal(current.recountRefresh.currentRow.sources.length, 9)
assert.equal(current.recountRefresh.metricsUnchanged, true)
process.stdout.write(
  'MATCH: frozen quality slice, originals, 40 green, 4+1 business controls, c427 CI success; no whole-CODE3h acceptance.\n',
)
