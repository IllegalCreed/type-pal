import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import ts from 'typescript'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../../../../..')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const read = (file) => JSON.parse(fs.readFileSync(file))
const report = read(path.join(dir, 'review.json'))
const stale = [...report.files, ...report.context, ...report.primary].filter((pin) => {
  const file = path.join(root, pin.path)
  return !fs.existsSync(file) || hash(fs.readFileSync(file)) !== pin.sha256
})
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', paths: stale.map((entry) => entry.path) }))
  process.exitCode = 2
} else {
  assert.equal(report.files.length, 27)
  const ledgerPath = 'docs/ops/audits/code-quality-file-ledger.md'
  const historyMarker = '<!-- original-source-fenced:start -->'
  const oldLedger = execFileSync('git', ['show', `${report.base}:${ledgerPath}`], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(
    fs.readFileSync(path.join(root, ledgerPath), 'utf8').split(historyMarker)[1],
    oldLedger.split(historyMarker)[1],
  )
  for (const file of report.files) assert.deepEqual(Object.keys(file.dimensions), [...'ABCDEFGH'])
  const packed = fs.readFileSync(path.join(dir, report.receipts.path))
  assert.equal(hash(packed), report.receipts.sha256)
  const archive = JSON.parse(gunzipSync(packed))
  assert.equal(Object.keys(archive).length, report.receipts.entries)
  for (const entry of Object.values(archive)) {
    const bytes = Buffer.from(entry.base64, 'base64')
    assert.equal(bytes.length, entry.bytes)
    assert.equal(hash(bytes), entry.sha256)
  }
  const bytes = (file) => {
    assert(archive[file], file)
    return Buffer.from(archive[file].base64, 'base64')
  }
  const json = (file) => JSON.parse(bytes(file))
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
    if (!failed) assert.equal(bytes(`${id}.stderr.raw`).length, 0, id)
    return result
  }
  native('baseline', 77)
  native('directed', 69)
  native('adjacent', 695)
  native('battle-restored', 21)
  const final = native('final-directed', 90)
  assert.equal(final.testResults.length, 17)
  const identities = final.testResults.flatMap((file) =>
    file.assertionResults.map(
      (test) =>
        `${path.relative(root, file.name)} :: project root :: ${[...test.ancestorTitles, test.title].join(' > ')}`,
    ),
  )
  assert.deepEqual(
    identities.sort(),
    report.retirements.currentIdentities.map((entry) => entry.identity).sort(),
  )
  for (const id of report.controls) {
    const proof = json(`${id}.proof.json`)
    const oldId = report.controlOldReuse[id] ?? `${id}-old`
    const old = json(`${oldId}.native.json`)
    native(oldId, old.numTotalTests)
    const result = json(`${id}-new.native.json`)
    const red = native(`${id}-new`, result.numTotalTests - 1, 1)
    const failures = red.testResults.flatMap((file) =>
      file.assertionResults.filter((test) => test.status === 'failed'),
    )
    assert.equal(failures.length, 1)
    const expected = proof.runs.find((run) => run.id === `${id}-new`).failed
    assert.deepEqual(
      failures.map((test) => test.fullName),
      expected.map((test) => test.fullName),
    )
    const source = fs.readFileSync(
      path.join(root, 'packages/game/src/present', proof.source),
      'utf8',
    )
    assert.equal(source.split(proof.from).length, 2)
    assert.equal(hash(source.replace(proof.from, proof.to)), proof.mutant)
    assert(failures[0].failureMessages.some((message) => message.startsWith('AssertionError:')))
    assert.equal(
      hash(fs.readFileSync(path.join(root, 'packages/game/src/present', proof.source))),
      proof.restoredSource,
    )
    assert.equal(
      hash(fs.readFileSync(path.join(root, 'packages/game/src/present', proof.test))),
      proof.restoredTest,
    )
  }
  const normalize = (file, text) => {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
    assert.equal(source.parseDiagnostics.length, 0)
    return ts.createPrinter({ removeComments: true }).printFile(source)
  }
  for (const record of report.body.records) {
    const old = execFileSync('git', ['show', `${report.base}:${record.file}`], {
      cwd: root,
      encoding: 'utf8',
    })
    let current = fs.readFileSync(path.join(root, record.file), 'utf8')
    assert.equal(hash(current), record.sha256)
    if (record.file.endsWith('/follower-pos.ts'))
      current = current.replace('  s.frozenOffset[m] =', '  if (s.walking) s.frozenOffset[m] =')
    assert.equal(normalize(record.file, old), normalize(record.file, current))
  }
  native('follower-v8-before', 16)
  native('follower-v8-after', 16)
  assert.deepEqual(json('follower-recount.json').delta, {
    statements: { covered: -1, total: -1 },
    functions: { covered: 0, total: 0 },
    branches: { covered: -1, total: -2 },
    lines: { covered: 0, total: 0 },
  })
  const checks = json('main-checks.stdout.raw').check_runs
  for (const name of ['documentation', 'fast-coverage']) {
    const check = checks.find((entry) => entry.name === name && entry.app.id === 15368)
    assert.equal(check.head_sha, report.base)
    assert.equal(check.conclusion, 'success')
    assert.equal(check.output.annotations_count, 0)
  }
  for (const id of ['main-docs', 'main-coverage']) {
    const audit = json(`${id}.audit.json`)
    assert.equal(hash(bytes(`${id}.stdout.raw`)), audit.sha256)
    assert.equal(audit.noticeCount, 0)
  }
  for (const id of report.integration.localGateIds) {
    const run = json(`${id}.execution.json`)
    assert.equal(run.exit, 0, id)
    assert.equal(run.signal, null, id)
    assert.equal(run.spawnError, null, id)
    assert.equal(bytes(`${id}.stderr.raw`).length, 0, id)
  }
  if (report.integration.state.startsWith('local gates passed')) {
    for (const id of ['module-check-final', 'module-ratchet']) {
      const audit = json(`${id}.audit.json`)
      assert.deepEqual(audit.diagnostics, [])
      assert.equal(audit.execution.exit, id === 'module-ratchet' ? 1 : 0)
      if (id === 'module-ratchet')
        assert.equal(bytes(`${id}.stderr.raw`).toString(), audit.policyRejection)
      if (audit.stdoutBlocks.changed.length) assert(audit.stdoutBlocks.reviewedTiming)
    }
    const protectedReport = json('module-protected-report.json')
    const summary = json('module-summary.json')
    assert.equal(hash(bytes('module-summary.json')), protectedReport.summarySha256)
    assert.equal(hash(bytes('module-baseline.after.json')), protectedReport.baselineAfterSha256)
    assert.equal(summary.testCount, 20160)
    assert.equal(summary.sourceFileCount, 774)
    assert.deepEqual(protectedReport.strict.regressions, [])
    assert.deepEqual(protectedReport.scope.changes, [])
    assert.deepEqual(protectedReport.protectedMetrics.regressions, [])
    assert.equal(protectedReport.protectedScope.removals.length, 5)
    assert.deepEqual(protectedReport.approvalsApplied, [
      'pre94-follower-walking-guard-recount-20261023',
    ])
    assert.deepEqual(json('module-check-final.audit.json').lintDiagnostics, {
      error: 0,
      warning: 0,
      info: 0,
    })
  }
  console.log(
    JSON.stringify({
      state: 'MATCH',
      files: report.files.length,
      tests: 90,
      controls: 4,
      integration: report.integration.state,
      limits:
        'Read-only identity/native/body check. A–H are scoped judgments; drawNumber and full3l remain review. No browser/coverage rerun or network.',
    }),
  )
}
