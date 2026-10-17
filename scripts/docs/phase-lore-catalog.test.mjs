import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { loadPhaseLoreCatalog } from './phase-lore-catalog.mjs'

const phases = ['lore', 'phase1', 'phase2', 'phase3']
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const entry = (phase) => ({
  id: `fixture-${phase}`,
  path: `docs/${phase}/fixture.md`,
  phase,
  module: 'fixture',
  capability: 'fixture',
  status: 'current',
  reviewStatus: 'reviewed',
  owner: 'test',
  sourceSha256: 'a'.repeat(64),
  afterSha256: 'b'.repeat(64),
  sourceRefs: ['fixture'],
  publicCallers: ['fixture'],
  legalInputs: ['fixture'],
  businessOracle: { assertions: ['fixture'] },
  dedupe: { result: 'reviewed' },
  revision: { currentSha: 'b'.repeat(64), history: [{ revision: 'fixture' }] },
  evidence: { kind: 'fixture', path: 'fixture' },
  history: [{ revision: 'fixture' }],
  supersedes: [],
  stopLine: 'fixture',
  lastReviewed: '2026-10-17',
})

function fixture({ mutate } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'phase-lore-catalog-'))
  const directory = join(root, 'docs/phase-governance')
  mkdirSync(directory, { recursive: true })
  const shards = phases.map((phase) => {
    const shard = {
      schemaVersion: 1,
      id: `fixture-${phase}`,
      generatedBy: 'fixture',
      sourceRevision: 'fixture',
      phase,
      summary: { total: 1, byStatus: { current: 1 } },
      entries: [entry(phase)],
    }
    const path = join(directory, `catalog.${phase}.json`)
    writeFileSync(path, `${JSON.stringify(shard, null, 2)}\n`)
    return { phase, path: `catalog.${phase}.json`, sha256: digest(path), total: 1 }
  })
  const manifest = {
    schemaVersion: 2,
    id: 'fixture',
    generatedBy: 'fixture',
    sourceRevision: 'fixture',
    policy: 'fixture',
    summary: {
      total: 4,
      byPhase: { lore: 1, phase1: 1, phase2: 1, phase3: 1 },
      byStatus: { current: 4 },
    },
    maintenancePolicy: 'fixture',
    loader: { module: 'fixture', contract: 'fixture' },
    shards,
  }
  writeFileSync(join(directory, 'catalog.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  mutate?.({ directory, manifest })
  return { root, manifestPath: join(directory, 'catalog.json'), directory }
}

function cleanup(fixtureRoot) {
  rmSync(fixtureRoot, { recursive: true, force: true })
}

test('real phase/lore catalog merges 184 entries with a deterministic path order', () => {
  const catalog = loadPhaseLoreCatalog()
  assert.equal(catalog.entries.length, 184)
  assert.deepEqual(catalog.summary.byPhase, { lore: 14, phase1: 60, phase2: 105, phase3: 5 })
  assert.deepEqual(catalog.summary.byStatus, { current: 54, draft: 53, archived: 77 })
  assert.deepEqual(
    catalog.entries.map((item) => item.path),
    [...catalog.entries]
      .sort((a, b) => a.path.localeCompare(b.path, 'en'))
      .map((item) => item.path),
  )
})

test('loader rejects a shard SHA drift before exposing entries', () => {
  const fixtureData = fixture({
    mutate: ({ directory }) => writeFileSync(join(directory, 'catalog.phase1.json'), '{}\n'),
  })
  assert.throws(
    () => loadPhaseLoreCatalog({ manifestPath: fixtureData.manifestPath }),
    /shard SHA drift/,
  )
  cleanup(fixtureData.root)
})

test('loader rejects a duplicate id or path across shards', () => {
  const fixtureData = fixture({
    mutate: ({ directory }) => {
      const path = join(directory, 'catalog.phase1.json')
      const shard = JSON.parse(readFileSync(path, 'utf8'))
      shard.entries[0].id = 'fixture-lore'
      writeFileSync(path, `${JSON.stringify(shard, null, 2)}\n`)
      const manifestPath = join(directory, 'catalog.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      manifest.shards[1].sha256 = digest(path)
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    },
  })
  assert.throws(
    () => loadPhaseLoreCatalog({ manifestPath: fixtureData.manifestPath }),
    /duplicate catalog id/,
  )
  cleanup(fixtureData.root)
})

test('loader rejects a shard phase mismatch and an incomplete phase set', () => {
  const fixtureData = fixture({
    mutate: ({ directory }) => {
      const path = join(directory, 'catalog.phase1.json')
      const shard = JSON.parse(readFileSync(path, 'utf8'))
      shard.phase = 'lore'
      writeFileSync(path, `${JSON.stringify(shard, null, 2)}\n`)
      const manifestPath = join(directory, 'catalog.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      manifest.shards[1].sha256 = digest(path)
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    },
  })
  assert.throws(
    () => loadPhaseLoreCatalog({ manifestPath: fixtureData.manifestPath }),
    /shard phase mismatch/,
  )
  cleanup(fixtureData.root)
})

test('loader rejects a missing shard and a manifest summary mismatch', () => {
  const missing = fixture({
    mutate: ({ directory }) => {
      const manifestPath = join(directory, 'catalog.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      manifest.shards.pop()
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    },
  })
  assert.throws(
    () => loadPhaseLoreCatalog({ manifestPath: missing.manifestPath }),
    /must declare four phase\/lore shards/,
  )
  cleanup(missing.root)

  const summary = fixture({
    mutate: ({ directory }) => {
      const manifestPath = join(directory, 'catalog.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      manifest.summary.total = 3
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    },
  })
  assert.throws(
    () => loadPhaseLoreCatalog({ manifestPath: summary.manifestPath }),
    /manifest summary total/,
  )
  cleanup(summary.root)
})
