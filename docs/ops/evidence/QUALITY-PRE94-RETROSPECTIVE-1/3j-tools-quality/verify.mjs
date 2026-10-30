import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../../../../..')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const read = (file) => JSON.parse(fs.readFileSync(file))
const report = read(path.join(dir, 'review.json'))
const recount = report.integration.structuralRecount
const pins = [
  ...report.files,
  ...report.context,
  ...report.primary,
  ...(report.integration.stdoutTimingReview ?? []).map((entry) => ({
    path: entry.source,
    sha256: entry.sha256,
  })),
  ...(recount
    ? [
        {
          path: 'scripts/coverage/approved-baseline-adjustments.mjs',
          sha256: recount.approvalModuleSha256,
        },
        { path: recount.policy.source, sha256: recount.policy.sourceSha256 },
      ]
    : []),
]
const stale = pins.filter((pin) => {
  const file = path.join(root, pin.path)
  return !fs.existsSync(file) || hash(fs.readFileSync(file)) !== pin.sha256
})
if (fs.existsSync(path.join(root, report.deleted.path))) stale.push(report.deleted)
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', paths: stale.map((pin) => pin.path) }))
  process.exitCode = 2
} else {
  assert.equal(report.files.length, 15)
  for (const file of report.files) {
    assert.deepEqual(Object.keys(file.dimensions), [...'ABCDEFGH'])
    for (const value of Object.values(file.dimensions)) assert(value.length > 10)
    if (file.reuse) {
      const previous = read(path.join(root, file.reuse.path)).files.find(
        (entry) => entry.path === file.path,
      )
      assert.equal(previous.sha256, file.sha256)
      assert.equal(file.reuse.sourceSha256, file.sha256)
      assert.deepEqual(previous.dimensions, file.dimensions)
    }
  }
  const archive = fs.readFileSync(path.join(dir, report.receipts.path))
  assert.equal(hash(archive), report.receipts.sha256)
  const entries = JSON.parse(gunzipSync(archive))
  assert.equal(Object.keys(entries).length, report.receipts.entries)
  for (const [name, entry] of Object.entries(entries)) {
    const bytes = Buffer.from(entry.base64, 'base64')
    assert.equal(bytes.length, entry.bytes, name)
    assert.equal(hash(bytes), entry.sha256, name)
  }
  const attachment = (name) => {
    assert(entries[name], name)
    return Buffer.from(entries[name].base64, 'base64')
  }
  const json = (name) => JSON.parse(attachment(name))
  const native = (id, passed, failed = 0) => {
    const result = json(`${id}.native.json`)
    const execution = json(`${id}.execution.json`)
    assert.equal(result.numPassedTests, passed, id)
    assert.equal(result.numFailedTests, failed, id)
    assert.equal(result.numTotalTests, passed + failed, id)
    assert.equal(result.numPendingTests, 0, id)
    assert.equal(result.numTodoTests, 0, id)
    assert.equal(execution.exit, failed ? 1 : 0, id)
    assert.equal(execution.signal, null, id)
    assert.equal(execution.spawnError, null, id)
    if (!failed) assert.equal(attachment(`${id}.stderr.raw`).length, 0, id)
    return result
  }
  native('before-toast-map', 9)
  native('after-toast-map', 7)
  const directed = native(report.runs.directed.id, 28)
  const adjacent = native(report.runs.adjacent.id, 92)
  assert.equal(directed.testResults.length, 8)
  assert.equal(adjacent.testResults.length, 15)
  for (const control of report.controls.results) {
    native(control.old.id, control.old.passed)
    const red = native(control.current.id, control.current.passed, 1)
    const failed = red.testResults.flatMap((file) =>
      file.assertionResults.filter((test) => test.status === 'failed'),
    )
    assert.deepEqual(
      failed.map((test) => test.fullName),
      control.current.failures,
    )
    assert(failed[0].failureMessages.some((message) => message.startsWith('AssertionError:')))
  }
  native(report.controls.restored.id, 7)
  assert.equal(report.controls.sourceAndTestsRestored, true)
  for (const body of report.body.records) {
    assert.equal(report.files.find((file) => file.path === body.file).sha256, body.sha256)
    assert(body.parsedBodyEqual || body.restoredParsedBodyEqual)
  }
  assert.equal(report.files.find((file) => file.path === report.held.file).decision, 'review')
  assert.equal(report.progress.card3j, 'partial; runtime calibration remains review')
  if (report.integration.state === 'passed') {
    for (const id of report.integration.localGateIds) {
      const execution = json(`${id}.execution.json`)
      assert.equal(execution.exit, 0, id)
      assert.equal(execution.signal, null, id)
      assert.equal(execution.spawnError, null, id)
      assert.equal(attachment(`${id}.stderr.raw`).length, 0, id)
    }
    const result = json('module-protected-report.json')
    assert.deepEqual(result.strict.regressions, [])
    assert.deepEqual(result.scope.changes, [])
    assert.deepEqual(result.protectedMetrics.regressions, [])
    assert.deepEqual(result.deletedFiles, [report.deleted.path])
    assert.equal(json('module-ratchet.execution.json').exit, 1)
    assert.equal(
      attachment('module-ratchet.stderr.raw').toString(),
      json('module-ratchet.audit.json').policyRejection,
    )
    assert.deepEqual(result.approvalsApplied, [recount.entry.id])
    const beforeNative = native('pad-v8-before', 14)
    const afterNative = native('pad-v8-after', 14)
    const identities = (run) =>
      run.testResults.flatMap((file) => file.assertionResults.map((test) => test.fullName)).sort()
    assert.deepEqual(identities(beforeNative), identities(afterNative))
    assert.deepEqual(json('pad-recount.json'), recount.native)
    const [before, after] = recount.native.records
    const withoutKey = ({ key: _key, ...branch }) => branch
    assert.deepEqual(
      before.branches.filter((branch) => branch.type !== 'default-arg').map(withoutKey),
      after.branches.map(withoutKey),
    )
    assert.deepEqual(
      before.branches
        .filter((branch) => branch.type === 'default-arg')
        .map((branch) => branch.hits),
      [[37]],
    )
    assert.deepEqual(recount.native.delta, {
      statements: { covered: 0, total: 0 },
      branches: { covered: -1, total: -1 },
      functions: { covered: 0, total: 0 },
      lines: { covered: 0, total: 0 },
    })
    for (const id of [report.integration.check.id, 'module-ratchet']) {
      const audit = json(`${id}.audit.json`)
      assert.deepEqual(audit.diagnostics, [])
      if (id === report.integration.check.id)
        assert.deepEqual(audit.lintDiagnostics, { error: 0, warning: 0, info: 0 })
    }
    assert.equal(
      hash(fs.readFileSync(path.join(root, 'scripts/coverage/baseline.fast.json'))),
      result.baselineAfterSha256,
    )
  }
  console.log(
    JSON.stringify({
      state: 'MATCH',
      files: report.files.length,
      receipts: Object.keys(entries).length,
      integration: report.integration.state,
      limits:
        'Read-only identity/native-result check; semantic A–H remain explicit judgments. No SUT/network/coverage/writes; route calibration remains review.',
    }),
  )
}
