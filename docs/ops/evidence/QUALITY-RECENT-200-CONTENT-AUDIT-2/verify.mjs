import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const folder = new URL('./', import.meta.url)
const root = new URL('../../../../', import.meta.url)
const read = (name) => readFileSync(new URL(name, folder))
const json = (name) => JSON.parse(read(name).toString('utf8'))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const audit = json('audit.json')
const queue = json('queue.json')
const manifest = json('native-index.json')
assert.equal(sha(read(manifest.archive)), manifest.sha256)
const native = JSON.parse(gunzipSync(read(manifest.archive)).toString('utf8')).files
for (const file of manifest.files) {
  const bytes = Buffer.from(native[file.name], 'utf8')
  assert.equal(bytes.length, file.bytes, file.name)
  assert.equal(sha(bytes), file.sha256, file.name)
}

assert.equal(queue.entries.length, 200)
assert.equal(new Set(queue.entries.map((entry) => entry.originalPath)).size, 200)
assert.equal(audit.files.length, audit.scope.thisAudit)
const reviewed = new Set(audit.files.map((file) => file.path))
assert.equal(reviewed.size, audit.files.length)
for (const file of audit.files) {
  assert.equal(sha(readFileSync(new URL(file.path, root))), file.sha256, file.path)
  assert.deepEqual(Object.keys(file.axes), [...'ABCDEFGH'], file.path)
  assert.ok(
    Object.values(file.axes).every((value) => typeof value === 'string' && value.length > 20),
  )
  assert.equal(
    queue.entries.find((entry) => entry.path === file.path)?.status,
    'reviewed-in-current-window',
  )
}
for (const file of audit.adjacentStructure) {
  assert.equal(sha(readFileSync(new URL(file.path, root))), file.sha256, file.path)
}
for (const file of audit.dependencies) {
  assert.equal(sha(readFileSync(new URL(file.path, root))), file.sha256, file.path)
}
const prior = queue.entries.filter((entry) => entry.status === 'prior-47-reused')
assert.equal(prior.length, 47)
assert.ok(prior.every((entry) => !reviewed.has(entry.path)))
for (const entry of prior) {
  assert.equal(sha(readFileSync(new URL(entry.path, root))), entry.queueSnapshotSha256, entry.path)
}
assert.equal(
  queue.entries.filter((entry) => entry.status === 'queued-full-review').length,
  audit.scope.notAudited,
)
assert.equal(audit.scope.combinedAudited + audit.scope.notAudited, 200)

const result = (name) => JSON.parse(native[`${name}.native.json`])
const failures = (report) =>
  report.testResults
    .flatMap((file) => file.assertionResults)
    .filter((test) => test.status === 'failed')
for (const [name, passed] of [
  ['content-package-final', 1473],
  ['tileset-final', 3],
  ['reforge-neighbors', 36],
  ['editor-neighbors', 31],
  ['game-audio-preferences', 47],
  ['game-device-hosts', 16],
  ['game-stats-hold', 27],
  ['game-players', 22],
  ['extract-package-final', 412],
]) {
  const report = result(name)
  assert.equal(report.numFailedTests, 0, name)
  assert.equal(report.numPassedTests, passed, name)
  assert.equal(report.numPendingTests, 0, name)
  const execution = JSON.parse(native[`${name}.execution.json`])
  assert.equal(execution.exit, 0, name)
  assert.equal(execution.signal, null, name)
  assert.equal(native[`${name}.stderr.raw`], '', name)
}
for (const [name, positive] of [
  ['shop-formal-red', 1],
  ['locale-formal-red', 3],
]) {
  const report = result(name)
  const failed = failures(report)
  assert.equal(failed.length, 1, name)
  assert.equal(report.numPassedTests, positive, name)
  assert.match(failed[0].fullName, /constructor/)
  assert.match(failed[0].failureMessages[0], /^AssertionError:/)
}
assert.equal(failures(result('shop-caller-counter')).length, 1)
assert.equal(result('shop-message-counter-old').numFailedTests, 0)
assert.equal(failures(result('shop-message-counter-new')).length, 9)
// This disproving run stays a failed hypothesis, never relabelled as a successful counter.
assert.equal(result('shop-guard-counter-old').numFailedTests, 8)
assert.equal(result('png-counter-v2-old').numPassedTests, 1)
assert.equal(result('png-counter-v2-old').numFailedTests, 0)
const pngCounterFailure = failures(result('png-counter-v2-new'))
assert.equal(pngCounterFailure.length, 1)
assert.match(pngCounterFailure[0].fullName, /framesToOut 保留三个槽号/)
assert.match(pngCounterFailure[0].failureMessages[0], /^AssertionError:/)
for (const name of [
  'content-typecheck-r2',
  'neighbor-typecheck',
  'content-scoped-static-r2',
  'path-extraction-proof',
]) {
  const execution = JSON.parse(native[`${name}.execution.json`])
  assert.equal(execution.exit, 0, name)
  assert.equal(native[`${name}.stderr.raw`], '', name)
}
const ci = json('main-ci.json')
assert.equal(ci.head, audit.base)
assert.ok(
  ci.checkRuns.every(
    (run) => run.head_sha === ci.head && run.status === 'completed' && run.conclusion === 'success',
  ),
)
for (const log of ci.completeLogArchives) assert.equal(sha(read(log.path)), log.sha256, log.path)

console.log(
  JSON.stringify(
    {
      reviewedThisWindow: audit.files.length,
      reusedPrior: prior.length,
      queued: audit.scope.notAudited,
      nativeArtifacts: manifest.files.length,
      readOnlyRoot: fileURLToPath(root),
      meaning:
        'Identity, raw integrity and specified result checks only; A-H design judgments remain the recorded review. Uniform gates and publication have their own execution records.',
    },
    null,
    2,
  ),
)
