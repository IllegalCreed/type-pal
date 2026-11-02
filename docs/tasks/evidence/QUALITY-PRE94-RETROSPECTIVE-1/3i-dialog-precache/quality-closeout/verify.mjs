import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../../../../../..')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const report = JSON.parse(fs.readFileSync(path.join(dir, 'review.json')))
const bridge = report.currentVersionBridge
const runnerBridge = report.runnerVersionBridge
const effectiveSha = (file, previous) => {
  const pin = [...(bridge?.pins ?? []), ...(runnerBridge?.pins ?? [])].find(
    (entry) => entry.path === file,
  )
  if (!pin) return previous
  assert.equal(pin.beforeSha256, previous)
  return pin.sha256
}
const pins = [...report.files, ...report.dependencies, ...report.inputs].map((pin) => ({
  ...pin,
  sha256: effectiveSha(pin.path, pin.sha256),
}))
const stale = pins.filter((pin) => {
  const file = path.join(root, pin.path)
  return !fs.existsSync(file) || hash(fs.readFileSync(file)) !== pin.sha256
})
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', paths: stale.map((pin) => pin.path) }))
  process.exitCode = 2
} else {
  const archive = fs.readFileSync(path.join(dir, report.receipts.path))
  assert.equal(hash(archive), report.receipts.sha256)
  const entries = JSON.parse(gunzipSync(archive))
  if (bridge) {
    const bytes = fs.readFileSync(path.join(dir, bridge.path))
    assert.equal(hash(bytes), bridge.sha256)
    const amendment = JSON.parse(bytes)
    assert.deepEqual(amendment.pins, bridge.pins)
    assert.equal(amendment.proof.allSevenOracleArgumentsIdentical, true)
    assert.equal(amendment.proof.allOtherParsedStatementsEqual, true)
    assert.equal(amendment.probes.productSourceRestored, true)
    assert.equal(amendment.probes.liveSkipMutant.failed, 1)
    const extra = fs.readFileSync(path.join(dir, amendment.receipts.path))
    assert.equal(hash(extra), amendment.receipts.sha256)
    for (const [name, item] of Object.entries(JSON.parse(gunzipSync(extra)))) {
      if (entries[name]) assert.deepEqual(entries[name], item)
      else entries[name] = item
    }
  }
  if (runnerBridge) {
    const bytes = fs.readFileSync(path.join(dir, runnerBridge.path))
    assert.equal(hash(bytes), runnerBridge.sha256)
    const amendment = JSON.parse(bytes)
    assert.deepEqual(amendment.pins, runnerBridge.pins)
    const extra = fs.readFileSync(path.join(dir, amendment.receipts.path))
    assert.equal(hash(extra), amendment.receipts.sha256)
    for (const [name, item] of Object.entries(JSON.parse(gunzipSync(extra)))) {
      if (entries[name]) assert.deepEqual(entries[name], item)
      else entries[name] = item
    }
    for (const pin of amendment.pins) {
      const current = fs.readFileSync(path.join(root, pin.path))
      assert.equal(
        hash(
          Buffer.from(
            current.toString().replace('runs-on: ubuntu-24.04', 'runs-on: ubuntu-latest'),
          ),
        ),
        pin.beforeSha256,
      )
    }
  }
  const attachment = (name) => {
    const item = entries[name]
    assert(item, `Missing attachment: ${name}`)
    const bytes = Buffer.from(item.base64, 'base64')
    assert.equal(bytes.length, item.bytes)
    assert.equal(hash(bytes), item.sha256)
    return bytes
  }
  for (const name of Object.keys(entries)) attachment(name)
  const json = (name) => JSON.parse(attachment(name))
  if (runnerBridge) {
    const ready = json('pr-r2-ready.stdout.raw')
    assert.equal(ready.headRefOid, 'b658febc416ba7fa75c7d00cbd9821f801daba90')
    const checks = json('pr-r2-required-checks.stdout.raw').check_runs
    for (const [kind, name] of [
      ['docs', 'documentation'],
      ['coverage', 'fast-coverage'],
    ]) {
      const check = checks.find((entry) => entry.name === name && entry.app.id === 15368)
      assert.equal(check.head_sha, ready.headRefOid)
      assert.equal(check.conclusion, 'success')
      const annotations = json(`pr-r2-${kind}-annotations-retry.stdout.raw`)
      assert.equal(annotations.length, check.output.annotations_count)
      assert.equal(annotations.length, 1)
      assert.equal(annotations[0].annotation_level, 'notice')
      assert.match(annotations[0].message, /ubuntu-latest.*Ubuntu 26/)
      const raw = attachment(`pr-r2-${kind}-log.stdout.raw`).toString()
      assert.match(raw, /Image: ubuntu-24\.04/)
      assert.doesNotMatch(raw, /DeprecationWarning|##\[(?:warning|error)\]|not wrapped in act/)
    }
  }
  const nativeResult = (id, passed, failed, expectedNames) => {
    const native = json(`${id}.native.json`)
    const execution = json(`${id}.execution.json`)
    assert.equal(execution.exit, failed ? 1 : 0)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
    assert.equal(native.numPassedTests, passed)
    assert.equal(native.numFailedTests, failed)
    assert.equal(native.numPendingTests, 0)
    const errors = native.testResults.flatMap((file) =>
      file.assertionResults.filter((test) => test.status === 'failed'),
    )
    assert.equal(errors.length, failed)
    if (expectedNames)
      assert.deepEqual(
        errors.map((test) => test.fullName),
        expectedNames,
      )
    if (failed) assert.match(attachment(`${id}.stderr.raw`).toString(), /AssertionError/)
    else assert.equal(attachment(`${id}.stderr.raw`).length, 0)
  }
  for (const [id, passed] of [
    ['before-shell', 52],
    ['directed-restored', 52],
    ['adjacent-shell', 61],
    ['ui-v8-before', 35],
    ['ui-v8-after', 35],
  ])
    nativeResult(id, passed, 0)
  if (bridge) {
    nativeResult('ci-rework-final-directed', 28, 0)
    for (const id of ['ci-rework-final-types', 'ci-rework-final-lint', 'ci-rework-final-docs']) {
      const execution = json(`${id}.execution.json`)
      assert.equal(execution.exit, 0)
      assert.equal(execution.signal, null)
      assert.equal(execution.spawnError, null)
      assert.equal(attachment(`${id}.stderr.raw`).length, 0)
    }
    nativeResult('ci-rework-bytes-skip-mutant', 1, 1, [
      'playTrademarkFallback — SDLPal PAL_TrademarkScreen DOS sequence 显式允许 Space：停在首帧、淡至全黑并释放按键监听',
    ])
    nativeResult('ci-rework-bytes-skip-restored', 2, 0)
    nativeResult('ci-byte-comparator-v2', 1, 0)
  }
  for (const control of report.controls.reports) {
    for (const row of control.rows) {
      nativeResult(
        row.id,
        row.passed,
        row.failed,
        row.failedIdentities.map((f) => f.fullName),
      )
    }
    assert.equal(control.sourceRestored, true)
    assert.equal(control.testsRestored, true)
  }
  const fixture = json('ui-ownership-r2-report.json')
  for (const run of fixture.results)
    nativeResult(run.id, run.passed, run.failed, run.failedFullNames)
  assert.equal(fixture.temporarySpecRemoved, true)
  for (const file of report.files)
    assert.deepEqual(Object.keys(file.dimensions), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
  for (const file of report.body.records)
    assert.equal(
      hash(fs.readFileSync(path.join(root, file.file))),
      effectiveSha(file.file, file.afterSha256),
    )
  assert.equal(report.body.postCounterBridge.bodyUnchanged, true)
  const { approvedTestRetirements } = await import(
    pathToFileURL(path.join(root, 'scripts/coverage/approved-test-retirements.mjs'))
  )
  assert.deepEqual(
    approvedTestRetirements.find((entry) => entry.file === report.retirement.entry.file),
    report.retirement.entry,
  )
  assert.equal(approvedTestRetirements.length, 53)
  assert.equal(report.recount.sourceRestored, true)
  for (const metric of ['statements', 'branches', 'functions', 'lines'])
    assert.equal(report.recount.delta[metric].covered, report.recount.delta[metric].total)
  for (const workflow of report.workflow.reports) {
    assert.equal(
      hash(fs.readFileSync(path.join(root, workflow.file))),
      effectiveSha(workflow.file, workflow.afterSha256),
    )
    assert.equal(workflow.allOtherYamlFieldsUnchanged, true)
    for (const action of workflow.changes) assert.equal(action.runtime, 'node24')
  }
  if (report.integration.state === 'passed') {
    for (const id of report.integration.successfulExecutionIds) {
      const execution = json(`${id}.execution.json`)
      assert.equal(execution.exit, 0)
      assert.equal(execution.signal, null)
      assert.equal(execution.spawnError, null)
      assert.equal(attachment(`${id}.stderr.raw`).length, 0)
    }
    const protectedResult = json('module-protected-report.json')
    assert.deepEqual(protectedResult.strict.regressions, [])
    assert.deepEqual(protectedResult.scope.changes, [])
    assert.deepEqual(protectedResult.protectedMetrics.regressions, [])
    assert.deepEqual(
      protectedResult.protectedScope.removals.map((r) => r.value),
      [report.retirement.entry.file],
    )
    const text = attachment('module-check.stdout.raw')
      .toString()
      .replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'), '')
    const count = (pattern) => Array.from(text.matchAll(pattern), (match) => Number(match[1]))
    assert.deepEqual(count(/^\s*Tests\s+(\d+) passed/gm), report.integration.check.packageCounts)
    assert.deepEqual(count(/^# tests (\d+)$/gm), report.integration.check.toolCounts)
  }
  console.log(
    JSON.stringify({
      state: 'MATCH',
      files: report.files.length,
      receipts: Object.keys(entries).length,
      integration: report.integration.state,
      currentGateState: runnerBridge?.gateState ?? bridge?.gateState ?? report.integration.state,
      limits:
        'Read-only identity/result/integrity check; A-H semantic judgments remain explicit in review.json. No SUT, network, coverage or writes.',
    }),
  )
}
