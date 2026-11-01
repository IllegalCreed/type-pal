// Exact lifecycle and native-input checks for the current rollforward transaction.
// Older transactions keep their original all-files-present and pin-count contracts.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { nativeArtifactBindings } from './historical-native-artifact-bindings.mjs'
import { historicalVitestCohort } from './historical-vitest-cohort.mjs'
import { inspectIncrementalCohort } from './incremental-review.mjs'
import { inspectNativeArtifactRetirements } from './native-artifact-retirements.mjs'
import { inspectRollforwardCohort } from './rollforward-review.mjs'
import { rollforwardReviewContract } from './rollforward-review-plan.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

export const rollforwardAdministrativePaths = Object.freeze([
  'docs/ops/board.md',
  'docs/ops/tasks/DOCS-FULL-TEMPLATE-1.md',
  'docs/ops/tasks/index.md',
  'docs/testing/catalog.json',
])
const hash = (b) => createHash('sha256').update(b).digest('hex')
export function rollforwardRegistry(readBuffer) {
  const root = parseTerminalJson(readBuffer('docs/phase-governance/document-registry.json')),
    entries = []
  for (const d of root.shards) {
    const raw = readBuffer(`docs/phase-governance/${d.path}`)
    assert.equal(hash(raw), d.sha256, 'registry descriptor differs')
    const shard = parseTerminalJson(raw)
    for (const [index, row] of shard.entries.entries()) {
      assert(!entries[shard.positions[index]], 'duplicate registry position')
      entries[shard.positions[index]] = row
    }
  }
  assert.equal(entries.filter(Boolean).length, root.summary.total, 'registry positions incomplete')
  return { ...root, entries }
}
export function rollforwardRetirements(root, records, readBuffer) {
  const result = inspectNativeArtifactRetirements(rollforwardRegistry(readBuffer), {
    readBuffer,
    present: (p) => Buffer.isBuffer(readBuffer(p)),
    readSourceBuffer: (pin) => readGitDocumentSnapshot(root, pin),
    reviewReader: (p) => records.get(p),
  })
  assert.deepEqual(result.issues, [], 'retirement lifecycle validation failed')
  assert.equal(result.entries.length, 6, 'six exact retired native identities required')
  return result.entries
}
export function assertRollforwardNativeInputs(readBuffer, records, retired) {
  const cohort = inspectIncrementalCohort(records),
    current = inspectRollforwardCohort(records)
  assert(
    cohort &&
      historicalVitestCohort.protectedNative.length === 302 &&
      nativeArtifactBindings.length === 473,
  )
  for (const pin of historicalVitestCohort.protectedNative)
    assert.equal(hash(readBuffer(pin.path)), pin.sha256, `protected302 changed: ${pin.path}`)
  const check = (path, originalSha) => {
    const entry = retired.find((row) => row.path === path),
      body = readBuffer(path)
    if (entry) {
      assert.equal(body, null, 'retired native reappeared')
      assert.equal(originalSha, entry.sha256)
      return
    }
    assert.equal(
      hash(body),
      current?.byPath.get(path)?.row.afterSha256 ?? originalSha,
      `native identity changed: ${path}`,
    )
  }
  for (const pin of nativeArtifactBindings) check(pin.path, pin.carrierSha256)
  for (const row of cohort.rows.filter((r) => r.path.endsWith('.json')))
    check(row.path, row.sourceSha256)
  if (current)
    for (const { row } of current.byPath.values())
      if (row.path.endsWith('.json')) assert.equal(hash(readBuffer(row.path)), row.afterSha256)
}
export function rollforwardInputRepairs(before, after, readBuffer) {
  const current = inspectRollforwardCohort(after)
  assert(current, 'compiled exact current acceptance required')
  const repairs = []
  for (const [owner, record] of before)
    for (const [index, row] of record.entries.entries()) {
      const bytes = readBuffer(row.path)
      if (!Buffer.isBuffer(bytes) || hash(bytes) === row.afterSha256) continue
      assert(
        current.byPath.has(row.path) || rollforwardAdministrativePaths.includes(row.path),
        `unaccepted input drift: ${row.path}`,
      )
      repairs.push({
        owner,
        index,
        path: row.path,
        beforeSha256: row.afterSha256,
        afterSha256: hash(bytes),
      })
    }
  if ([...before.values()].reduce((n, r) => n + r.entries.length, 0) === 4351) {
    assert.equal(
      repairs.length,
      30,
      'exact26 accepted amendments plus4 Owner observations required',
    )
    assert.equal(repairs.filter((r) => rollforwardAdministrativePaths.includes(r.path)).length, 4)
  } else assert.equal(repairs.length, 0, 'already-published inputs must be exact')
  return repairs
}
export function assertRollforwardFixedInput(root, files, readBuffer) {
  for (const path of files) {
    const source = readGitDocumentSnapshot(root, {
      path,
      revision: rollforwardReviewContract.acceptedBase,
    })
    assert(
      source?.mode === '100644' && source.buffer.equals(readBuffer(path)),
      `old central source changed: ${path}`,
    )
  }
}
