import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { compareEvidenceRevision } from './testing-revisions.mjs'

function fixture() {
  return {
    entry: {
      id: 'opening',
      status: 'verified',
      lastVerified: '2000-01-01',
      revision: { currentSha: 'a'.repeat(40), contentVersion: 22, minimumSaveVersion: 11 },
      sourceRefs: [{ path: 'caller.ts', sha256: '1'.repeat(64) }],
    },
    current: {
      head: 'b'.repeat(40),
      contentVersion: 22,
      minimumSaveVersion: 11,
      sourceHashes: new Map([['caller.ts', '1'.repeat(64)]]),
    },
  }
}

test('unrelated HEAD changes and old execution dates do not stale matching declared boundaries', () => {
  const { entry, current } = fixture()
  const before = structuredClone({ entry, current })
  const result = compareEvidenceRevision(entry, current)
  assert.equal(result.comparison, 'matching')
  assert.equal(result.candidateMatches, false)
  assert.equal(result.lastVerified, '2000-01-01')
  assert.equal(result.publicationStatus, 'verified')
  assert.deepEqual(result.differences, [])
  assert.deepEqual(result.missing, [])
  assert.deepEqual({ entry, current }, before)
})

test('content, save and source changes each invalidate only the recorded boundary they differ from', () => {
  for (const field of ['contentVersion', 'minimumSaveVersion', 'source:caller.ts']) {
    const { entry, current } = fixture()
    const recorded = field === 'source:caller.ts' ? '1'.repeat(64) : entry.revision[field]
    const actual = field === 'source:caller.ts' ? '2'.repeat(64) : recorded + 1
    if (field === 'source:caller.ts') current.sourceHashes.set('caller.ts', actual)
    else current[field] = actual
    const result = compareEvidenceRevision(entry, current)
    assert.equal(result.comparison, 'changed', field)
    assert.deepEqual(result.differences, [{ field, recorded, current: actual }])
    assert.deepEqual(result.missing, [])
  }
})

test('missing candidates, versions or source fingerprints remain unknown, never matching', () => {
  for (const field of [
    'candidate',
    'version',
    'declared-sources',
    'recorded-hash',
    'current-file',
  ]) {
    const { entry, current } = fixture()
    if (field === 'candidate') delete entry.revision.currentSha
    if (field === 'version') delete entry.revision.minimumSaveVersion
    if (field === 'declared-sources') entry.sourceRefs = []
    if (field === 'recorded-hash') delete entry.sourceRefs[0].sha256
    if (field === 'current-file') current.sourceHashes.delete('caller.ts')
    const result = compareEvidenceRevision(entry, current)
    assert.equal(result.comparison, 'unknown', field)
    assert.equal(result.missing.length, 1, field)
    assert.deepEqual(result.differences, [])
  }
})

test('public read-only CLI reports recorded versions and rejects an unknown ID without editing catalog', () => {
  const cli = fileURLToPath(new URL('./testing-revisions.mjs', import.meta.url))
  const catalog = new URL('../../docs/testing/catalog.json', import.meta.url)
  const before = readFileSync(catalog)
  const run = (...ids) => spawnSync(process.execPath, [cli, ...ids], { encoding: 'utf8' })
  const positive = run('e2e-001')
  assert.equal(positive.status, 0, positive.stderr)
  assert.equal(positive.stderr, '')
  const [opening] = JSON.parse(positive.stdout)
  assert.equal(opening.id, 'e2e-001')
  assert.deepEqual(opening.recorded, {
    candidates: ['d02278dc0154dd73b5db24388a35c30bb096cc81'],
    contentVersion: 22,
    minimumSaveVersion: 11,
  })
  assert.ok(['changed', 'unknown', 'matching'].includes(opening.comparison))
  const negative = run('not-a-catalog-id')
  assert.equal(negative.status, 1)
  assert.equal(negative.stdout, '')
  assert.equal(negative.stderr.trim(), 'Unknown testing catalog ID: not-a-catalog-id')
  assert.deepEqual(readFileSync(catalog), before)
})
