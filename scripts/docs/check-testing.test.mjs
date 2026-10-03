import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateCatalog } from './check-testing.mjs'
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
