import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../../../../..')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const report = JSON.parse(fs.readFileSync(path.join(dir, 'review.json')))
const pins = [
  ...report.files,
  ...report.context,
  ...report.primary,
  ...(report.reusedPins ?? []),
  ...(report.gateInputs ?? []),
]
const stale = pins.filter((pin) => {
  const target = path.join(root, pin.path)
  return !fs.existsSync(target) || hash(fs.readFileSync(target)) !== pin.sha256
})
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', paths: stale.map((pin) => pin.path) }))
  process.exitCode = 2
} else {
  for (const file of report.files) assert.deepEqual(Object.keys(file.dimensions), [...'ABCDEFGH'])
  const archive = {}
  const fragments = new Map()
  for (const receipt of [...(report.receiptParts ?? []), ...(report.gateReceiptParts ?? [])]) {
    const bytes = fs.readFileSync(path.join(dir, receipt.path))
    assert.equal(hash(bytes), receipt.sha256)
    const entries = JSON.parse(gunzipSync(bytes))
    assert.equal(Object.keys(entries).length, receipt.entries)
    for (const [name, entry] of Object.entries(entries)) {
      assert(!archive[name], name)
      const raw = Buffer.from(entry.base64, 'base64')
      assert.equal(raw.length, entry.bytes)
      assert.equal(hash(raw), entry.sha256)
      if (entry.originalName) {
        const parts = fragments.get(entry.originalName) ?? []
        assert(!parts.some((part) => part.partIndex === entry.partIndex))
        parts.push({ ...entry, raw })
        fragments.set(entry.originalName, parts)
      } else archive[name] = raw
    }
  }
  for (const [name, parts] of fragments) {
    assert(!archive[name])
    parts.sort((a, b) => a.partIndex - b.partIndex)
    const first = parts[0]
    assert.equal(parts.length, first.partCount)
    parts.forEach((part, index) => {
      assert.equal(part.partIndex, index)
      assert.equal(part.partCount, first.partCount)
      assert.equal(part.originalBytes, first.originalBytes)
      assert.equal(part.originalSha256, first.originalSha256)
    })
    const raw = Buffer.concat(parts.map((part) => part.raw))
    assert.equal(raw.length, first.originalBytes)
    assert.equal(hash(raw), first.originalSha256)
    archive[name] = raw
  }
  const json = (name) => {
    assert(archive[name], name)
    return JSON.parse(archive[name])
  }
  const native = (id, failures, total) => {
    const result = json(`${id}.json`)
    const execution = json(`${id}.execution.json`)
    assert.equal(execution.exit, failures ? 1 : 0)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
    assert.equal(result.numTotalTests, total)
    assert.equal(result.numFailedTests, failures)
    assert.equal(result.numPassedTests, total - failures)
    assert.equal(result.numPendingTests, 0)
    assert.equal(result.numTodoTests, 0)
    if (!failures) assert.equal(archive[`${id}.stderr.raw`].length, 0)
    return result
  }
  native('rules-baseline', 0, 221)
  const red = native('lifecycle-boundaries-red', 5, 6)
  const green = native('directed-frozen', 0, 255)
  native('adjacent-green', 0, 1148)
  const identities = new Set(
    green.testResults.flatMap((f) => f.assertionResults.map((a) => a.fullName)),
  )
  const failures = red.testResults.flatMap((f) =>
    f.assertionResults.filter((a) => a.status === 'failed'),
  )
  for (const failure of failures) {
    assert(failure.failureMessages.some((message) => message.startsWith('AssertionError:')))
    const current = failure.fullName.replace(
      'captures the previous screen before the wrapper clears the first intro frame',
      'captures the previous screen through the production wrapper on the first intro frame',
    )
    assert(identities.has(current), current)
  }
  const freeze = json('freeze.json')
  for (const pin of freeze.files)
    assert.equal(hash(fs.readFileSync(path.join(root, pin.path))), pin.sha256)
  assert.equal(json('rules-proof-final.stdout.raw').equal, true)
  const browser = json('browser3.json')
  assert.equal(browser.frames[0].same, 64000)
  assert(Object.keys(browser.frames[0].counts).length > 16)
  assert(browser.frames.some((frame) => frame.intro?.step > 1))
  assert.deepEqual(browser.errors, [])
  assert.deepEqual(
    browser.logs.filter((entry) => ['warning', 'error'].includes(entry.type)),
    [],
  )
  for (const id of ['main-docs-log', 'main-coverage-log-retry2']) {
    const audit = json(`${id}.audit.json`)
    assert.equal(audit.head, report.base)
    assert.equal(audit.noticeCount, 0)
    assert.equal(hash(archive[`${id}.stdout.raw`]), audit.sha256)
  }
  const checks = json('main-ci-final.stdout.raw')
  assert.equal(checks.length, 2)
  assert(
    checks.every(
      (check) =>
        check.head_sha === report.base && check.conclusion === 'success' && check.annotations === 0,
    ),
  )
  if (report.gates.unified === 'passed') {
    for (const id of [
      report.gates.check.id,
      report.gates.ratchet.id,
      report.gates.protected.id,
      report.gates.documentation.id,
      report.gates.lint.id,
    ]) {
      const execution = json(`${id}.execution.json`)
      assert.equal(execution.exit, 0)
      assert.equal(execution.signal, null)
      assert.equal(execution.spawnError, null)
      assert.equal(archive[`${id}.stderr.raw`].length, 0)
    }
    for (const id of [report.gates.check.id, 'module-ratchet']) {
      const audit = json(`${id}.audit.json`)
      assert.deepEqual(audit.diagnostics, [])
      const reviewed = json('stdout-review.json').runs.find((run) => run.id === id)
      assert(reviewed)
      assert.deepEqual(audit.stdoutBlocks.changed, reviewed.changes)
    }
    assert.deepEqual(json(`${report.gates.check.id}.audit.json`).lintDiagnostics, {
      error: 0,
      warning: 0,
      info: 0,
    })
    const check = json(`${report.gates.check.id}.audit.json`)
    assert.equal(check.packageTestCount, report.gates.check.packageTests)
    assert.equal(check.toolTestCount, report.gates.check.toolTests)
    assert.equal(hash(archive[`${check.id}.stdout.raw`]), report.gates.check.rawSha256)
    const collection = json('module-ratchet.audit.json')
    assert.equal(collection.packageTestCount, report.gates.collection.tests)
    assert.equal(hash(archive['module-ratchet.stdout.raw']), report.gates.collection.rawSha256)
    const frozenSummary = gunzipSync(archive['official-summary.json.gz'])
    const summary = JSON.parse(frozenSummary)
    assert.equal(summary.testCount, report.gates.collection.tests)
    assert.equal(summary.sourceFileCount, report.gates.collection.sources)
    const policy = json('same-report-policy.json')
    assert.equal(policy.summarySha256, hash(frozenSummary))
    assert.equal(policy.sourceSha256, hash(fs.readFileSync(path.join(root, policy.source))))
    assert.equal(report.closedFiles.length, 7)
    assert.equal(report.files.filter((file) => file.decision === 'accept').length, 8)
  }
  console.log(
    JSON.stringify({
      state: report.state,
      files: report.files.length,
      gates: report.gates.unified,
      verified:
        'current pins, complete raw bytes, five business reds to frozen green, main CI logs, local browser frame provenance',
      limits:
        'Does not rerun tests or coverage, prove natural story reachability, or independently prove all eight semantic dimensions.',
    }),
  )
}
