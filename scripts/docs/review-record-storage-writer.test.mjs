// review-record-storage-writer.test.mjs — prepare/publish group contract tests:
// same-revision Git loading, idempotent re-prepare, foreign concurrent input rejection,
// descriptor/boundary shape enforcement, and lock semantics — all in temp trees.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { loadReviewRecord, loadReviewRecordFromGit } from './review-record-storage.mjs'
import {
  prepareReviewStorageGroup,
  publishReviewStorageGroup,
} from './review-record-storage-writer.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const sha = (b) => createHash('sha256').update(b).digest('hex')
const manifest = JSON.parse(
  readFileSync(
    '/tmp/type-pal-S28-GLM-review-storage-implementation/execution-manifest.json',
    'utf8',
  ),
)
const git = (...a) =>
  execFileSync('git', ['-C', repoRoot, ...a])
    .toString()
    .trim()
const readBuffer = (p) => readFileSync(join(repoRoot, p))
const records = () =>
  manifest.sourceReviewRecords.map((row) => ({
    path: row.path,
    beforeSHA256: row.beforeSHA256,
    entryCount: row.entryCount,
    sourceRevision: '8cbf0dafba1a8a96914a322719dfeca1e5d58873',
    sourceGitObject: git('rev-parse', `8cbf0dafba1a8a96914a322719dfeca1e5d58873:${row.path}`),
  }))
const group = () => ({
  records: records(),
  r92Buffer: readBuffer(
    'docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json',
  ),
  r94Buffer: readBuffer('docs/phase-governance/reviews/20261017-r94-final-machine-artifacts.json'),
  readBuffer,
  context: { repoRoot },
})

test('prepare is deterministic: two independent runs produce byte-identical outputs', () => {
  const a = prepareReviewStorageGroup(group())
  const b = prepareReviewStorageGroup(group())
  assert.equal(a.outputs.length, b.outputs.length)
  a.outputs.forEach((x, i) => {
    assert.equal(x.path, b.outputs[i].path)
    assert.equal(sha(x.bytes), sha(b.outputs[i].bytes))
  })
  assert.equal(a.outputs.filter((x) => x.kind === 'shard').length, 19)
  assert.equal(a.group.totalEntries, 599)
})

test('prepare refuses when any source identity drifts (foreign concurrent change)', () => {
  const mutated = group()
  mutated.records = mutated.records.map((r, i) =>
    i === 0 ? { ...r, beforeSHA256: '0'.repeat(64) } : r,
  )
  assert.throws(() => prepareReviewStorageGroup(mutated), /source identity drift/)
})

test('publish writes into an explicit temp tree, releases the lock, and the group materializes from a committed copy at one revision', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-writer-'))
  const prepared = prepareReviewStorageGroup(group())
  const published = publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer })
  assert.equal(published.written, 29)
  assert.equal(published.lockReleased, true)
  for (const row of manifest.sourceReviewRecords) {
    const { record } = loadReviewRecord({ root: dir, logicalPath: row.path })
    assert.equal(record.entries.length, row.entryCount)
  }
  // turn the tree into a real Git repo with one commit and load from that revision
  execFileSync('git', ['-C', dir, 'init', '-q'])
  execFileSync('git', ['-C', dir, 'add', '-A'])
  execFileSync('git', [
    '-C',
    dir,
    '-c',
    'user.email=t@t',
    '-c',
    'user.name=t',
    'commit',
    '-qm',
    'rehearsal',
  ])
  const head = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD']).toString().trim()
  const fromGit = loadReviewRecordFromGit({
    root: dir,
    revision: head,
    logicalPath: manifest.sourceReviewRecords[0].path,
  })
  assert.equal(fromGit.record.entries.length, 100)
  // missing Git source refuses without falling back to the worktree
  assert.throws(
    () =>
      loadReviewRecordFromGit({
        root: dir,
        revision: head,
        logicalPath: 'docs/phase-governance/reviews/nonexistent.json',
      }),
    /Git review missing/,
  )
  rmSync(dir, { recursive: true, force: true })
})

test('shard size and path boundary: every physical unit is ≤512KiB and lives under its own generation', () => {
  const prepared = prepareReviewStorageGroup(group())
  for (const output of prepared.outputs) {
    assert.ok(
      output.bytes.length <= 524_288,
      `${output.path} exceeds 512KiB (${output.bytes.length})`,
    )
    if (output.kind === 'shard') {
      const stem = output.path.split('/')[4]
      const generation = output.path.split('/')[5]
      assert.match(
        output.path,
        new RegExp(
          `^docs/phase-governance/reviews/shards/${stem}/${generation}/part-\\d{3}\\.json$`,
        ),
      )
      assert.match(generation, /^[a-f\d]{64}$/)
    }
  }
})

test('re-publishing the same prepared group over its own output tree is byte-idempotent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-idem-'))
  const prepared = prepareReviewStorageGroup(group())
  publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer })
  const before = snapshot(dir)
  publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer })
  assert.deepEqual(snapshot(dir), before)
  rmSync(dir, { recursive: true, force: true })
})

function snapshot(dir) {
  const out = {}
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      const stat = statSync(p)
      if (stat.isDirectory()) walk(p)
      else out[p.slice(dir.length)] = sha(readFileSync(p))
    }
  }
  walk(dir)
  return out
}
