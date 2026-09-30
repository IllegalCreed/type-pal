import assert from 'node:assert/strict'
import test from 'node:test'
import { allowedNewPath } from './verify-targets.mjs'

const cases = [
  ['O migrate test', 'O', 'packages/migrate/src/transaction.glm-o.test.ts', true],
  ['O content test', 'O', 'packages/content/src/guard.glm-o.test.ts', true],
  ['O shared test', 'O', 'packages/shared/src/input.glm-o.test.ts', true],
  ['P nested TSX test', 'P', 'packages/editor/src/ui/panel.glm-p.test.tsx', true],
  ['Q reforge test', 'Q', 'packages/reforge/src/menu.glm-q.test.ts', true],
  ['Q game test', 'Q', 'packages/game/src/input.glm-q.test.ts', true],
  ['Q extract test', 'Q', 'packages/pal-extract/src/decode.glm-q.test.ts', true],
  ['typed owner fixture', 'P', 'packages/editor/src/__tests__/glm-p/canvas-host.ts', true],
  ['owner receipt', 'Q', 'docs/testing/glm-tenfold-triple/wave-Q/receipt.json', true],
  ['unknown owner', 'R', 'packages/editor/src/panel.glm-r.test.ts', false],
  ['package ownership', 'O', 'packages/editor/src/panel.glm-o.test.ts', false],
  ['test suffix ownership', 'P', 'packages/editor/src/panel.glm-q.test.ts', false],
  ['old test', 'P', 'packages/editor/src/panel.test.tsx', false],
  ['product file', 'O', 'packages/content/src/validate.ts', false],
  ['wrong fixture owner', 'Q', 'packages/game/src/__tests__/glm-o/input.ts', false],
  ['shared fixture', 'P', 'packages/editor/src/__tests__/fixtures.ts', false],
  ['script placement', 'O', 'packages/migrate/scripts/bake.glm-o.test.ts', false],
  ['absolute path', 'P', '/packages/editor/src/panel.glm-p.test.ts', false],
  ['parent traversal', 'P', 'packages/editor/src/../panel.glm-p.test.ts', false],
  ['dot traversal', 'Q', 'packages/game/src/./input.glm-q.test.ts', false],
  ['duplicate separator', 'Q', 'packages/game/src//input.glm-q.test.ts', false],
  ['backslash separator', 'P', 'packages/editor/src\\panel.glm-p.test.ts', false],
  ['other evidence owner', 'P', 'docs/testing/glm-tenfold-triple/wave-Q/receipt.json', false],
  ['shared navigation', 'P', 'docs/testing/glm-tenfold-triple/README.md', false],
  ['frozen targets', 'O', 'docs/testing/glm-tenfold-triple/targets.json', false],
  ['task card', 'O', 'docs/ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md', false],
  ['official baseline', 'Q', 'scripts/coverage/baseline.fast.json', false],
  ['owner directory alone', 'O', 'docs/testing/glm-tenfold-triple/wave-O/', false],
  ['empty path', 'O', '', false],
  ['non-string path', 'O', null, false],
]

for (const [name, wave, path, expected] of cases) {
  test(name, () => {
    assert.equal(allowedNewPath(wave, path), expected)
  })
}
