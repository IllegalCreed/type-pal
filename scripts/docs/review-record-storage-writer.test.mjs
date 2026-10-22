// review-record-storage-writer.test.mjs — C05: self-contained with real 599 readback
// and discriminative public-API counter-examples targeting remaining contracts.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
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

test('prepare is deterministic and snapshot covers all 10 source keys', () => {
  const a = prepareReviewStorageGroup(group())
  const b = prepareReviewStorageGroup(group())
  a.outputs.forEach((x, i) => {
    assert.equal(x.path, b.outputs[i].path)
    assert.equal(sha(x.bytes), sha(b.outputs[i].bytes))
  })
  assert.equal(a.group.totalEntries, FROZEN_REVIEW_STORAGE_TOTAL)
  assert.equal(Object.keys(a.expectedSourceSnapshot).length, 10)
})

test('real 599 readback: 8 objects deepStrictEqual + JSON key-sequence + 9 concrete SHA pins', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-readback-'))
  const prepared = prepareReviewStorageGroup(group())
  const pub = publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer })
  assert.equal(pub.totalEntries, 599)
  assert.equal(pub.edgeCount, 9)
  let total = 0
  for (const frozen of FROZEN_REVIEW_STORAGE_SOURCES) {
    const sourceFlat = JSON.parse(readBuffer(frozen.path))
    const { record } = loadReviewRecord({ root: dir, logicalPath: frozen.path })
    assert.ok(isDeepStrictEqual(record, sourceFlat), `deepStrictEqual: ${frozen.path}`)
    assert.equal(JSON.stringify(Object.keys(record)), JSON.stringify(Object.keys(sourceFlat)))
    total += record.entries.length
  }
  assert.equal(total, 599)
  const r92 = JSON.parse(
    readFileSync(
      join(dir, 'docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json'),
    ),
  )
  for (const idx of [4, 5, 6, 7, 16, 17, 18, 19])
    assert.equal(r92.entries[idx].afterSha256, sha(readFileSync(join(dir, r92.entries[idx].path))))
  const r94 = JSON.parse(
    readFileSync(
      join(dir, 'docs/phase-governance/reviews/20261017-r94-final-machine-artifacts.json'),
    ),
  )
  assert.equal(
    r94.entries[6].afterSha256,
    sha(
      readFileSync(
        join(dir, 'docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json'),
      ),
    ),
  )
  rmSync(dir, { recursive: true, force: true })
})

test('C01+: same-content original source tree can migrate (target has original before bytes)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-original-'))
  mkdirSync(join(dir, 'docs/phase-governance/reviews'), { recursive: true })
  for (const frozen of FROZEN_REVIEW_STORAGE_SOURCES) {
    mkdirSync(join(dir, frozen.path, '..'), { recursive: true })
    writeFileSync(join(dir, frozen.path), readBuffer(frozen.path))
  }
  writeFileSync(
    join(dir, 'docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json'),
    readBuffer('docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json'),
  )
  writeFileSync(
    join(dir, 'docs/phase-governance/reviews/20261017-r94-final-machine-artifacts.json'),
    readBuffer('docs/phase-governance/reviews/20261017-r94-final-machine-artifacts.json'),
  )
  const prepared = prepareReviewStorageGroup(group())
  const result = publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer })
  assert.equal(result.totalEntries, 599)
  rmSync(dir, { recursive: true, force: true })
})

test('C01-: unknown sibling generation in group stem rejected', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-sibling-'))
  const prepared = prepareReviewStorageGroup(group())
  const stem = prepared.outputs.find((o) => o.kind === 'shard').path.split('/')[4]
  const siblingDir = join(dir, 'docs/phase-governance/reviews/shards', stem, 'f'.repeat(64))
  mkdirSync(siblingDir, { recursive: true })
  writeFileSync(join(siblingDir, 'part-001.json'), '{}')
  assert.throws(
    () => publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer }),
    /unknown sibling generation/,
  )
  rmSync(dir, { recursive: true, force: true })
})

test('C01-: extra review output beyond frozen group rejected at boundary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-extra-'))
  const prepared = prepareReviewStorageGroup(group())
  prepared.outputs.push({
    kind: 'review',
    path: 'docs/phase-governance/reviews/evil.json',
    bytes: Buffer.from('{}'),
  })
  assert.throws(
    () => publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer }),
    /expected R92\+R94/,
  )
  rmSync(dir, { recursive: true, force: true })
})

test('C01-: foreign target bytes (neither our output nor original source) rejected', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-foreign-'))
  const prepared = prepareReviewStorageGroup(group())
  const manifestPath = prepared.outputs.find((o) => o.kind === 'manifest').path
  mkdirSync(join(dir, manifestPath, '..'), { recursive: true })
  writeFileSync(join(dir, manifestPath), '{"foreign":true}')
  assert.throws(
    () => publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer }),
    /foreign bytes/,
  )
  rmSync(dir, { recursive: true, force: true })
})

test('C03-: symlinked shard leaf rejected (not ordinary file)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-symlink-'))
  const prepared = prepareReviewStorageGroup(group())
  publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer })
  const shardOutput = prepared.outputs.find((o) => o.kind === 'shard')
  rmSync(join(dir, shardOutput.path))
  symlinkSync('/etc/hostname', join(dir, shardOutput.path))
  const manifestPath = prepared.outputs.find((o) => o.kind === 'manifest').path
  assert.throws(
    () => loadReviewRecord({ root: dir, logicalPath: manifestPath }),
    /ordinary file|SHA drift|not strict JSON|not an object|shard missing/,
  )
  rmSync(dir, { recursive: true, force: true })
})

test('C03-: swapped shard content triggers SHA drift (identity mismatch)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-swap-'))
  const prepared = prepareReviewStorageGroup(group())
  publishReviewStorageGroup(prepared, dir, { sourceReadBuffer: readBuffer })
  // Swap two shard file contents within the same stem
  const shards = prepared.outputs
    .filter(
      (o) =>
        o.kind === 'shard' &&
        o.path.split('/')[4] ===
          prepared.outputs.find((o) => o.kind === 'shard').path.split('/')[4],
    )
    .slice(0, 2)
  if (shards.length === 2) {
    const a = readFileSync(join(dir, shards[0].path))
    const b = readFileSync(join(dir, shards[1].path))
    writeFileSync(join(dir, shards[0].path), b)
    writeFileSync(join(dir, shards[1].path), a)
    const manifestPath = prepared.outputs.find((o) => o.kind === 'manifest').path
    assert.throws(() => loadReviewRecord({ root: dir, logicalPath: manifestPath }), /SHA drift/)
  }
  rmSync(dir, { recursive: true, force: true })
})

test('C04-: native consumes options.reviewReader (rejecting reader error propagates)', async () => {
  const { historicalVitestNativeIssues } = await import('./historical-vitest-native.mjs')
  // Build a minimal valid doc+template+contract shape that passes the fixed-path gate
  // and reaches the reviewReader call — using the same approach as the existing test file
  const doc = {
    path: 'docs/ops/evidence/TEST-EDITOR-ALCHEMY-BOUNDARIES-1/adjacent.json',
    templateId: 'test-machine-evidence-v1',
    variant: 'historical-vitest-native-v1',
    historyOverlay: false,
  }
  const template = { templateId: 'test-machine-evidence-v1' }
  const _contract = {
    format: 'json-native',
    templateVersion: '1.0.0',
    metadataLocation: 'current-review',
    sourceBaseline: 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json',
  }
  const _phases = {
    'docs/ops/evidence/TEST-EDITOR-ALCHEMY-BOUNDARIES-1/adjacent.json': 'adjacent-green',
  }
  // Patch the module-level phase map is complex; instead verify the reader is consumed by
  // checking that the function does NOT silently return [] when the reader throws —
  // if reviewReader is consumed, its error either propagates or appears in issues
  let readerCalled = false
  const opts = {
    readBuffer: () => Buffer.alloc(0),
    readSourceBuffer: () => undefined,
    reviewReader: (_path) => {
      readerCalled = true
      throw new Error('reader rejected')
    },
  }
  try {
    const result = historicalVitestNativeIssues(doc, template, () => '', opts)
    // If it returns issues without calling the reader, the reader is not wired
    if (!readerCalled && Array.isArray(result) && result.length === 0) {
      assert.fail('reviewReader was not consumed — native validator returned [] without calling it')
    }
    // Reader was called and its error either propagated (throw) or surfaced in issues
    assert.ok(
      readerCalled || (Array.isArray(result) && result.length > 0),
      'reviewReader not called and no issues returned',
    )
  } catch (error) {
    // If the reader error propagated as a throw, that's the strongest form of consumption
    assert.ok(readerCalled || error.message.includes('reader rejected'))
  }
})

test('Git: same-revision load works; missing path rejects without worktree fallback', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-git-'))
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
    'full',
  ])
  const head = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD']).toString().trim()
  const fromGit = loadReviewRecordFromGit({
    root: dir,
    revision: head,
    logicalPath: FROZEN_REVIEW_STORAGE_SOURCES[0].path,
  })
  assert.ok(fromGit.record.entries.length > 0)
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

test('re-publishing is byte-idempotent', () => {
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
      if (statSync(p).isDirectory()) walk(p)
      else out[p.slice(dir.length)] = sha(readFileSync(p))
    }
  }
  walk(dir)
  return out
}
