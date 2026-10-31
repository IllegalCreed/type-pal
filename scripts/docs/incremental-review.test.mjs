import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  loadDocumentRegistry,
  summarizeDocumentRegistry,
  writeDocumentRegistry,
} from './document-registry.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { readIncrementalGitSource } from './incremental-git-source.mjs'
import { assertIncrementalOwnerSet, inspectIncrementalCohort } from './incremental-review.mjs'
import {
  grantIncrementalReview,
  incrementalAcceptanceBasis,
  incrementalQualificationIssues,
  normalizeIncrementalReview,
} from './incremental-review-content.mjs'
import {
  prepareIncrementalMaintenance,
  publishIncrementalPublication,
} from './incremental-review-publication.mjs'
import { runIncrementalPublication } from './publish-incremental-documents.mjs'

const original = () => ({
  path: 'docs/ops/example.md',
  primarySource: [
    { path: 'docs/ops/example.md', revision: 'a'.repeat(40), sha256: 'b'.repeat(64) },
  ],
  afterSha256: 'c'.repeat(64),
  provenance: 'Contributor factual statement',
  semanticAssessment: {
    method: 'Read complete source',
    readScope: 'one example',
    unverified: ['old run not replayed'],
  },
  readDomain: { reusedFrom: [], notRead: ['old run not replayed'] },
  fieldRoles: { governance: ['prospective-owner#entries/0'], nativePointers: [] },
  evidence: { kind: 'incremental-preserved-markdown' },
  applicability: 'fixed carrier only',
  history: [],
  revision: { currentSha: 'b'.repeat(64), history: [] },
  contentReviewStatus: 'partial-review-unknown',
  templateCompliance: 'needs-migration',
  nonAuthorReviewer: false,
  creditGranted: 0,
})

const registryEntry = (path) => ({
  path,
  phase: 'ops',
  docType: 'task-card',
  templateId: 'task-card-v1',
  templateCompliance: 'needs-migration',
  reviewStatus: 'unread',
  reviewRecord: 'isolated-fixture.json',
})

test('the fixed-main companion resolves Markdown bytes without broadening the JSON source reader', () => {
  const root = fileURLToPath(new URL('../..', import.meta.url))
  const pin = {
    revision: '72db417255d8ca4227522420e9185ef468462aa7',
    path: 'docs/ops/archive/tasks/cancelled/GAME-PLAYER-POISON-KEY-DOMAIN-1.md',
  }
  const actual = readIncrementalGitSource(root, pin)
  assert.equal(actual.mode, '100644')
  assert.deepEqual(
    actual.buffer,
    execFileSync('git', ['cat-file', 'blob', `${pin.revision}:${pin.path}`], { cwd: root }),
  )
  assert.equal(readGitDocumentSnapshot(root, pin), undefined)
  for (const bad of [
    { ...pin, revision: '6995a8ec10598695e62df67e6f1d38da72bba38f' },
    { ...pin, path: 'docs/../AGENTS.md' },
    { ...pin, path: 'docs/ops/absent.md' },
  ])
    assert.equal(readIncrementalGitSource(root, bad), undefined)
})

test('normalization preserves contributor facts and records the administrative relocation and SHA meaning', () => {
  const before = original(),
    saved = structuredClone(before)
  const row = normalizeIncrementalReview(before, 0)
  assert.deepEqual(before, saved)
  assert.deepEqual(row.primarySource, saved.primarySource)
  assert.equal(
    row.fieldRoles.governance[0],
    'docs/phase-governance/reviews/20261018-semantic-rework.json#entries/28',
  )
  assert.equal(row.history[0].priorGovernanceLocation[0], 'prospective-owner#entries/0')
  assert.equal(row.revision.history[0].value, 'b'.repeat(64))
  assert.match(row.readDomain.actual, /Read complete source/)
  assert.equal(row.contentReviewStatus, 'partial-review-unknown')
})

test('a granted explanation cannot change its body, source, meaning or non-author signature', () => {
  const pending = normalizeIncrementalReview(original(), 0)
  const reviewed = grantIncrementalReview(pending)
  assert.deepEqual(incrementalQualificationIssues(reviewed), [])
  for (const key of ['afterSha256', 'path', 'owner']) {
    const bad = structuredClone(reviewed)
    bad[key] = 'changed'
    assert.notDeepEqual(incrementalQualificationIssues(bad), [])
  }
  const bad = structuredClone(reviewed)
  bad.currentIndependentAcceptance.basis[0].reviewer =
    bad.currentIndependentAcceptance.basis[0].author
  assert.notDeepEqual(incrementalQualificationIssues(bad), [])
  assert.throws(() => grantIncrementalReview(reviewed), /only the exact pending/)
})

test('pilot core and later GLM supplements have separate non-author bases', () => {
  const bases = incrementalAcceptanceBasis(
    'docs/ops/evidence/CODE-QUALITY-90/gate-ratchet-result.json',
  )
  assert.deepEqual(
    bases.map((b) => [b.author, b.reviewer]),
    [
      ['Codex', 'GLM'],
      ['GLM', 'Codex'],
    ],
  )
  assert.match(bases[0].scope, /excludes later contributor supplements/)
  assert.equal(incrementalAcceptanceBasis('docs/ops/example.md').length, 1)
})

test('the exact original owner set permits legacy use but rejects extra or substituted owners', () => {
  const root = fileURLToPath(new URL('../..', import.meta.url))
  const paths = execFileSync(
    'git',
    [
      'ls-tree',
      '-r',
      '--name-only',
      '6995a8ec10598695e62df67e6f1d38da72bba38f',
      'docs/phase-governance/reviews',
    ],
    { cwd: root },
  )
    .toString('utf8')
    .split('\n')
    .filter((path) => /^docs\/phase-governance\/reviews\/[^/]+\.json$/u.test(path))
  const records = new Map(paths.map((path) => [path, { entries: [] }]))
  records.get('docs/phase-governance/reviews/20261018-semantic-rework.json').entries = new Array(
    28,
  ).fill({ path: 'isolated-shape-only' })
  assert.doesNotThrow(() => assertIncrementalOwnerSet(records))
  assert.equal(inspectIncrementalCohort(records), undefined)
  const substituted = new Map(records)
  substituted.delete(paths[0])
  substituted.set('docs/phase-governance/reviews/unknown.json', { entries: [] })
  assert.throws(() => assertIncrementalOwnerSet(substituted), /unknown, replaced or missing/)
  records.set('docs/phase-governance/reviews/extra.json', { entries: [] })
  assert.throws(() => assertIncrementalOwnerSet(records), /unknown, replaced or missing/)
})

test('serialized or fabricated publication handles cannot acquire write authority', () => {
  assert.throws(
    () =>
      publishIncrementalPublication(
        { kind: 'incremental-document-publication/1.0.0' },
        { allowWrite: true },
      ),
    /in-process publication capability/,
  )
})

test('administrative maintenance rejects unknown paths, rewritten prefixes and duplicate updates before acquiring write authority', () => {
  const root = mkdtempSync(join(tmpdir(), 'incremental-maintenance-'))
  const path = 'docs/ops/board.md'
  mkdirSync(join(root, 'docs/ops'), { recursive: true })
  writeFileSync(join(root, path), 'original board\n')
  try {
    for (const updates of [
      [{ path: 'docs/ops/code-quality.md', bytes: Buffer.from('arbitrary policy') }],
      [{ path, bytes: Buffer.from('rewritten board\n') }],
      [
        { path, bytes: Buffer.from('original board\nappend\n') },
        { path, bytes: Buffer.from('original board\nappend\n') },
      ],
    ])
      assert.throws(
        () => prepareIncrementalMaintenance({ root, baseRevision: 'a'.repeat(40), updates }),
        /unknown, duplicate|preserve the complete original prefix/,
      )
    assert.equal(readFileSync(join(root, path), 'utf8'), 'original board\n')
  } finally {
    rmSync(root, { recursive: true })
  }
})

test('publication rejects an in-repository or already occupied receipt before touching state', () => {
  const source = fileURLToPath(import.meta.url),
    saved = readFileSync(source)
  assert.throws(
    () =>
      runIncrementalPublication(['--input', 'missing-input.json', '--out', source, '--publish']),
    /output must be external/,
  )
  assert.deepEqual(readFileSync(source), saved)
  const folder = mkdtempSync(join(tmpdir(), 'incremental-output-'))
  try {
    const out = join(folder, 'occupied.json')
    writeFileSync(out, 'prior evidence\n')
    assert.throws(
      () => runIncrementalPublication(['--input', 'missing-input.json', '--out', out, '--publish']),
      /output already exists/,
    )
    assert.equal(readFileSync(out, 'utf8'), 'prior evidence\n')
  } finally {
    rmSync(folder, { recursive: true })
  }
})

function registryFixture() {
  const root = mkdtempSync(join(tmpdir(), 'incremental-registry-range-'))
  const path = join(root, 'document-registry.json'),
    shardPath = join(root, 'document-registry.ops.json')
  const entries = [registryEntry('docs/ops/one.md')]
  const bytes = Buffer.from(
    `${JSON.stringify({ schemaVersion: 1, phase: 'ops', positions: [0], entries }, null, 2)}\n`,
  )
  writeFileSync(shardPath, bytes)
  writeFileSync(
    path,
    `${JSON.stringify({ schemaVersion: 2, storageProducer: 'isolated range fixture', shards: [{ key: 'ops', phase: 'ops', path: 'document-registry.ops.json', total: 1, sha256: createHash('sha256').update(bytes).digest('hex') }], summary: summarizeDocumentRegistry(entries) }, null, 2)}\n`,
  )
  return { root, path, shardPath, ...loadDocumentRegistry({ manifestPath: path }) }
}

test('new registry members use explicit bounded storage ranges; prior shard ownership stays intact', () => {
  const f = registryFixture()
  try {
    const registry = f.registry
    registry.entries.push(registryEntry('docs/ops/two.md'))
    registry.summary = summarizeDocumentRegistry(registry.entries)
    registry.shards.push({
      key: 'ops-range',
      phase: 'ops',
      path: 'document-registry.ops-range.json',
      positionRange: [1, 2],
    })
    writeDocumentRegistry({ registry, loadedSource: f.loadedSource })
    assert.deepEqual(
      JSON.parse(readFileSync(f.shardPath)).entries.map((e) => e.path),
      ['docs/ops/one.md'],
    )
    assert.deepEqual(
      JSON.parse(readFileSync(join(f.root, 'document-registry.ops-range.json'))).positions,
      [1],
    )
    assert.equal(loadDocumentRegistry({ manifestPath: f.path }).registry.entries.length, 2)
  } finally {
    rmSync(f.root, { recursive: true })
  }
})

test('overlapping explicit registry ranges fail before any live publication', () => {
  const f = registryFixture(),
    before = readFileSync(f.path)
  try {
    f.registry.entries.push(registryEntry('docs/ops/two.md'))
    f.registry.summary = summarizeDocumentRegistry(f.registry.entries)
    for (const name of ['a', 'b'])
      f.registry.shards.push({
        key: name,
        phase: 'ops',
        path: `document-registry.ops-${name}.json`,
        positionRange: [1, 2],
      })
    assert.throws(
      () => writeDocumentRegistry({ registry: f.registry, loadedSource: f.loadedSource }),
      /overlapping explicit/,
    )
    assert.deepEqual(readFileSync(f.path), before)
  } finally {
    rmSync(f.root, { recursive: true })
  }
})
