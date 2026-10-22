// review-record-storage.test.mjs — loader core contract tests (C05: self-contained, no /tmp).
// Uses small synthetic records via the test-support helper; one real-CLI publish covers 599+9edges.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  loadReviewRecord,
  loadReviewRecordFromGit,
  materializeReviewRecord,
  readReviewRecordObject,
  reconcileShardDirectories,
  reviewDirRelative,
  reviewStorageMarker,
} from './review-record-storage.mjs'
import { buildSmallShardedRecord } from './review-record-storage.test-support.mjs'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const here = fileURLToPath(new URL('.', import.meta.url))
const _sha = (b) => createHash('sha256').update(b).digest('hex')
function tempTree() {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-core-'))
  mkdirSync(join(dir, reviewDirRelative), { recursive: true })
  return dir
}
const ctx = (dir) => ({
  readBuffer: (p) => {
    try {
      return readFileSync(join(dir, p))
    } catch {
      return undefined
    }
  },
})

test('small sharded record materializes to the exact logical object (public-caller success)', () => {
  const dir = tempTree()
  const built = buildSmallShardedRecord(3)
  for (const [path, bytes] of built.files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), bytes)
  }
  const { record, storage } = materializeReviewRecord(built.logicalPath, ctx(dir))
  assert.deepEqual(record, built.logical)
  assert.equal(storage.totalEntries, 3)
  const loaded = loadReviewRecord({ root: dir, logicalPath: built.logicalPath })
  assert.equal(loaded.loadedSource.files.length, 1 + built.shardCount)
  rmSync(dir, { recursive: true, force: true })
})

test('descriptor SHA drift is rejected (tampered shard bytes)', () => {
  const dir = tempTree()
  const built = buildSmallShardedRecord(3)
  for (const [path, bytes] of built.files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), bytes)
  }
  const shardPath = built.files.find(([p]) => p.includes('part-'))[0]
  const tampered = JSON.parse(readFileSync(join(dir, shardPath), 'utf8'))
  tampered.entries[0].path = 'docs/tampered.md'
  writeFileSync(join(dir, shardPath), `${JSON.stringify(tampered, null, 2)}\n`)
  assert.throws(
    () => loadReviewRecord({ root: dir, logicalPath: built.logicalPath }),
    /shard SHA drift/,
  )
  rmSync(dir, { recursive: true, force: true })
})

test('manifest top-level key order and storage field order are exact (frozen contract)', () => {
  const dir = tempTree()
  const built = buildSmallShardedRecord(2)
  for (const [path, bytes] of built.files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), bytes)
  }
  const manifest = JSON.parse(readFileSync(join(dir, built.logicalPath), 'utf8'))
  const topKeys = Object.keys(manifest)
  assert.equal(topKeys[topKeys.length - 1], reviewStorageMarker)
  const storageKeys = Object.keys(manifest[reviewStorageMarker])
  assert.equal(storageKeys[0], 'schemaVersion')
  assert.equal(storageKeys[storageKeys.length - 1], 'shards')
  rmSync(dir, { recursive: true, force: true })
})

test('orphan shard detection: unlisted file in generation dir is reported', () => {
  const dir = tempTree()
  const built = buildSmallShardedRecord(3)
  for (const [path, bytes] of built.files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), bytes)
  }
  const manifest = JSON.parse(readFileSync(join(dir, built.logicalPath), 'utf8'))
  const storage = manifest[reviewStorageMarker]
  const genDir = storage.shards[0].path.replace(/part-\d+\.json$/, '')
  writeFileSync(join(dir, reviewDirRelative, genDir, 'part-999.json'), '{}\n')
  const { issues } = reconcileShardDirectories(built.logicalPath, storage, {
    resolve: (p) => join(dir, p),
  })
  assert.ok(issues.some((x) => x.includes('orphan shard')))
  rmSync(dir, { recursive: true, force: true })
})

test('lock present → loader refuses; lock removed → loader succeeds', () => {
  const dir = tempTree()
  const built = buildSmallShardedRecord(2)
  for (const [path, bytes] of built.files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), bytes)
  }
  const lockPath = join(dir, reviewDirRelative, '.storage.lock')
  writeFileSync(lockPath, 'locked\n')
  assert.throws(
    () => loadReviewRecord({ root: dir, logicalPath: built.logicalPath }),
    /lock present/,
  )
  rmSync(lockPath)
  const loaded = loadReviewRecord({ root: dir, logicalPath: built.logicalPath })
  assert.equal(loaded.record.entries.length, 2)
  rmSync(dir, { recursive: true, force: true })
})

test('flat records are first-class inputs everywhere (real repo r85/r76)', () => {
  const flat = readReviewRecordObject(
    'docs/phase-governance/reviews/20261017-r76-testing-archive.json',
    {
      readBuffer: (p) => readFileSync(join(repoRoot, p)),
    },
  )
  assert.equal(flat.entries.length, 50)
  const loaded = loadReviewRecord({
    root: repoRoot,
    logicalPath: 'docs/phase-governance/reviews/20261017-r85-testing-archive.json',
  })
  assert.equal(loaded.record.entries.length, 100)
  assert.equal(loaded.loadedSource.files.length, 1)
})

test('Git loader: flat from real revision; sharded from temp Git commit; missing refuses', () => {
  const gitFlat = loadReviewRecordFromGit({
    root: repoRoot,
    revision: '8cbf0dafba1a8a96914a322719dfeca1e5d58873',
    logicalPath: 'docs/phase-governance/reviews/20261017-r73-testing-archive.json',
  })
  assert.equal(gitFlat.record.entries.length, 50)
  assert.equal(gitFlat.storage, null)
  const dir = tempTree()
  execFileSync('node', [join(here, 'migrate-review-record-storage.mjs'), '--publish', dir])
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
    logicalPath: 'docs/phase-governance/reviews/20261017-r85-testing-archive.json',
  })
  assert.equal(fromGit.record.entries.length, 100)
  assert.ok(fromGit.storage !== null)
  assert.throws(
    () =>
      loadReviewRecordFromGit({
        root: dir,
        revision: head,
        logicalPath: `${reviewDirRelative}/nonexistent.json`,
      }),
    /Git review missing/,
  )
  rmSync(dir, { recursive: true, force: true })
})

test('real CLI publish: 8 manifests, 19 shards, 599 entries, 9 edges', () => {
  const dir = tempTree()
  const result = JSON.parse(
    execFileSync('node', [join(here, 'migrate-review-record-storage.mjs'), '--publish', dir], {
      encoding: 'utf8',
    }),
  )
  assert.equal(result.mode, 'publish')
  assert.equal(result.totalEntries, 599)
  assert.equal(result.edgeCount, 9)
  assert.equal(result.shards, 19)
  assert.ok(result.entries.every((n) => n > 0))
  rmSync(dir, { recursive: true, force: true })
})
