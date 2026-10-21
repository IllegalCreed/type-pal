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
