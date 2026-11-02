import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const folder = new URL('./', import.meta.url)
const root = new URL('../../../../', import.meta.url)
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const record = JSON.parse(readFileSync(new URL('review.json', folder), 'utf8'))
const archive = readFileSync(new URL(record.beforeArchive.path, folder))
assert.equal(sha(archive), record.beforeArchive.sha256)
const before = JSON.parse(gunzipSync(archive).toString('utf8')).files

// Earlier receipts bind their actual boundary, while this receipt binds the later policy edit.
export function readBeforePolicy(path) {
  const input = record.inputs.find((entry) => entry.path === path)
  const output = record.outputs.find((entry) => entry.path === path)
  assert.ok(input && output, `Undeclared policy bridge: ${path}`)
  assert.equal(sha(before[path]), input.sha256, path)
  assert.equal(sha(readFileSync(new URL(path, root))), output.sha256, path)
  return before[path]
}

export function verifyPolicy() {
  for (const entry of record.inputs) assert.equal(sha(before[entry.path]), entry.sha256, entry.path)
  for (const entry of [...record.outputs, ...record.preserved])
    assert.equal(sha(readFileSync(new URL(entry.path, root))), entry.sha256, entry.path)
  const prior = JSON.parse(before['docs/testing/catalog.json'])
  const current = JSON.parse(readFileSync(new URL('docs/testing/catalog.json', root), 'utf8'))
  const withoutDeadlines = prior.entries.map(({ reviewBy, ...entry }) => entry)
  assert.deepEqual(current.entries, withoutDeadlines, 'Only active entry deadlines may change')
  const retirement = current._governance.history.at(-1)
  assert.deepEqual(current._governance.history.slice(0, -1), prior._governance.history)
  assert.deepEqual(
    retirement.retiredDeadlines,
    prior.entries.map(({ id, reviewBy }) => ({ id, reviewBy })),
  )
  for (const entry of prior.entries.filter((entry) => entry.kind === 'e2e-stage')) {
    const path = `docs/testing/${entry.index}`
    const currentText = readFileSync(new URL(path, root), 'utf8')
    assert.doesNotMatch(currentText, /^reviewBy:/m)
    for (const field of ['id', 'status', 'lastVerified'])
      assert.ok(currentText.includes(`${field}: ${entry[field]}\n`), `${entry.id}:${field}`)
  }
  const rawArchive = readFileSync(new URL(record.rawArchive.path, folder))
  assert.equal(sha(rawArchive), record.rawArchive.sha256)
  const raw = JSON.parse(gunzipSync(rawArchive).toString('utf8')).files
  for (const gate of record.gates) {
    const execution = JSON.parse(raw[`${gate.id}.execution.json`])
    assert.equal(execution.exit, gate.exit, gate.id)
    assert.equal(execution.signal, null, gate.id)
    assert.equal(sha(raw[`${gate.id}.stdout.raw`]), gate.stdoutSha256, gate.id)
    assert.equal(sha(raw[`${gate.id}.stderr.raw`]), gate.stderrSha256, gate.id)
  }
  assert.equal(JSON.parse(raw['calendar-red.execution.json']).exit, 1)
  assert.match(raw['calendar-red.stdout.raw'], /AssertionError/)
  assert.match(raw['calendar-red.stdout.raw'], /shop: missing reviewBy/)
  for (const id of ['focused-final', 'scoped-static', 'docs-full', 'lint-r2']) {
    assert.equal(JSON.parse(raw[`${id}.execution.json`]).exit, 0, id)
    assert.equal(raw[`${id}.stderr.raw`], '', id)
  }
  assert.match(raw['docs-full.stdout.raw'], /# tests 131\n# suites 0\n# pass 131\n# fail 0/)
  for (const gate of ['docs', 'testing docs', 'phase/lore governance', 'content review'])
    assert.ok(raw['docs-full.stdout.raw'].includes(`${gate}: PASS`), gate)
  assert.match(raw['lint-r2.stdout.raw'], /0 errors \/ 0 warnings \/ 0 infos/)
  assert.equal(record.runtimeExecutionPerformed, false)
  return {
    entries: current.entries.length,
    stages: 6,
    historicalClaimsPreserved: true,
    calendarExpiry: false,
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(verifyPolicy()))
