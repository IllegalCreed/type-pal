import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const folder = path.dirname(fileURLToPath(import.meta.url)),
  root = path.resolve(folder, '../../../../..')
const hash = (b) => createHash('sha256').update(b).digest('hex')
const read = (name) => fs.readFileSync(path.resolve(root, name))
const json = (name) => JSON.parse(read(name))
const report = JSON.parse(fs.readFileSync(path.join(folder, 'review.json')))
const pins = [
  ...report.files,
  ...report.deltaOnly,
  ...report.context,
  ...report.inheritedReports,
  report.proofProducer,
]
const stale = pins.filter(
  (pin) => !fs.existsSync(path.resolve(root, pin.path)) || hash(read(pin.path)) !== pin.sha256,
)
if (stale.length) {
  console.log(
    JSON.stringify({
      state: 'STALE',
      paths: stale.map((x) => x.path),
      scope: 'Revalidate affected claims only; no broad reset or automatic retest.',
    }),
  )
  process.exitCode = 2
} else {
  for (const file of [...report.files, ...report.deltaOnly])
    assert.deepEqual(Object.keys(file.dimensions), [...'ABCDEFGH'])
  const unpack = (meta) => {
    const compressed = fs.readFileSync(path.join(folder, meta.path))
    assert.equal(hash(compressed), meta.sha256)
    const archive = new Map()
    for (const [name, item] of Object.entries(JSON.parse(gunzipSync(compressed)))) {
      const bytes = Buffer.from(item.base64, 'base64')
      assert.equal(bytes.length, item.bytes)
      assert.equal(hash(bytes), item.sha256)
      archive.set(name, bytes)
    }
    assert.equal(archive.size, meta.entries)
    return archive
  }
  const archive = unpack(report.receipts)
  const gates = JSON.parse(fs.readFileSync(path.join(folder, 'static.json')))
  const gateRaw = unpack(gates.receipts)
  for (const run of gates.runs) {
    const actual = JSON.parse(gateRaw.get(`${run.id}.execution.json`))
    assert.equal(actual.exit, 0)
    assert.equal(actual.signal, null)
    assert.equal(actual.spawnError, null)
    assert.equal(gateRaw.get(run.stderr).length, 0)
  }
  assert(
    gateRaw
      .get('lint-zero-corrected.stdout.raw')
      .toString()
      .includes('0 errors / 0 warnings / 0 infos'),
  )
  const native = (id, passed, failed, files, pending = 0) => {
    const execution = JSON.parse(archive.get(`${id}.execution.json`)),
      result = JSON.parse(archive.get(`${id}.vitest.json`))
    assert.equal(execution.exit, failed ? 1 : 0)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
    assert.equal(result.numPassedTests, passed)
    assert.equal(result.numFailedTests, failed)
    assert.equal(result.numPendingTests, pending)
    assert.equal(result.numTodoTests, 0)
    assert.equal(result.testResults.length, files)
    const cases = result.testResults.flatMap((f) => f.assertionResults)
    assert.equal(cases.length, passed + failed + pending)
    for (const test of cases.filter((t) => t.status === 'failed'))
      assert(
        test.failureMessages.length &&
          test.failureMessages.every((m) => m.startsWith('AssertionError:')),
      )
    if (!failed) {
      assert.equal(archive.get(`${id}.stderr.raw`).length, 0)
      assert(!/\b(?:stdout|stderr)\s*\|/.test(archive.get(`${id}.stdout.raw`).toString()))
    }
    return cases
  }
  const green = native('slice-identity-green', 35, 0, 4)
  const old = native('counter-global-old', 1, 0, 1, 10),
    counter = native('counter-global-new', 0, 1, 1, 10)
  assert.deepEqual(
    old.map((x) => x.fullName),
    counter.map((x) => x.fullName),
  )
  assert.equal(counter.filter((x) => x.status === 'failed').length, 1)
  const restored = JSON.parse(archive.get('counter-restore.json'))
  assert.equal(restored.restored, true)
  assert.equal(restored.temporaryCopiesRemoved, true)
  assert.equal(hash(read('packages/pal-extract/src/events/slice.ts')), restored.sourceSha256)
  assert.equal(
    hash(read('packages/pal-extract/src/events/slice.kimi-r1.test.ts')),
    restored.afterSpecSha256,
  )
  native('world-baseline', 6, 0, 1)
  native('world-adjacent', 39, 0, 6)
  const before = JSON.parse(archive.get('world-baseline.children.json')),
    after = JSON.parse(archive.get('world-adjacent.children.json'))
  assert.equal(before.length, 6)
  assert.equal(after.length, 6)
  const expected = [
    ['DATA.MKF', 1],
    ['RNG.MKF', 1],
    ['FBP.MKF', 1],
    ['unifont-cn.bdf', 0],
    ['MKF: chunk 3 out of range', 1],
    ['SSS chunk0: byte length 10 is not a multiple of 32', 1],
  ]
  for (const runs of [before, after])
    for (const [i, run] of runs.entries()) {
      assert.equal(run.exitCode, expected[i][1])
      assert.equal(run.signal, null)
      assert.equal(run.spawnError, null)
      assert(run.stderr.includes(expected[i][0]))
    }
  assert.equal(
    hash(read('packages/pal-extract/src/cli-isolated.glm-q.test.ts')),
    hash(archive.get('cli-isolated.original.ts')),
  )
  for (const id of ['extract-types', 'changed-static']) {
    assert.equal(JSON.parse(archive.get(`${id}.execution.json`)).exit, 0)
    assert.equal(archive.get(`${id}.stderr.raw`).length, 0)
  }
  const master = json('docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.json'),
    computed = { pending: 0, partial: 0, accept: 0 }
  assert.equal(master.cards.length, 83)
  assert.equal(new Set(master.cards.map((card) => card.id)).size, 83)
  for (const card of master.cards) {
    assert(['pending', 'partial', 'accept'].includes(card.currentReview))
    computed[card.currentReview]++
  }
  assert.deepEqual(
    master.currentReviewCounts,
    computed,
    'derived master rollup must match actual cards',
  )
  assert.equal(master.currentAccepted, computed.accept)
  assert.deepEqual(master.lastIncrementalReview.fixed83, computed)
  assert.equal(master.cards.find((c) => c.id === '3').currentAcceptance, true)
  const proof = JSON.parse(
    execFileSync(process.execPath, [path.join(folder, 'prove-world.mjs')], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    }),
  )
  assert.equal(proof.state, 'MATCH')
  console.log(
    JSON.stringify({
      state: 'MATCH',
      wholeFiles: report.files.length,
      deltaOnly: report.deltaOnly.map((f) => f.path),
      sliceTests: green.length,
      realCLI: 39,
      guardedMaster: computed,
      unifiedGates: 'DEFERRED',
      scope:
        'Pinned CODE3 and world writer contracts only; not fullCLI/pre94 or synthetic→real-asset certification.',
    }),
  )
}
