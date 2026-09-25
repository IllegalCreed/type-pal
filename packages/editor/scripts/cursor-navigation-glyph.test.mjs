import assert from 'node:assert/strict'
import { test } from 'vitest'
import {
  findEmbeddedNavigationGlyphActions,
  isEmbeddedNavigationGlyphAction,
} from './design-system-audit.mjs'

const source = [
  'export function Fixture() {',
  '  return (',
  '    <section>',
  '      <DsButton>前往预览 ↗</DsButton>',
  '      <button>跳转 →</button>',
  '      <DsButton aria-label="向右上">↗</DsButton>',
  '      <DsReferenceRow>打开 ↗</DsReferenceRow>',
  '    </section>',
  '  )',
  '}',
].join('\n')

test('a self-contained TSX scan returns only matching navigation tags with their lines', () => {
  const input = source
  assert.equal(isEmbeddedNavigationGlyphAction('button', '<button>跳转 →</button>'), false)
  assert.equal(
    isEmbeddedNavigationGlyphAction('DsButton', '<DsButton aria-label="向右上">↗</DsButton>'),
    false,
  )
  assert.deepEqual(findEmbeddedNavigationGlyphActions(input), [
    { line: 4, tag: 'DsButton' },
    { line: 7, tag: 'DsReferenceRow' },
  ])
  assert.equal(input, source)
})
