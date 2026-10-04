import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classifyPath } from './classify-testing-legacy.mjs'

test('legacy classification keeps agent provenance out of canonical target', () => {
  const migrated = classifyPath(
    'architecture-regression-lab-codex-r10-review.md',
    'document',
    'a'.repeat(64),
    {
      movedTo:
        'archive/architecture-regression-lab/architecture-regression-lab-codex-r10-review.md',
      canonicalTarget: 'archive/architecture-regression-lab-history.md',
    },
  )
  assert.equal(migrated.provenance, 'Codex')
  assert.equal(migrated.disposition, 'migrated')
  assert.equal(migrated.canonicalTarget, 'archive/architecture-regression-lab-history.md')
  assert.doesNotMatch(migrated.canonicalTarget, /codex/i)
})

test('unmigrated files are classified by domain and capability', () => {
  const result = classifyPath('battle-host-refactor-mutants.mjs', 'tool', 'b'.repeat(64))
  assert.equal(result.domain, 'runtime')
  assert.equal(result.module, 'battle')
  assert.equal(result.disposition, 'retain-legacy')
  assert.equal(result.sourceSha.length, 64)
})
