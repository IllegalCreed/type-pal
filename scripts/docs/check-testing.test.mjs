import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  parseTestingFrontMatter,
  parseTestingMeta,
  validateCatalog,
  validateTestingOrphans,
} from './check-testing.mjs'
import { renderIndexes } from './generate-testing-index.mjs'

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
