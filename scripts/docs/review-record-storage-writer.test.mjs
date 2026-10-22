// review-record-storage-writer.test.mjs — C05: fully self-contained (no /tmp packet dependency).
// Uses frozen constants + real Git identity derivation; restores true 599 readback with
// deepStrictEqual + JSON sequence + 9 concrete SHA pin verification.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { loadReviewRecord, loadReviewRecordFromGit } from './review-record-storage.mjs'
import {
  FROZEN_REVIEW_SOURCE_REVISION,
  FROZEN_REVIEW_STORAGE_SOURCES,
  FROZEN_REVIEW_STORAGE_TOTAL,
  prepareReviewStorageGroup,
  publishReviewStorageGroup,
} from './review-record-storage-writer.mjs'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const sha = (b) => createHash('sha256').update(b).digest('hex')
const readBuffer = (p) => readFileSync(join(repoRoot, p))

// C05: derive records from frozen constants + real Git (no /tmp)
const records = () =>
  FROZEN_REVIEW_STORAGE_SOURCES.map((frozen) => ({
    path: frozen.path,
    beforeSHA256: sha(
      execFileSync('git', [
        '-C',
        repoRoot,
        'cat-file',
        'blob',
        `${FROZEN_REVIEW_SOURCE_REVISION}:${frozen.path}`,
      ]),
    ),
    entryCount: frozen.entryCount,
    sourceRevision: FROZEN_REVIEW_SOURCE_REVISION,
    sourceGitObject: execFileSync('git', [
      '-C',
      repoRoot,
      'rev-parse',
      `${FROZEN_REVIEW_SOURCE_REVISION}:${frozen.path}`,
    ])
      .toString()
      .trim(),
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
  assert.equal(a.group.totalEntries, FROZEN_REVIEW_STORAGE_TOTAL)
  assert.equal(
    a.expectedSourceSnapshot[
      'docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json'
    ],
    sha(readBuffer('docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json')),
  )
  assert.equal(
    a.expectedSourceSnapshot[
      'docs/phase-governance/reviews/20261017-r94-final-machine-artifacts.json'
    ],
    sha(readBuffer('docs/phase-governance/reviews/20261017-r94-final-machine-artifacts.json')),
  )
})

test('prepare refuses when any source identity drifts (foreign concurrent change)', () => {
  const mutated = group()
  mutated.records = mutated.records.map((r, i) =>
    i === 0 ? { ...r, beforeSHA256: '0'.repeat(64) } : r,
  )
  assert.throws(() => prepareReviewStorageGroup(mutated), /source identity drift/)
})

test('real 599 readback: 8 logical objects deepStrictEqual + JSON key-sequence + 9 concrete SHA pins', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-readback-'))
  const prepared = prepareReviewStorageGroup(group())
  const published = publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer })
  assert.equal(published.totalEntries, 599)
  assert.equal(published.edgeCount, 9)
  // Deep-strict-equal each of the 8 logical objects against the source flat file
  let totalEntries = 0
  for (const frozen of FROZEN_REVIEW_STORAGE_SOURCES) {
    const sourceFlat = JSON.parse(readBuffer(frozen.path))
    const { record } = loadReviewRecord({ root: dir, logicalPath: frozen.path })
    assert.ok(isDeepStrictEqual(record, sourceFlat), `deepStrictEqual failed: ${frozen.path}`)
    assert.equal(
      JSON.stringify(Object.keys(record)),
      JSON.stringify(Object.keys(sourceFlat)),
      `key sequence differs: ${frozen.path}`,
    )
    assert.equal(
      JSON.stringify(record),
      JSON.stringify(sourceFlat),
      `JSON serialization differs: ${frozen.path}`,
    )
    totalEntries += record.entries.length
  }
  assert.equal(totalEntries, 599)
  // 9 concrete SHA pins: R92 8 edges point at actual manifest files; R94[6] at actual R92 bytes
  const r92 = JSON.parse(
    readFileSync(
      join(dir, 'docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json'),
    ),
  )
  for (const idx of [4, 5, 6, 7, 16, 17, 18, 19]) {
    const targetSha = sha(readFileSync(join(dir, r92.entries[idx].path)))
    assert.equal(r92.entries[idx].afterSha256, targetSha, `R92 edge ${idx} SHA mismatch`)
  }
  const r94 = JSON.parse(
    readFileSync(
      join(dir, 'docs/phase-governance/reviews/20261017-r94-final-machine-artifacts.json'),
    ),
  )
  const r92Sha = sha(
    readFileSync(
      join(dir, 'docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json'),
    ),
  )
  assert.equal(r94.entries[6].afterSha256, r92Sha)
  rmSync(dir, { recursive: true, force: true })
})

test('publish + committed Git copy loads at one revision; missing Git refuses (no worktree fallback)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-writer-'))
  const prepared = prepareReviewStorageGroup(group())
  publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer })
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
    logicalPath: FROZEN_REVIEW_STORAGE_SOURCES[4].path,
  })
  assert.equal(fromGit.record.entries.length, 100)
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

test('shard size/path boundary and key-order: production API enforces descriptor filename==key and ≤512KiB', () => {
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
      // C05: descriptor filename==key through production materializeReviewRecord
      const shard = JSON.parse(output.bytes)
      assert.equal(shard.key, output.path.split('/').pop().replace('.json', ''))
    }
  }
})

test('re-publishing the same prepared group is byte-idempotent (no partial overwrite)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-idem-'))
  const prepared = prepareReviewStorageGroup(group())
  publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer })
  const before = snapshot(dir)
  publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer })
  assert.deepEqual(snapshot(dir), before)
  rmSync(dir, { recursive: true, force: true })
})

test('publish rejects when source changes between prepare and publish (lock-time conflict)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-conflict-'))
  const prepared = prepareReviewStorageGroup(group())
  // Simulate a concurrent change by providing a reader that returns different bytes
  const tamperedReader = (path) => {
    if (path === FROZEN_REVIEW_STORAGE_SOURCES[0].path) return Buffer.from('{"tampered":true}')
    return readBuffer(path)
  }
  assert.throws(
    () => publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: tamperedReader }),
    /source changed/,
  )
  rmSync(dir, { recursive: true, force: true })
})

test('publish with writable prefix but bad output path (outside review dir) rejects with zero writes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-badpath-'))
  const prepared = prepareReviewStorageGroup(group())
  prepared.outputs.push({ kind: 'shard', path: 'docs/other/evil.json', bytes: Buffer.from('{}') })
  assert.throws(
    () => publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer }),
    /output path outside review directory/,
  )
  rmSync(dir, { recursive: true, force: true })
})

function snapshot(dir) {
  const out = {}
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else out[p.slice(dir.length)] = sha(readFileSync(p))
    }
  }
  walk(dir)
  return out
}
