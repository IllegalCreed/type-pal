// review-record-storage-guards.test.mjs — full-selection guard contract tests.
// Real process CLI zero-mutation counterproofs run against a copied tree (not this repo).

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  assertWritableReviewSelection,
  reviewStorageGuardIssues,
  reviewStorageMarker,
} from './review-record-storage-guards.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const here = fileURLToPath(new URL('.', import.meta.url))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const flat = {
  schemaVersion: 1,
  id: 'fixture-review',
  reviewer: 'test',
  reviewDate: '2026-01-01',
  policy: 'fixture',
  entries: [{ path: 'docs/x.md', contentReviewStatus: 'partial-review-unknown' }],
}
function tempTreeWithScripts() {
  const dir = tempTree()
  mkdirSync(join(dir, 'scripts/docs'), { recursive: true })
  for (const name of readdirSync(here).filter(
    (n) => n.endsWith('.mjs') && !n.endsWith('.test.mjs'),
  ))
    cpSync(join(here, name), join(dir, 'scripts/docs', name))
  return dir
}

function tempTree() {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-guards-'))
  mkdirSync(join(dir, 'docs/phase-governance/reviews'), { recursive: true })
  writeFileSync(
    join(dir, 'docs/phase-governance/reviews/a.json'),
    `${JSON.stringify(flat, null, 2)}\n`,
  )
  return dir
}
const ctx = (dir) => ({
  readBuffer: (p) => readFileSync(join(dir, p)),
  resolve: (p) => join(dir, p),
})
const rel = (name) => `docs/phase-governance/reviews/${name}`

test('flat legacy review with entries passes the full-selection guard', () => {
  const dir = tempTree()
  assert.doesNotThrow(() => assertWritableReviewSelection([rel('a.json')], ctx(dir)))
  rmSync(dir, { recursive: true, force: true })
})

test('thin manifest with _reviewStorage is rejected before any write across the whole selection', () => {
  const dir = tempTree()
  writeFileSync(
    join(dir, rel('b.json')),
    `${JSON.stringify(
      { ...flat, entries: undefined, [reviewStorageMarker]: { shards: [] } },
      null,
      2,
    )}\n`,
  )
  const issues = reviewStorageGuardIssues([rel('a.json'), rel('b.json')], ctx(dir))
  assert.equal(issues.length, 1)
  assert.match(issues[0], /thin manifest stores entries in shards .*b\.json/)
  rmSync(dir, { recursive: true, force: true })
})

test('storage lock, missing entries, non-array entries, shard path and duplicate selection are all refused', () => {
  const dir = tempTree()
  writeFileSync(join(dir, rel('.storage.lock')), 'locked\n')
  writeFileSync(
    join(dir, rel('no-entries.json')),
    `${JSON.stringify({ schemaVersion: 1 }, null, 2)}\n`,
  )
  writeFileSync(
    join(dir, rel('bad.json')),
    `${JSON.stringify({ ...flat, entries: {} }, null, 2)}\n`,
  )
  const issues = reviewStorageGuardIssues(
    [
      rel('a.json'),
      rel('a.json'),
      rel('no-entries.json'),
      rel('bad.json'),
      rel('shards/x/part-001.json'),
      rel('missing.json'),
    ],
    ctx(dir),
  )
  const text = issues.join('\n')
  assert.match(text, /lock present/)
  assert.match(text, /duplicate selection/)
  assert.match(text, /no entries array.*no-entries\.json/)
  assert.match(text, /entries is not an array.*bad\.json/)
  assert.match(text, /physical shard selected/)
  assert.match(text, /cannot read selected review .*missing\.json/)
  rmSync(dir, { recursive: true, force: true })
})

test('guard selection rejects empty or non-review paths without touching the filesystem', () => {
  const issues = reviewStorageGuardIssues([], { readBuffer: () => Buffer.alloc(0) })
  assert.match(issues.join('\n'), /non-empty array/)
  const bad = reviewStorageGuardIssues(['docs/other/x.json'], { readBuffer: () => Buffer.alloc(0) })
  assert.match(bad.join('\n'), /not a review path/)
})

test('real CLI guard: refresh/remap/enrich refuse a manifest-shaped tree with zero writes (process-level)', () => {
  const dir = tempTreeWithScripts()
  // convert the single review into a thin manifest shape and add a second flat file:
  // refresh/remap select the whole directory; the manifest must abort before ANY file is written.
  writeFileSync(
    join(dir, rel('a.json')),
    `${JSON.stringify(
      { ...flat, entries: undefined, [reviewStorageMarker]: { shards: [] } },
      null,
      2,
    )}\n`,
  )
  writeFileSync(join(dir, rel('c.json')), `${JSON.stringify(flat, null, 2)}\n`)
  const scripts = [
    'refresh-content-review-sha.mjs',
    'remap-review-paths.mjs',
    'enrich-content-review-file.mjs',
  ]
  for (const name of scripts) {
    const before = snapshot(dir)
    const run = spawnSync(
      process.execPath,
      [
        join(dir, 'scripts/docs', name),
        name === 'enrich-content-review-file.mjs' ? rel('a.json') : '',
      ],
      {
        cwd: dir,
        encoding: 'utf8',
      },
    )
    const after = snapshot(dir)
    assert.notEqual(run.status, 0, `${name} must fail`)
    assert.match(run.stderr, /guard/, `${name} must fail with the guard message`)
    assert.deepEqual(after, before, `${name} must not mutate any byte before refusing`)
  }
  rmSync(dir, { recursive: true, force: true })
})

test('real CLI guard: batch enricher refuses a manifest-shaped fixed-batch file with zero writes', () => {
  const dir = tempTreeWithScripts()
  const batch = rel('20261004-lore-phase3-batch1.json')
  writeFileSync(
    join(dir, batch),
    `${JSON.stringify(
      { ...flat, entries: undefined, [reviewStorageMarker]: { shards: [] } },
      null,
      2,
    )}\n`,
  )
  const before = snapshot(dir)
  const run = spawnSync(
    process.execPath,
    [join(dir, 'scripts/docs/enrich-content-review-batch.mjs')],
    { cwd: dir, encoding: 'utf8' },
  )
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /guard/)
  assert.deepEqual(snapshot(dir), before)
  rmSync(dir, { recursive: true, force: true })
})

test('real CLI guard: sync reads and validates the whole directory before any registry write', () => {
  const dir = tempTreeWithScripts()
  // minimal registry manifest + one phase shard so loadDocumentRegistry succeeds, then a manifest-shaped review
  cpSync(
    join(repoRoot, 'docs/phase-governance/document-registry.json'),
    join(dir, 'docs/phase-governance/document-registry.json'),
  )
  for (const name of readdirSync(join(repoRoot, 'docs/phase-governance')).filter((n) =>
    n.startsWith('document-registry.'),
  )) {
    cpSync(join(repoRoot, 'docs/phase-governance', name), join(dir, 'docs/phase-governance', name))
  }
  writeFileSync(
    join(dir, rel('a.json')),
    `${JSON.stringify(
      { ...flat, entries: undefined, [reviewStorageMarker]: { shards: [] } },
      null,
      2,
    )}\n`,
  )
  const before = snapshot(dir)
  const run = spawnSync(
    process.execPath,
    [join(dir, 'scripts/docs/sync-governed-document-registry.mjs')],
    { cwd: dir, encoding: 'utf8' },
  )
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /guard/)
  assert.deepEqual(
    snapshot(dir),
    before,
    'registry must stay byte-identical when the guard refuses',
  )
  rmSync(dir, { recursive: true, force: true })
})

function snapshot(dir) {
  const out = {}
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (name === 'node_modules') continue
      const stat = statSync(p)
      if (stat.isDirectory()) walk(p)
      else out[p.slice(dir.length)] = sha(readFileSync(p))
    }
  }
  walk(dir)
  return out
}
