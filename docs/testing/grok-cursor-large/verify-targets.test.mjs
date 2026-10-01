import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { allocationProblems, allowedNewPath, allowedPrimarySource } from './verify-targets.mjs'

const targets = JSON.parse(readFileSync(new URL('./targets.json', import.meta.url), 'utf8'))
const cases = [
  ['Grok render TS', 'grok', 'packages/game/src/present/present.grok-r1.test.ts', true],
  ['Grok TSX host', 'grok', 'packages/game/src/shell/input.grok-r1.test.tsx', true],
  ['Cursor UI', 'cursor', 'packages/editor/src/ui/PreviewCanvas.cursor-r1.test.tsx', true],
  ['Cursor core', 'cursor', 'packages/editor/src/core/sprite.cursor-r1.test.ts', true],
  ['Grok fixture', 'grok', 'packages/game/src/__tests__/grok-render-r1/image.ts', true],
  [
    'Cursor typed bridge',
    'cursor',
    'packages/editor/src/__tests__/cursor-asset-r1/host.d.ts',
    true,
  ],
  ['owner evidence', 'grok', 'docs/testing/grok-cursor-large/grok/receipt.json', true],
  ['unknown owner', 'glm', 'packages/game/src/input.glm-q.test.ts', false],
  ['wrong package', 'grok', 'packages/editor/src/ui/panel.grok-r1.test.ts', false],
  ['wrong suffix', 'cursor', 'packages/editor/src/ui/panel.glm-p.test.tsx', false],
  ['old test', 'grok', 'packages/game/src/present/present.test.ts', false],
  ['product', 'cursor', 'packages/editor/src/ui/PreviewCanvas.tsx', false],
  ['shared fixture', 'cursor', 'packages/editor/src/__tests__/fixtures.ts', false],
  ['other fixture', 'grok', 'packages/game/src/__tests__/glm-q/image.ts', false],
  ['other evidence', 'cursor', 'docs/testing/grok-cursor-large/grok/receipt.json', false],
  ['shared protocol', 'grok', 'docs/testing/grok-cursor-large/README.md', false],
  ['allocation', 'cursor', 'docs/testing/grok-cursor-large/targets.json', false],
  ['guard', 'grok', 'docs/testing/grok-cursor-large/verify-targets.mjs', false],
  ['task', 'cursor', 'docs/ops/tasks/TEST-CURSOR-ASSET-UI-LARGE-1.md', false],
  ['baseline', 'grok', 'scripts/coverage/baseline.fast.json', false],
  ['absolute', 'cursor', '/packages/editor/src/panel.cursor-r1.test.ts', false],
  ['parent', 'grok', 'packages/game/src/../panel.grok-r1.test.ts', false],
  ['dot', 'cursor', 'packages/editor/src/./panel.cursor-r1.test.ts', false],
  ['double separator', 'grok', 'packages/game/src//panel.grok-r1.test.ts', false],
  ['backslash', 'cursor', 'packages/editor/src\\panel.cursor-r1.test.ts', false],
  ['directory alone', 'grok', 'docs/testing/grok-cursor-large/grok/', false],
  ['empty', 'grok', '', false],
  ['non-string', 'cursor', null, false],
]
for (const [name, owner, path, expected] of cases)
  test(name, () => assert.equal(allowedNewPath(owner, path), expected))

test('registered source allocations are disjoint and complete', () => {
  assert.deepEqual(allocationProblems(targets), [])
})
test('source reservation rejects the other owner and unallocated App', () => {
  assert.equal(allowedPrimarySource('grok', 'packages/game/src/present/present.ts', targets), true)
  assert.equal(
    allowedPrimarySource('cursor', 'packages/editor/src/ui/PreviewCanvas.tsx', targets),
    true,
  )
  assert.equal(
    allowedPrimarySource('grok', 'packages/editor/src/ui/PreviewCanvas.tsx', targets),
    false,
  )
  assert.equal(allowedPrimarySource('cursor', 'packages/editor/src/ui/App.tsx', targets), false)
})
test('cross-owner overlap and wrong-package source are rejected', () => {
  const mutant = structuredClone(targets)
  mutant.owners[1].sources[0] = structuredClone(mutant.owners[0].sources[0])
  const problems = allocationProblems(mutant)
  assert.ok(problems.some((p) => p.startsWith('cross-owner source overlap:')))
  assert.ok(problems.some((p) => p.startsWith('invalid source:')))
})
test('owner workload reduction is rejected', () => {
  const mutant = structuredClone(targets)
  mutant.owners[0].targetNewCases = 1
  mutant.owners[1].minimumCounters = 1
  assert.ok(
    allocationProblems(mutant).filter((p) => p.startsWith('allocation/workload changed:'))
      .length === 2,
  )
})
test('source census reduction is rejected', () => {
  const mutant = structuredClone(targets)
  mutant.owners[0].sources.pop()
  assert.ok(allocationProblems(mutant).includes('incomplete 120-source allocation'))
})
test('repeated/unknown owner is rejected', () => {
  const mutant = structuredClone(targets)
  mutant.owners[1].id = mutant.owners[0].id
  assert.ok(allocationProblems(mutant).some((p) => p.startsWith('invalid/repeated owner:')))
})
