// Read-only receipt verification. MATCH is not semantic or unified-gate acceptance.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const here = new URL('./', import.meta.url)
const root = new URL('../../../../../', here)
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const read = (name) => readFileSync(new URL(name, here))
const review = JSON.parse(read('review.json'))
const archive = read(review.artifact.member)
assert.equal(hash(archive), review.artifact.sha256)
const native = JSON.parse(gunzipSync(archive)).members
assert.deepEqual(Object.keys(native).sort(), review.artifact.members.map((m) => m.name).sort())
for (const member of review.artifact.members) {
  const bytes = Buffer.from(native[member.name])
  assert.equal(bytes.length, member.bytes, member.name)
  assert.equal(hash(bytes), member.sha256, member.name)
}
for (const row of review.reusedEvidencePins ?? []) {
  assert.equal(
    hash(readFileSync(new URL(row.path, root))),
    row.sha256,
    `STALE evidence: ${row.path}`,
  )
}
for (const row of [...review.files, ...review.contextPins]) {
  assert.equal(hash(readFileSync(new URL(row.path, root))), row.sha256, `STALE: ${row.path}`)
}
for (const run of review.runs) {
  const meta = JSON.parse(native[`${run.id}.execution.json`])
  assert.equal(meta.exit, run.exit, run.id)
  assert.equal(meta.signal, null, run.id)
  assert.equal(meta.spawnError, null, run.id)
  for (const stream of ['stdout', 'stderr']) {
    const bytes = Buffer.from(native[meta[stream].member])
    assert.equal(bytes.length, meta[stream].bytes, `${run.id}/${stream}`)
    assert.equal(hash(bytes), meta[stream].sha256, `${run.id}/${stream}`)
  }
}
for (const [id, passed, failed] of [
  ['seven-pools-old-mutant', 5, 0],
  ['seven-pools-new-mutant', 4, 1],
  ['seven-pools-restored', 5, 0],
]) {
  const report = JSON.parse(native[`${id}.native.json`])
  assert.equal(report.numPassedTests, passed, id)
  assert.equal(report.numFailedTests, failed, id)
  assert.equal(report.numPendingTests, 0, id)
  const failures = report.testResults.flatMap((f) =>
    f.assertionResults.filter((t) => t.status === 'failed'),
  )
  assert.equal(failures.length, failed, id)
  if (failed) {
    assert.match(failures[0].fullName, /七池映射/)
    assert.match(failures[0].failureMessages.join('\n'), /AssertionError/)
  }
}
const h02 = review.files.find((f) => f.path.endsWith('battle-progression.glm-next-wave.test.ts'))
const fixtureProof = JSON.parse(native['h02-fixtures-counter.json'])
assert.equal(h02.sha256, fixtureProof.finalSha256)
for (const [id, passed, failed] of [
  ['h02-old-fixtures-level-oracle-red', 3, 2],
  ['h02-hydrated-fixtures-green', 5, 0],
  ['h02-hydrated-pool-mutant-red', 4, 1],
  ['h02-hydrated-restored', 5, 0],
]) {
  const report = JSON.parse(native[`${id}.native.json`])
  assert.equal(report.numPassedTests, passed, id)
  assert.equal(report.numFailedTests, failed, id)
  assert.equal(report.numPendingTests, 0, id)
  const failures = report.testResults.flatMap((f) =>
    f.assertionResults.filter((t) => t.status === 'failed'),
  )
  assert.equal(failures.length, failed, id)
  for (const failure of failures) {
    assert.match(failure.failureMessages.join('\n'), /AssertionError/)
    assert.match(
      failure.fullName,
      id.includes('pool-mutant') ? /七池映射/ : /无主升级但|主升级成立/,
    )
  }
}
if (review.ciRepair) {
  const repair = review.ciRepair
  assert.equal(hash(readFileSync(new URL(repair.file.path, root))), repair.file.sha256)
  assert.equal(
    hash(readFileSync(new URL(repair.additionalFile.path, root))),
    repair.additionalFile.sha256,
  )
  for (const pin of repair.contextPins) {
    assert.equal(hash(readFileSync(new URL(pin.path, root))), pin.sha256, pin.path)
  }
  for (const [id, passed, failed] of [
    ['ci-m05-held-old-red-v2', 1, 1],
    ['ci-m05-held-new-green-v2', 2, 0],
    ['ci-m05-restored-green-v2', 2, 0],
    ['ci-m05-adjacent', 26, 0],
    ['ci-two-tests-adjacent', 29, 0],
  ]) {
    const report = JSON.parse(native[`${id}.native.json`])
    assert.equal(report.numPassedTests, passed, id)
    assert.equal(report.numFailedTests, failed, id)
    assert.equal(report.numPendingTests, 0, id)
    const failures = report.testResults.flatMap((file) =>
      file.assertionResults.filter((test) => test.status === 'failed'),
    )
    assert.equal(failures.length, failed, id)
    if (failed) {
      assert.match(failures[0].fullName, /待机毫秒\/帧 40ms/)
      assert.match(
        failures[0].failureMessages.join('\n'),
        /AssertionError: expected true to be false/,
      )
    } else assert.equal(native[`${id}.stderr.raw`], '', id)
  }
  const mapping = JSON.parse(native[repair.assertionMapping])
  assert.equal(mapping.oldCount, 15)
  assert.equal(mapping.newCount, 15)
  assert.deepEqual(
    mapping.old.map((assertion) => assertion.replace('Math.max(1, Math.round(120 / 40))', '3')),
    mapping.current,
  )
  const bodyProof = JSON.parse(native[repair.k06.proof])
  assert.equal(bodyProof.cases, 8)
  assert.equal(bodyProof.identitiesUnchanged, true)
  assert.equal(bodyProof.oldBusinessBodiesUnchanged, true)
  for (const [id, warnings] of [
    ['ci-k06-raf-old-diagnostics', 5],
    ['ci-k06-raf-new-zero', 0],
    ['ci-k06-restored-zero', 0],
  ]) {
    const report = JSON.parse(native[`${id}.native.json`])
    const diagnostics = JSON.parse(native[`${id}.diagnostics.json`])
    assert.equal(report.numPassedTests, 1, id)
    assert.equal(report.numFailedTests, 0, id)
    assert.equal(report.numPendingTests, 7, id)
    assert.equal(diagnostics.actWarnings, warnings, id)
    assert.equal((native[`${id}.stderr.raw`].match(/not wrapped in act/g) ?? []).length, warnings)
  }
  const failedRun = JSON.parse(native[repair.failedMain.receipt])
  assert.equal(failedRun.conclusion, 'failure')
  assert.equal(failedRun.failure.failed, 1)
  assert.equal(failedRun.failure.testCount, 4781)
  assert.equal(hash(Buffer.from(native[repair.failedMain.raw])), failedRun.rawSha256)
  const official = JSON.parse(native[`${repair.officialRun}.execution.json`])
  assert.equal(official.exit, 0)
  assert.equal(official.signal, null)
  assert.equal(official.stderr.bytes, 0)
  const protectedProof = JSON.parse(native[repair.protected])
  assert.equal(protectedProof.exactCanonicalProjection, true)
  assert.deepEqual(protectedProof.strictCoverage.regressions, [])
  assert.deepEqual(protectedProof.strictScope.changes, [])
  assert.deepEqual(protectedProof.protectedCoverage.regressions, [])
}
console.log(
  JSON.stringify({
    result: 'MATCH',
    packet: fileURLToPath(here),
    files: review.files.length,
    members: review.artifact.members.length,
    closures: review.newClosures,
    scope: 'Source pins, complete native bytes and specified outcomes only; no tests rerun.',
    limits: review.notRun,
  }),
)
