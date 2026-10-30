import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../../../../..')
const read = (p) => JSON.parse(fs.readFileSync(p))
const hash = (b) => createHash('sha256').update(b).digest('hex')
const report = read(path.join(dir, 'review.json'))
const stale = [
  ...report.files,
  ...report.context,
  ...report.primary,
  ...(report.gateInputs ?? []),
].filter((pin) => {
  const file = path.join(root, pin.path)
  return !fs.existsSync(file) || hash(fs.readFileSync(file)) !== pin.sha256
})
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', paths: stale.map((pin) => pin.path) }))
  process.exitCode = 2
} else {
  for (const file of report.files) assert.deepEqual(Object.keys(file.dimensions), [...'ABCDEFGH'])
  const archive = {}
  for (const receipt of [report.receipts, report.gateReceipts].filter(Boolean)) {
    const packed = fs.readFileSync(path.join(dir, receipt.path))
    assert.equal(hash(packed), receipt.sha256)
    const part = JSON.parse(gunzipSync(packed))
    assert.equal(Object.keys(part).length, receipt.entries)
    for (const [name, entry] of Object.entries(part)) {
      assert(!archive[name], name)
      archive[name] = entry
    }
  }
  for (const entry of Object.values(archive)) {
    const b = Buffer.from(entry.base64, 'base64')
    assert.equal(b.length, entry.bytes)
    assert.equal(hash(b), entry.sha256)
  }
  const bytes = (name) => {
    assert(archive[name], name)
    return Buffer.from(archive[name].base64, 'base64')
  }
  const json = (name) => JSON.parse(bytes(name))
  const native = (id, failed = 0) => {
    const n = json(`${id}.json`)
    const e = json(`${id}.execution.json`)
    assert.equal(n.numPendingTests, 0)
    assert.equal(n.numTodoTests, 0)
    assert.equal(n.numFailedTests, failed)
    assert.equal(n.numPassedTests, n.numTotalTests - failed)
    assert.equal(e.exit, failed ? 1 : 0)
    assert.equal(e.signal, null)
    assert.equal(e.spawnError, null)
    assert(e.args.includes('--reporter=default'))
    if (!failed) assert.equal(bytes(`${id}.stderr.raw`).length, 0)
    return n
  }
  assert.equal(native('baseline-module').numTotalTests, 187)
  const current = native('adjacent')
  assert.equal(current.numTotalTests, 664)
  assert.equal(current.testResults.length, 82)
  assert.equal(json('final-typecheck.execution.json').exit, 0)
  assert.equal(bytes('final-typecheck.stderr.raw').length, 0)
  for (const id of report.controls) {
    native(`old-${id}`)
    const n = native(`final-${id}`, 1)
    const proof = json(`final-${id}.counter.json`)
    const failed = n.testResults.flatMap((f) =>
      f.assertionResults.filter((a) => a.status === 'failed'),
    )
    assert.deepEqual(
      failed.map((a) => a.fullName),
      proof.failed.map((a) => a.name),
    )
    assert(failed[0].failureMessages.some((message) => message.startsWith('AssertionError:')))
    assert.equal(hash(fs.readFileSync(path.join(root, proof.source))), proof.restoredSha256)
    assert.equal(proof.sourceSha256, proof.restoredSha256)
    assert.equal(hash(fs.readFileSync(path.join(root, proof.test))), proof.testSha256)
    assert(bytes(`final-${id}.patch`).length > 0)
  }
  const contracts = read(path.join(dir, 'contracts.json'))
  assert.equal(contracts.mapping.length, 187)
  assert.equal(contracts.mapping.filter((row) => row.kind === 'retired').length, 26)
  const identities = new Set(
    current.testResults.flatMap((f) =>
      f.assertionResults.map(
        (a) =>
          `${path.relative(root, f.name)} :: project root :: ${[...a.ancestorTitles, a.title].join(' > ')}`,
      ),
    ),
  )
  for (const row of contracts.mapping) {
    assert(row.basis)
    for (const identity of row.current) assert(identities.has(identity), identity)
  }
  for (const id of ['main-docs-log-retry', 'main-coverage-log-retry']) {
    const audit = json(`${id}.audit.json`)
    assert.equal(audit.head, report.base)
    assert.equal(audit.noticeCount, 0)
    assert.equal(hash(bytes(`${id}.stdout.raw`)), audit.sha256)
  }
  if (report.gates.unified === 'passed') {
    for (const id of ['module-check', report.gates.ratchet.id, report.gates.protected.id]) {
      const execution = json(`${id}.execution.json`)
      assert.equal(execution.exit, 0)
      assert.equal(execution.signal, null)
      assert.equal(execution.spawnError, null)
      assert.equal(bytes(`${id}.stderr.raw`).length, 0)
    }
    const check = json('module-check.audit.json')
    assert.deepEqual(check.diagnostics, [])
    assert.deepEqual(check.lintDiagnostics, { error: 0, warning: 0, info: 0 })
    assert.equal(check.packageTestCount, report.gates.check.packageTests)
    assert.equal(check.toolTestCount, report.gates.check.toolTests)
    const collection = json('module-ratchet.audit.json')
    assert.deepEqual(collection.diagnostics, [])
    assert.equal(collection.packageTestCount, report.gates.collection.tests)
    assert.equal(hash(bytes('module-check.stdout.raw')), report.gates.check.rawSha256)
    assert.equal(hash(bytes('module-ratchet.stdout.raw')), report.gates.collection.rawSha256)
    const structural = json('pure-refactor-proof.json')
    assert.equal(structural.base, report.base)
    assert.equal(
      hash(fs.readFileSync(path.join(root, structural.sprite.path))),
      structural.sprite.currentSha256,
    )
    assert.equal(
      hash(fs.readFileSync(path.join(root, structural.sharedBlit.current))),
      structural.sharedBlit.currentSha256,
    )
  }
  console.log(
    JSON.stringify({
      state: 'MATCH',
      files: report.files.length,
      controls: report.controls.length,
      retired: 26,
      integration: report.gates.unified,
      limits: report.limitations,
    }),
  )
}
