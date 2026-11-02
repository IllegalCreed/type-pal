import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const directory = dirname(fileURLToPath(import.meta.url))
const root = resolve(directory, '../../../..')
const json = (name) => JSON.parse(readFileSync(resolve(directory, name), 'utf8'))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const review = json('review.json')
for (const source of [...review.primaryFullReads, ...review.dependencies]) {
  assert.equal(
    hash(readFileSync(resolve(root, source.path))),
    source.sha256,
    `stale ${source.path}`,
  )
}
for (const file of review.primaryFullReads) {
  for (const axis of 'ABCDEFGH') assert.ok(file[axis]?.length > 35, `${file.path} missing ${axis}`)
}
const manifest = json('native-index.json')
const archive = readFileSync(resolve(directory, 'native.json.gz'))
assert.equal(hash(archive), manifest.sha256)
const entries = JSON.parse(gunzipSync(archive))
for (const member of manifest.members) {
  const bytes = Buffer.from(entries[member.name], 'utf8')
  assert.equal(bytes.length, member.bytes, member.name)
  assert.equal(hash(bytes), member.sha256, member.name)
}
const native = (name) => JSON.parse(entries[name])
const identities = (report) =>
  report.testResults.flatMap((file) => file.assertionResults.map((test) => test.fullName))
const original = native('baseline.vitest.json')
const final = native('final-directed-adjacent.vitest.json')
assert.equal(original.numPassedTests, 67)
assert.equal(final.numPassedTests, 102)
assert.equal(final.numFailedTests, 0)
assert.equal(final.numPendingTests, 0)
const finalNames = new Set(identities(final))
const primaryNames = final.testResults
  .filter((file) => review.primaryFullReads.some((source) => file.name.endsWith(source.path)))
  .flatMap((file) => file.assertionResults.map((test) => test.fullName))
assert.equal(primaryNames.length, 61)
assert.deepEqual(new Set(review.caseReview.map((test) => test.fullName)), new Set(primaryNames))
const mappings = json('identities.json').mapping
assert.deepEqual(new Set(mappings.map((row) => row.oldFullName)), new Set(identities(original)))
for (const row of mappings) {
  assert.ok(row.reason.length > 15)
  for (const target of row.currentFullNames) assert.ok(finalNames.has(target), target)
}
for (const id of ['final-directed-adjacent', 'typecheck-r1', 'biome-final']) {
  const run = native(`${id}.execution.json`)
  assert.equal(run.exit, 0, id)
  assert.equal(run.signal, null, id)
  assert.equal(run.spawnError, null, id)
  assert.equal(entries[`${id}.stderr.raw`], '', id)
  assert.doesNotMatch(
    entries[`${id}.stdout.raw`],
    /stderr\s*\||not wrapped in act|does not support act/,
  )
}
for (const axis of ['zero-height-cover', 'flush-first-pixel']) {
  for (const version of ['old', 'current']) {
    const id = `counter-r2-${axis}-${version}`
    const run = native(`${id}.execution.json`)
    const report = native(`${id}.vitest.json`)
    assert.equal(run.pending, 0)
    assert.equal(run.signal, null)
    assert.equal(run.spawnError, null)
    assert.equal(run.ownedTreeRemoved, true)
    assert.equal(report.numTotalTests, version === 'old' ? 67 : 61)
    const failed = report.testResults.flatMap((file) =>
      file.assertionResults.filter((test) => test.status === 'failed'),
    )
    assert.equal(failed.length, version === 'old' ? 0 : 1)
    assert.equal(run.exit, version === 'old' ? 0 : 1)
    if (version === 'current') {
      assert.deepEqual(
        failed.map((test) => test.fullName),
        run.failedFullNames,
      )
      const expected =
        axis === 'zero-height-cover'
          ? 'P0.b Y-sort + cover-tile cover-tile:零高度瓦片仍全画，但不在精灵队列中重画'
          : 'G04-D present 冻屏归属与调色板 G04-D08 flushToCanvas 按原点写入完整异色 RGBA，保留边界和索引缓冲'
      assert.equal(failed[0].fullName, expected)
      for (const source of review.primaryFullReads) {
        assert.equal(run.testFingerprints[source.path.split('/').at(-1)], source.sha256)
      }
      assert.ok(failed[0].failureMessages.every((message) => message.includes('AssertionError')))
      assert.equal(report.testResults.filter((file) => file.status === 'failed').length, 1)
    }
  }
}
assert.equal(native('counter-r2-source-conservation.json').equal, true)
console.log(
  'PASS: two A-H records, current dependencies, complete raw/native bytes, 67 identity mappings, 102 green and two old-green/current-single-business-red counters; no test/coverage rerun.',
)
