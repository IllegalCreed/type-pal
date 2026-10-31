import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  collectRollforwardSources,
  runRollforwardCandidates,
} from './build-rollforward-document-candidates.mjs'
import {
  assertRollforwardManifest,
  assertVisiblePolicy,
  deriveRollforwardScope,
  prepareRollforwardCandidate,
  rollforwardContract,
  rollforwardSeedMatches,
  rollforwardSourceRows,
} from './document-rollforward-candidates.mjs'
import { incrementalDigest } from './incremental-document-candidates.mjs'

const root = fileURLToPath(new URL('../..', import.meta.url))
let sources
const snapshot = () => (sources ??= collectRollforwardSources())
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 })

test('the public CLI derives the complete current-main difference, including the approved merged branch', () => {
  const value = snapshot()
  assert.equal(value.scope.additions.length, 179)
  assert.equal(value.scope.changes.length, 50)
  assert.equal(value.scope.controls.length, 22)
  assert.equal(value.scope.author.length, 207)
  assert.equal(value.rows.filter((r) => r.format === 'markdown').length, 65)
  assert.equal(value.rows.filter((r) => r.format === 'json').length, 142)
  assert.equal(
    value.scope.author.some((p) => p.startsWith('docs/phase-governance/reviews/')),
    false,
  )
})

test('a native addition and a paired amendment resolve real blobs on both source axes', () => {
  for (const path of [
    'docs/ops/evidence/QUALITY-PENDING-100-3/base-main-ci.json',
    'docs/testing/domains/phase1-runtime/control-rotation/evidence.json',
  ]) {
    const value = snapshot(),
      row = value.rows.find((r) => r.path === path)
    const bytes = git('cat-file', 'blob', `${row.sourceRevision}:${path}`)
    assert(bytes.equals(value.sources.get(path)))
    assert.equal(incrementalDigest(bytes), row.sourceSha256)
    assert.equal(
      git('rev-parse', `${row.sourceRevision}:${path}`).toString().trim(),
      row.sourceGitObject,
    )
    assert.equal(
      incrementalDigest(git('cat-file', 'blob', `${row.upstream.revision}:${path}`)),
      row.upstream.sha256,
    )
    if (row.priorAccepted)
      assert.equal(
        incrementalDigest(git('cat-file', 'blob', `${row.priorAccepted.revision}:${path}`)),
        row.priorAccepted.sha256,
      )
  }
})

test('the manifest comparator rejects late-field mutations and authority expansion, not just a matching prefix', () => {
  const { scope, rows } = snapshot()
  const original = {
    contract: rollforwardContract,
    scope,
    rows,
    semanticAcceptanceGranted: false,
    creditGranted: 0,
  }
  assert.doesNotThrow(() => assertRollforwardManifest(structuredClone(original), scope, rows))
  for (const mutate of [
    (v) => {
      v.rows.at(-1).sourceSha256 = '0'.repeat(64)
    },
    (v) => {
      v.scope.author.push('docs/ops/tasks/DOCS-FULL-TEMPLATE-1.md')
    },
    (v) => {
      v.contract.creditGranted = 1
    },
  ]) {
    const altered = structuredClone(original)
    mutate(altered)
    assert.throws(() => assertRollforwardManifest(altered, scope, rows))
  }
})

test('the same seed comparator accepts an exact copy and rejects a changed final business assertion', () => {
  const seed = {
    path: 'docs/ops/example.md',
    coreConclusion: 'Exact finding',
    businessOracle: { assertions: ['one', 'two'] },
  }
  assert.equal(rollforwardSeedMatches(seed, structuredClone(seed)), true)
  const altered = structuredClone(seed)
  altered.businessOracle.assertions[1] = 'an unreviewed claim'
  assert.equal(rollforwardSeedMatches(seed, altered), false)
  assert.equal(rollforwardSeedMatches(seed, { ...seed, currentIndependentAcceptance: {} }), false)
})

test('current policy must remain visible; retaining it only in a source fence does not pass', () => {
  const path = 'docs/ops/code-quality.md',
    source = snapshot().sources.get(path)
  const live = source.toString('utf8').split('\n## 原文保全\n')[0].trimEnd()
  assert.doesNotThrow(() => assertVisiblePolicy(path, `${live}\n\nNew scoped note\n`, source))
  assert.throws(() => assertVisiblePolicy(path, '# Metadata only\n', source), /visible prose/)
  assert.throws(
    () => assertVisiblePolicy(path, `\`\`\`markdown\n${live}\n\`\`\`\n`, source),
    /visible prose/,
  )
  assert.throws(
    () => assertVisiblePolicy(path, live.replace('判等', 'something else'), source),
    /visible prose/,
  )
})

test('fake source revisions, nonordinary sources and empty carriers fail before rendering', () => {
  const scope = snapshot().scope
  assert.throws(
    () => rollforwardSourceRows(scope, rollforwardContract.main, () => {}),
    /frozen integration/,
  )
  for (const source of [
    { mode: '120000', oid: 'a'.repeat(40), buffer: Buffer.from('symlink') },
    { mode: '100644', oid: 'a'.repeat(40), buffer: Buffer.alloc(0) },
  ])
    assert.throws(
      () => rollforwardSourceRows(scope, rollforwardContract.integration, () => source),
      /ordinary|empty source/,
    )
  assert.throws(
    () =>
      deriveRollforwardScope({
        previous: new Map([['docs/old.md', {}]]),
        incoming: new Map(),
        accepted: new Map(),
      }),
    /removal/,
  )
})

test('the public candidate entry rejects metadata-only semantic evidence and author signatures', () => {
  const path = 'docs/ops/evidence/QUALITY-PENDING-100-3/base-main-ci.json'
  const value = snapshot(),
    admission = value.rows.find((r) => r.path === path),
    source = value.sources.get(path)
  const input = { admission, source, draft: { path, review: {} } }
  assert.throws(() => prepareRollforwardCandidate(input), /per-file semantic/)
  input.draft.review = {
    semanticAssessment: { perFileChecked: true, claims: ['source-backed finding'] },
    linkDisposition: [],
    readDomain: { notRead: ['old execution not rerun'] },
    currentIndependentAcceptance: {},
  }
  assert.throws(() => prepareRollforwardCandidate(input), /cannot supply acceptance/)
})

test('CLI invalid or conflicting modes refuse before source writes', () => {
  const before = git('status', '--porcelain', '--untracked-files=all')
  for (const argv of [
    ['--write', '--complete'],
    ['--write', '--write'],
    ['--root', root],
    ['--manifest'],
  ])
    assert.throws(() => runRollforwardCandidates(argv))
  assert(git('status', '--porcelain', '--untracked-files=all').equals(before))
  assert(readFileSync(`${root}/docs/phase-governance/templates/registry.json`).length > 0)
})
