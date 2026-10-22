import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
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
// This packet is frozen before main sync; verify its source identity in Git.
// The module closeout below owns the current-source checks after that sync.
for (const entry of current.currentSourcePins)
  assert.equal(
    sha(
      execFileSync('git', ['show', `71d45db07d5541c0399a92bbd44530d3bb06f8ad:${entry.path}`], {
        cwd: root,
      }),
    ),
    entry.sha256,
    entry.path,
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

const moduleReceipt = json('module-closeout.json')
for (const entry of moduleReceipt.artifacts) {
  const compressed = readFileSync(resolve(here, entry.file))
  const raw = gunzipSync(compressed)
  assert.equal(sha(compressed), entry.gzipSha256, entry.file)
  assert.equal(raw.length, entry.bytes, entry.file)
  assert.equal(sha(raw), entry.sha256, entry.file)
}
for (const entry of moduleReceipt.currentSourcePins)
  assert.equal(
    sha(readFileSync(resolve(root, entry.path))),
    entry.sha256,
    `STALE current source/caller: ${entry.path}`,
  )
assert.equal(moduleReceipt.acceptedFiles.length, 5)
for (const entry of moduleReceipt.acceptedFiles) {
  assert.equal(sha(blob(entry.gitBlobSha1)), entry.sha256, entry.path)
  for (const ref of entry.eightDimensionEvidence)
    assert.deepEqual(
      Object.keys(json(ref.file).files.find((file) => file.path === ref.path).dimensions),
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    )
}
const raw = (name) => gunzipSync(readFileSync(resolve(here, `${name}.gz`)))
for (const id of ['integrated-check-r2', 'integrated-ratchet-r2', 'integrated-protected']) {
  const run = JSON.parse(raw(`${id}.execution.json`))
  assert.equal(run.exit, 0, id)
  assert.equal(run.signal, null, id)
  assert.equal(raw(`${id}.stderr.raw`).length, 0, id)
}
const cleanCheck = stripVTControlCharacters(raw('integrated-check-r2.stdout.raw').toString())
const actualTests = [...cleanCheck.matchAll(/^\s*Tests\s+(\d+) passed/gm)].map((match) =>
  Number(match[1]),
)
assert.equal(actualTests.length, 7)
assert.equal(
  actualTests.reduce((a, b) => a + b, 0),
  moduleReceipt.validation.fullCheckTests,
)
assert.equal(
  [...cleanCheck.matchAll(/^# tests (\d+)$/gm)].reduce((sum, match) => sum + Number(match[1]), 0),
  moduleReceipt.validation.fullCheckTools,
)
const measured = JSON.parse(raw('integrated-summary.json'))
const baseline = JSON.parse(readFileSync(resolve(root, 'scripts/coverage/baseline.fast.json')))
const protectedReport = JSON.parse(raw('integrated-protected-report.json'))
assert.equal(measured.testCount, moduleReceipt.validation.officialTests)
assert.equal(measured.sourceFileCount, moduleReceipt.validation.productionSources)
assert.equal(
  sha(readFileSync(resolve(root, 'scripts/coverage/baseline.fast.json'))),
  protectedReport.baselineAfterSha256,
  'STALE current baseline',
)
assert.deepEqual(baseline, JSON.parse(raw('integrated-baseline.after.json')))
assert.deepEqual(protectedReport.strict.regressions, [])
assert.deepEqual(protectedReport.scope.changes, [])
assert.deepEqual(protectedReport.protectedMetrics.regressions, [])
assert.deepEqual(protectedReport.protectedScope.removals, [
  { kind: 'test-count', value: 'packages/game/src/assets/loader.test.ts', previous: 7, current: 4 },
])
process.stdout.write(
  `MATCH: five finite asset files, full ${moduleReceipt.validation.fullCheckTests}+${moduleReceipt.validation.fullCheckTools}, official ${measured.testCount}/${measured.sourceFileCount}, protected0; CODE3h remains partial.\n`,
)
