import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
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

  const before = native('numbers-before', 0, 13)
  assert.equal(before.testResults.length, 2)
  const red = native('nonfinite-red-valid', 2, 4)
  const green = native('numbers-green', 0, 17)
  assert.equal(green.testResults.length, 3)
  assert.equal(native('adjacent-green', 0, 77).testResults.length, 16)
  native('mask-old', 0, 5)
  const mask = native('mask-new', 1, 5)
  const identities = new Set(
    green.testResults.flatMap((f) => f.assertionResults.map((a) => a.fullName)),
  )
  assert.equal(identities.size, 17)
  const beforeNames = before.testResults.flatMap((f) => f.assertionResults.map((a) => a.fullName))
  assert.equal(new Set(beforeNames).size, 13)
  for (const name of beforeNames) assert(identities.has(name), name)
  const catalogPath = 'docs/testing/catalog.json'
  const priorCatalog = JSON.parse(
    execFileSync('git', ['show', `${report.base}:${catalogPath}`], {
      cwd: root,
      encoding: 'utf8',
    }),
  )
  const catalog = JSON.parse(fs.readFileSync(path.join(root, catalogPath)))
  const oldStage = priorCatalog.entries.find((entry) => entry.id === 'e2e-006')
  const stage = catalog.entries.find((entry) => entry.id === 'e2e-006')
  assert.equal(stage.reviewBy, report.gateMaintenance.reviewBy)
  assert.equal(stage.status, 'rework')
  assert.equal(stage.lastVerified, '2026-10-03')
  const allowedStage = { ...oldStage, reviewBy: stage.reviewBy, reviewScope: stage.reviewScope }
  assert.deepEqual(stage, allowedStage)
  assert.deepEqual(catalog, {
    ...priorCatalog,
    entries: priorCatalog.entries.map((entry) => (entry.id === 'e2e-006' ? stage : entry)),
  })
  for (const failure of red.testResults.flatMap((f) =>
    f.assertionResults.filter((a) => a.status === 'failed'),
  )) {
    assert(failure.failureMessages.some((m) => m.startsWith('AssertionError:')))
    assert(identities.has(failure.fullName))
  }
  const maskFailures = mask.testResults.flatMap((f) =>
    f.assertionResults.filter((a) => a.status === 'failed'),
  )
  assert.equal(maskFailures.length, 1)
  assert(maskFailures[0].fullName.includes('G05-C01'))
  assert(maskFailures[0].failureMessages[0].startsWith('AssertionError:'))
  const restoration = json('mask-restoration.json')
  assert(restoration.restored)
  for (const key of ['helper', 'test'])
    assert.equal(
      hash(fs.readFileSync(path.join(root, restoration[key]))),
      restoration[`${key}Sha256`],
    )
  for (const pin of json('freeze.json').files) {
    const current = fs.readFileSync(path.join(root, pin.path))
    if (pin.path === report.commentDelta?.path) {
      const delta = report.commentDelta
      assert.equal(delta.path, 'packages/game/src/present/draw-number.ts')
      assert.equal(delta.beforeCandidate, 'f2d4ba3b998667e6a3a46222c2849a411ecdfe2f')
      assert.equal(delta.oldUrl, '../../../reference/sdlpal/ui.c')
      assert.equal(delta.newUrl, '../../../../reference/sdlpal/ui.c')
      const before = execFileSync('git', ['show', `${delta.beforeCandidate}:${pin.path}`], {
        cwd: root,
        encoding: 'utf8',
      })
      assert.equal(hash(before), pin.sha256)
      assert.equal(pin.sha256, delta.beforeSha256)
      assert.equal(before.split(delta.oldUrl).length, 2)
      assert.equal(current.toString(), before.replace(delta.oldUrl, delta.newUrl))
      assert.equal(hash(current), delta.afterSha256)
      assert(fs.existsSync(path.resolve(root, path.dirname(pin.path), delta.newUrl)))
    } else assert.equal(hash(current), pin.sha256)
  }
  assert.equal(json('refactor-proof.stdout.raw').equal, true)
  for (const id of ['main-docs-log', 'main-coverage-log']) {
    const audit = json(`${id}.audit.json`)
    assert.equal(audit.head, report.base)
    assert.equal(audit.noticeCount, 0)
    assert.equal(hash(archive[`${id}.stdout.raw`]), audit.sha256)
  }
  const checks = json('main-checks.stdout.raw')
  assert.equal(checks.length, 2)
  assert(
    checks.every(
      (c) => c.head_sha === report.base && c.conclusion === 'success' && c.annotations === 0,
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
      assert.deepEqual(
        audit.stdoutBlocks.changed,
        json('stdout-review.json').runs.find((r) => r.id === id).changes,
      )
    }
    const audit = json(`${report.gates.check.id}.audit.json`)
    assert.equal(audit.packageTestCount, report.gates.check.packageTests)
    assert.equal(audit.toolTestCount, report.gates.check.toolTests)
    assert.deepEqual(audit.lintDiagnostics, { error: 0, warning: 0, info: 0 })
    const summary = gunzipSync(archive['official-summary.json.gz'])
    assert.equal(JSON.parse(summary).testCount, report.gates.collection.tests)
    assert.equal(JSON.parse(summary).sourceFileCount, report.gates.collection.sources)
    assert.equal(hash(summary), json('same-report-policy.json').summarySha256)
  }
  console.log(
    JSON.stringify({
      state: report.state,
      files: report.files.length,
      gates: report.gates.unified,
      verified:
        'pins, complete raw parts, exact native red/green/control identities and main CI logs',
      limits:
        'Does not rerun tests/coverage, certify semantic A–H automatically or prove browser/natural-story reachability.',
    }),
  )
}
