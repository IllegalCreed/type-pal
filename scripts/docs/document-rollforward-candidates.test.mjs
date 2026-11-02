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
import {
  assertPreservedMarkdownSpans,
  incrementalDigest,
} from './incremental-document-candidates.mjs'
import { markdownLinks } from './markdown.mjs'

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

test('an existing current template can be reused without adding another copy of its source', () => {
  const path = 'docs/ops/code-quality.md',
    value = snapshot(),
    source = value.sources.get(path)
  const sourceQuote = '文件按模块、功能和职责组织'
  const draft = {
    path,
    templateId: 'guide-runbook-v1',
    prefix: source.toString('utf8'),
    review: {
      coreConclusion:
        'The current policy requires responsibility-based organization; this test checks amendment reuse, not product quality.',
      owner: 'isolated-contract-test',
      provenance: 'real fixed Git document',
      readDomain: {
        coverage: 'full-file',
        actual: 'Fixed document read for preservation self-test',
        reusedFrom: [],
        notRead: ['No product execution'],
      },
      semanticAssessment: {
        perFileChecked: true,
        claims: [{ sourceQuote, claim: 'The exact policy clause remains visible.' }],
      },
      truthAnchors: [sourceQuote],
      dependencies: [],
      publicCallers: [path],
      unresolved: [],
      businessOracle: {
        type: 'document-preservation',
        assertions: ['No new source wrapper and exact existing historical span'],
      },
      dedupe: { result: 'reuse accepted template, not another inline copy', against: [] },
      historyBoundary: 'fixed Git source only',
      stopLine: 'reject source-span mutation',
      nextStep: 'independent candidate acceptance',
      runtimeExecutionPerformed: false,
      linkDisposition: [
        ...new Set(markdownLinks(source.toString('utf8')).map((l) => l.target)),
      ].map((target) => ({ source: target, target, kind: 'live' })),
    },
  }
  const result = prepareRollforwardCandidate({
    draft,
    admission: value.rows.find((r) => r.path === path),
    source,
    registry: JSON.parse(readFileSync(`${root}/docs/phase-governance/templates/registry.json`)),
    read: (p) => readFileSync(`${root}/${p}`, 'utf8'),
  })
  assert(result.body.equals(source))
  assert.equal(result.row.evidence.kind, 'incremental-existing-template-amendment')
  assert.equal(result.row.evidence.fullSourcePreservedIn, 'pinned-git-blob')
  for (const key of [
    'productionAdmission',
    'semanticAcceptanceGranted',
    'historicClaimsReexecuted',
    'nonAuthorReviewer',
    'creditGranted',
  ]) {
    const forged = structuredClone(draft)
    forged.review[key] = true
    assert.throws(
      () =>
        prepareRollforwardCandidate({
          draft: forged,
          admission: value.rows.find((r) => r.path === path),
          source,
          registry: JSON.parse(
            readFileSync(`${root}/docs/phase-governance/templates/registry.json`),
          ),
          read: (p) => readFileSync(`${root}/${p}`, 'utf8'),
        }),
      /cannot declare/,
    )
  }
})

test('amendment preservation rejects historical tail mutation or another nested source span', () => {
  const source = snapshot().sources.get('docs/ops/code-quality.md')
  assert.doesNotThrow(() => assertPreservedMarkdownSpans(Buffer.from(source), source))
  const altered = Buffer.from(source)
  const end = altered.indexOf('<!-- incremental-original-source:end -->')
  assert(end > 3)
  altered[end - 3] ^= 1
  assert.throws(
    () => assertPreservedMarkdownSpans(altered, source),
    /existing historical source span changed/,
  )
  assert.throws(
    () =>
      assertPreservedMarkdownSpans(
        Buffer.concat([
          source,
          source.subarray(source.indexOf('<!-- incremental-original-source:start -->')),
        ]),
        source,
      ),
    /existing historical source span changed/,
  )
})
