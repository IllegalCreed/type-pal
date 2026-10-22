import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { gunzipSync } from 'node:zlib'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../../../../../..')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const read = (file) => fs.readFileSync(path.join(dir, file))
const report = JSON.parse(read('review.json'))
const stale = []
for (const pin of [
  ...report.files,
  ...report.dependencies,
  ...report.inputs,
  ...report.integration.frozen.files,
]) {
  const absolute = path.join(root, pin.path)
  if (!fs.existsSync(absolute) || hash(fs.readFileSync(absolute)) !== pin.sha256)
    stale.push(pin.path)
}
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', paths: stale }))
  process.exitCode = 2
} else {
  const archive = read(report.receipts.path)
  assert.equal(hash(archive), report.receipts.sha256)
  const entries = JSON.parse(gunzipSync(archive))
  const artifact = (name) => {
    const entry = entries[name]
    assert(entry, `missing attachment ${name}`)
    const bytes = Buffer.from(entry.base64, 'base64')
    assert.equal(bytes.length, entry.bytes)
    assert.equal(hash(bytes), entry.sha256)
    return bytes
  }
  for (const name of Object.keys(entries)) artifact(name)
  const json = (name) => JSON.parse(artifact(name))
  for (const [id, passed, failed] of [
    ['before-game', 63, 0],
    ['after-game', 59, 0],
    ['before-shared', 51, 0],
    ['after-shared', 51, 0],
    ['adjacent-game', 213, 0],
    ['ownership-before', 6, 1],
    ['ownership-after', 6, 1],
    ['fm-before', 3, 0],
    ['fm-after', 3, 0],
    ['fm-after-v2', 2, 1],
  ]) {
    const native = json(`${id}.native.json`)
    const execution = json(`${id}.execution.json`)
    assert.equal(execution.exit, failed ? 1 : 0)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
    assert.equal(native.numPassedTests, passed)
    assert.equal(native.numFailedTests, failed)
    assert.equal(native.numPendingTests, 0)
    const cases = native.testResults.flatMap((file) => file.assertionResults)
    assert.equal(cases.filter((test) => test.status === 'failed').length, failed)
    if (failed) {
      const expected = id.startsWith('ownership-')
        ? 'fetch-retry 取消与退避资源 init 的 signal 在退避中取消：立即拒绝、清 timer/监听器且不再请求'
        : 'bootstrap resource lifecycle FM boot loads the game resources without requesting or waiting for the MIDI soundfont'
      assert.deepEqual(
        cases.filter((test) => test.status === 'failed').map((test) => test.fullName),
        [expected],
      )
    }
    if (failed) assert.match(artifact(`${id}.stderr.raw`).toString(), /AssertionError:/)
    else assert.equal(artifact(`${id}.stderr.raw`).length, 0)
  }
  assert.equal(report.probes.observations.before[0].timers, 1)
  assert.equal(report.probes.observations.before[0].listeners, 1)
  assert.equal(report.probes.observations.after[0].timers, 0)
  assert.equal(report.probes.observations.after[0].listeners, 0)
  for (const version of ['before', 'after']) {
    const actual = artifact(`ownership-${version}.stdout.raw`)
      .toString()
      .split('\n')
      .filter((line) => line.startsWith('[ownership-probe] '))
      .map((line) => JSON.parse(line.slice('[ownership-probe] '.length)))
    assert.deepEqual(actual, report.probes.observations[version])
  }
  const ci = json('github-d297-status-retry.stdout.raw')
  assert.equal(ci.headSha, report.base)
  assert.equal(ci.status, 'completed')
  assert.equal(ci.conclusion, 'success')
  const facade = 'packages/game/src/assets/rle-decode.ts'
  const previous = execFileSync('git', ['-C', root, 'show', `${report.base}:${facade}`], {
    encoding: 'utf8',
  })
  const currentFacade = fs.readFileSync(path.join(root, facade), 'utf8')
  const body = (text) => text.slice(text.indexOf('export function base64ToBytes'))
  assert(previous.includes('export function base64ToBytes'))
  assert(currentFacade.includes('export function base64ToBytes'))
  assert.equal(body(previous), body(currentFacade))
  assert.match(currentFacade, /^export \{ parseSpriteChunk \} from '@type-pal\/shared'$/m)
  for (const name of report.probes.removed) assert(!fs.existsSync(path.join(root, name)))
  const { approvedTestRetirements } = await import(
    path.join(root, 'scripts/coverage/approved-test-retirements.mjs')
  )
  assert.deepEqual(
    approvedTestRetirements.find((entry) => entry.file === report.retirement.entry.file),
    report.retirement.entry,
  )
  for (const file of report.files)
    assert.deepEqual(Object.keys(file.dimensions), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
  if (report.integration.state === 'passed') {
    const text = stripVTControlCharacters(artifact('module-check.stdout.raw').toString())
    const count = (pattern) => Array.from(text.matchAll(pattern), (match) => Number(match[1]))
    assert.deepEqual(count(/^\s*Tests\s+(\d+) passed/gm), report.integration.check.packageCounts)
    assert.deepEqual(count(/^# tests (\d+)$/gm), report.integration.check.toolCounts)
    for (const id of report.integration.successfulExecutionIds) {
      const result = json(`${id}.execution.json`)
      assert.equal(result.exit, 0)
      assert.equal(result.signal, null)
      assert.equal(result.spawnError, null)
      assert.equal(artifact(`${id}.stderr.raw`).length, 0)
    }
    const protectedResult = json('module-protected-report.json')
    assert.deepEqual(protectedResult.strict.regressions, [])
    assert.deepEqual(protectedResult.scope.changes, [])
    assert.deepEqual(protectedResult.protectedMetrics.regressions, [])
    assert.deepEqual(
      protectedResult.protectedScope.removals.map((entry) => entry.value),
      [report.retirement.entry.file],
    )
  }
  console.log(
    JSON.stringify({
      state: 'MATCH',
      files: report.files.length,
      receipts: Object.keys(entries).length,
      integration: report.integration.state,
      limits:
        'Identity/result/integrity verification only. A-H semantic judgments and reuse boundaries remain in review.json; no SUT, network, coverage or writes.',
    }),
  )
}
