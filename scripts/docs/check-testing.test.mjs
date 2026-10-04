import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  parseTestingFrontMatter,
  parseTestingMeta,
  validateCatalog,
  validateCanonicalEvidence,
  validateTestingOrphans,
} from './check-testing.mjs'
import { renderIndexes } from './generate-testing-index.mjs'

function pairedFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'type-pal-paired-docs-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const source = 'export function buy() { return 1 }\n'
  writeFileSync(join(root, 'caller.mjs'), source)
  const entry = {
    id: 'shop',
    status: 'current',
    canonical: 'report.md',
    evidence: 'evidence.json',
    sourceRefs: [
      {
        path: 'caller.mjs',
        lines: '1-1',
        anchor: 'export function buy()',
        sha256: createHash('sha256').update(source).digest('hex'),
      },
    ],
    publicCallers: ['buy()'],
    legalInputs: ['nonnegative balance'],
    businessOracle: { type: 'purchase', assertions: ['balance falls by price'] },
    dedupe: { result: 'reviewed', against: ['prior shop contract'] },
    revision: {
      currentSha: 'a'.repeat(40),
      contentVersion: 22,
      minimumSaveVersion: 11,
      history: ['reviewed source contract'],
    },
  }
  const metadata = { schemaVersion: 2, ...entry }
  const evidence = {
    schemaVersion: 2,
    ...entry,
    kind: 'document-audit',
    candidateSha: entry.revision.currentSha,
    versions: { content: 22, minimumSave: 11 },
    history: entry.revision.history,
    runtimeExecution: { performed: false },
    artifacts: [],
    claims: [{ id: 'purchase', result: 'source-backed', evidence: ['caller.mjs:1-1'] }],
  }
  function publish() {
    writeFileSync(
      join(root, 'report.md'),
      `---\ntestingSchema: 2\nid: shop\nevidence: evidence.json\n---\n\n<!-- testing-meta\n${JSON.stringify(metadata)}\n-->\n# Shop`,
    )
    writeFileSync(join(root, 'evidence.json'), JSON.stringify(evidence))
  }
  publish()
  return {
    root,
    entry,
    evidence,
    metadata,
    publish,
    issues: () => validateCanonicalEvidence(entry, root, root),
  }
}

test('paired canonical/source evidence passes only when all three contracts agree', (t) => {
  const f = pairedFixture(t)
  assert.deepEqual(f.issues(), [])
  f.evidence.businessOracle = { type: 'purchase', assertions: ['a different balance'] }
  f.publish()
  assert.ok(f.issues().some((issue) => issue.includes('evidence/catalog mismatch businessOracle')))
})

test('source drift is rejected even when catalog and evidence claim the same hash', (t) => {
  const f = pairedFixture(t)
  writeFileSync(join(f.root, 'caller.mjs'), 'export function buy() { return 99 }\n')
  assert.ok(f.issues().some((issue) => issue.includes('sourceRef hash mismatch')))
})

test('a positive claim cannot cite an undeclared source or disguise source inspection as runtime execution', (t) => {
  const f = pairedFixture(t)
  f.evidence.claims = [{ id: 'purchase', result: 'source-backed', evidence: ['missing.mjs:1-1'] }]
  f.publish()
  assert.ok(f.issues().some((issue) => issue.includes('references undeclared source')))
  f.evidence.claims = [{ id: 'purchase', result: 'runtime-backed', evidence: ['caller.mjs:1-1'] }]
  f.publish()
  assert.ok(f.issues().some((issue) => issue.includes('runtime claim lacks actual execution')))
})

test('invalid claim JSON produces a diagnostic instead of crashing the audit', (t) => {
  const f = pairedFixture(t)
  f.evidence.claims = [null]
  f.publish()
  assert.ok(f.issues().some((issue) => issue.includes('malformed claim')))
})

test('catalog validation rejects duplicate ids, missing fields, and expired entries', () => {
  const catalog = {
    schemaVersion: 1,
    entries: [
      {
        id: 'x',
        kind: 'e2e-stage',
        title: 'x',
        status: 'verified',
        phase: ['phase1'],
        engines: ['game'],
        owner: 'Codex',
        canonical: 'missing.md',
        index: 'missing-readme.md',
        tags: [],
        lastVerified: '2026-01-01',
        reviewBy: '2026-01-02',
        dependsOn: [],
      },
      {
        id: 'x',
        kind: 'e2e-stage',
        title: 'x2',
        status: 'wrong',
        phase: ['phase1'],
        engines: ['game'],
        owner: 'Codex',
        canonical: 'missing2.md',
        index: 'missing2-readme.md',
        tags: [],
        lastVerified: '2026-01-01',
        reviewBy: '2026-01-02',
        dependsOn: ['nope'],
      },
    ],
  }
  const issues = validateCatalog(catalog, '/tmp', '2026-10-04')
  assert.ok(issues.some((issue) => issue.includes('duplicate')))
  assert.ok(issues.some((issue) => issue.includes('reviewBy')))
  assert.ok(issues.some((issue) => issue.includes('invalid status')))
})

test('catalog validation rejects unsafe paths, malformed dates, and duplicate canonical paths', () => {
  const base = {
    id: 'x',
    kind: 'report',
    title: 'x',
    status: 'current',
    phase: ['phase2'],
    engines: ['reforge'],
    owner: 'Codex',
    provenance: ['Codex'],
    domain: 'runtime',
    module: 'x',
    canonical: '../bad.md',
    index: 'x/README.md',
    evidence: 'x/evidence.json',
    tags: ['x'],
    lastVerified: '2026-99-99',
    reviewBy: 'not-a-date',
    dependsOn: [],
    sourceRefs: [{ path: 'packages/reforge/src/main.ts', lines: '1-2' }],
    publicCallers: ['caller'],
    legalInputs: ['input'],
    businessOracle: { type: 'oracle', assertions: ['assertion'] },
    dedupe: { result: 'reviewed', against: [] },
    revision: { currentSha: 'a'.repeat(40), contentVersion: 22, minimumSaveVersion: 11 },
  }
  const issues = validateCatalog(
    { schemaVersion: 2, entries: [base, { ...base, id: 'y', title: 'y' }] },
    '/tmp',
    '2026-10-04',
  )
  assert.ok(issues.some((issue) => issue.includes('unsafe') || issue.includes('missing path')))
  assert.ok(issues.some((issue) => issue.includes('invalid date')))
  assert.ok(issues.some((issue) => issue.includes('duplicate canonical path')))
})

test('generated indexes are deterministic and expose multiple dimensions', () => {
  const catalog = {
    entries: [
      {
        id: 'e2e-001',
        kind: 'e2e-stage',
        title: 'Opening',
        status: 'verified',
        phase: ['phase1'],
        engines: ['game'],
        owner: 'Codex',
        canonical: 'e2e/stages/001/report.md',
        index: 'e2e/stages/001/README.md',
        tags: ['story'],
        lastVerified: '2026-10-01',
        reviewBy: '2026-11-01',
        dependsOn: [],
      },
    ],
  }
  const indexes = renderIndexes(catalog)
  assert.match(indexes['by-stage.md'], /e2e-001/)
  assert.match(indexes['by-status.md'], /verified/)
  assert.match(indexes['by-tag.md'], /story/)
  assert.match(indexes['by-owner.md'], /Codex/)
})

test('testing metadata is machine-readable and keeps history separate from claims', () => {
  const metadata = parseTestingMeta(
    `\n# report\n\n<!-- testing-meta\n{"schemaVersion":2,"id":"x","revision":{"history":["r1"]}}\n-->`,
  )
  assert.equal(metadata.schemaVersion, 2)
  assert.deepEqual(metadata.revision.history, ['r1'])
  assert.equal(parseTestingMeta('# report'), null)
  assert.equal(parseTestingMeta('<!-- testing-meta\n{bad}\n-->').__parseError, true)
  assert.deepEqual(
    parseTestingFrontMatter('---\ntestingSchema: 2\nid: e2e-x\nevidence: e.json\n---\n# report\n'),
    { testingSchema: 2, id: 'e2e-x', evidence: 'e.json' },
  )
})

test('orphan stage/evidence files and old semantic paths are rejected', () => {
  const root = mkdtempSync(join(tmpdir(), 'type-pal-testing-docs-'))
  try {
    mkdirSync(join(root, 'e2e/stages/999-old'), { recursive: true })
    mkdirSync(join(root, 'e2e/evidence'), { recursive: true })
    writeFileSync(join(root, 'e2e/stages/999-old/README.md'), 'old')
    writeFileSync(join(root, 'e2e/stages/999-old/report.md'), '002-inn-e56')
    writeFileSync(join(root, 'e2e/evidence/orphan.json'), '{}')
    const issues = validateTestingOrphans(
      {
        entries: [
          {
            canonical: 'e2e/stages/001/report.md',
            index: 'e2e/stages/001/README.md',
            evidence: 'e2e/evidence/001.json',
          },
        ],
      },
      root,
    )
    assert.ok(issues.some((issue) => issue.includes('orphan E2E canonical report')))
    assert.ok(issues.some((issue) => issue.includes('orphan evidence')))
    assert.ok(issues.some((issue) => issue.includes('stale E2E-002 path')))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
