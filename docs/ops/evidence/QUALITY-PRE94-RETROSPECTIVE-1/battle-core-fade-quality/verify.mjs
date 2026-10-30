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
const stale = [...report.files, ...report.context, ...report.primary].filter((pin) => {
  const target = path.join(root, pin.path)
  return !fs.existsSync(target) || hash(fs.readFileSync(target)) !== pin.sha256
})
if (stale.length) {
  console.log(
    JSON.stringify({
      state: 'STALE',
      paths: stale.map((pin) => pin.path),
      scope: 'Only related claims need revalidation; unrelated pinned evidence is retained.',
    }),
  )
  process.exitCode = 2
} else {
  for (const file of report.files) assert.deepEqual(Object.keys(file.dimensions), [...'ABCDEFGH'])
  const archive = new Map()
  for (const receipt of [report.receipts, ...(report.additionalReceipts ?? [])]) {
    const compressed = fs.readFileSync(path.join(dir, receipt.path))
    assert.equal(hash(compressed), receipt.sha256)
    const entries = JSON.parse(gunzipSync(compressed))
    assert.equal(Object.keys(entries).length, receipt.entries)
    for (const [name, entry] of Object.entries(entries)) {
      assert(!archive.has(name), name)
      const bytes = Buffer.from(entry.base64, 'base64')
      assert.equal(bytes.length, entry.bytes, name)
      assert.equal(hash(bytes), entry.sha256, name)
      archive.set(name, bytes)
    }
  }
  const json = (name) => {
    assert(archive.has(name), name)
    return JSON.parse(archive.get(name))
  }
  const native = (id, pass, fail, files) => {
    const execution = json(`${id}.execution.json`)
    assert.equal(execution.exit, fail ? 1 : 0)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
    const result = json(`${id}.vitest.json`)
    assert.equal(result.numPassedTests, pass)
    assert.equal(result.numFailedTests, fail)
    assert.equal(result.numTotalTests, pass + fail)
    assert.equal(result.numPendingTests, 0)
    assert.equal(result.numTodoTests, 0)
    assert.equal(result.testResults.length, files)
    const cases = result.testResults.flatMap((file) => file.assertionResults)
    assert.equal(cases.length, pass + fail)
    for (const item of cases.filter((item) => item.status === 'failed')) {
      assert(item.failureMessages.length > 0)
      assert(item.failureMessages.every((message) => message.startsWith('AssertionError:')))
    }
    if (!fail) assert.equal(archive.get(`${id}.stderr.raw`).length, 0)
    return cases
  }
  const red = native('numeric-final-red-replay', 1, 4, 1)
  const green = native('final-numeric-tests', 5, 0, 1)
  assert.deepEqual(
    red.map((item) => item.fullName),
    green.map((item) => item.fullName),
  )
  native('baseline-core', 109, 0, 9)
  native('adjacent', 626, 0, 17)
  native('adjacent-missing', 271, 0, 6)
  native('word-overlay-fallback', 3, 0, 1)
  for (const id of [
    'final-typecheck',
    'e2e-adjacent',
    'retirement-tools-final',
    'body-proof',
    'numeric-red-audit',
  ]) {
    assert.equal(json(`${id}.execution.json`).exit, 0)
    assert.equal(archive.get(`${id}.stderr.raw`).length, 0)
  }
  const restore = json('red-restore.json')
  assert.equal(restore.restored, true)
  assert.equal(hash(fs.readFileSync(path.join(root, restore.source))), restore.candidateSha256)
  assert.equal(archive.get('native-O0.stdout.raw').compare(archive.get('native-O2.stdout.raw')), 0)
  assert.equal(
    archive
      .get('native-resistance.stdout.raw')
      .compare(archive.get('native-resistance-O0.stdout.raw')),
    0,
  )
  assert.equal(json('compare-resistance-final.stdout.raw').mismatches, 0)
  for (const id of ['main-docs', 'main-coverage']) {
    const audit = json(`${id}.audit.json`)
    assert.equal(audit.head, report.base)
    assert.equal(audit.noticeCount, 0)
    assert.equal(hash(archive.get(`${id}.stdout.raw`)), audit.sha256)
  }
  for (const id of ['docs-local-final', 'final-lint', 'final-tc']) {
    assert.equal(json(`${id}.execution.json`).exit, 0)
    assert.equal(archive.get(`${id}.stderr.raw`).length, 0)
  }
  assert.match(archive.get('final-lint.stdout.raw').toString(), /0 errors \/ 0 warnings \/ 0 infos/)
  assert(archive.get('docs-local-final.stdout.raw').toString().includes('docs: PASS (0 issues)'))
  const metadataStale = report.documentBindingHistory.filter((binding) => {
    const record = JSON.parse(fs.readFileSync(path.join(root, binding.record)))
    const entry = record.entries.find((entry) => entry.path === binding.path)
    return (
      entry?.afterSha256 !== binding.afterSha256 ||
      hash(fs.readFileSync(path.join(root, binding.path))) !== binding.afterSha256
    )
  })
  console.log(
    JSON.stringify({
      state: metadataStale.length ? 'CODE_MATCH_METADATA_STALE' : 'MATCH',
      metadataStale: metadataStale.map((binding) => binding.path),
      files: report.files.length,
      rawEntries: archive.size,
      businessRed: 4,
      green: 5,
      adjacentFiles: 23,
      adjacentCases: 897,
      unifiedGates: 'DEFERRED until all remaining pre94 resolved; no PR/integration credit',
      limits:
        'Source identity, original results and specified mappings checked; authored A–H reasoning is not automatically certified.',
    }),
  )
  if (metadataStale.length) process.exitCode = 2
}
