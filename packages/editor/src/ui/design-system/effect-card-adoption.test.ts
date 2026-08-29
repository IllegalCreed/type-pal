// @ts-nocheck -- Node-backed static gate; production editor intentionally has no Node types.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { validateEffectCardAdoption } from '../../../scripts/design-system-audit.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const uiRoot = join(here, '..')
const registry = JSON.parse(readFileSync(join(here, 'effect-card-adoption.json'), 'utf8'))
const source = (name: string): string => readFileSync(join(uiRoot, name), 'utf8')

describe('effect-card adoption gate', () => {
  test('keeps the six route-live effect families bidirectional and kind-complete', () => {
    expect(validateEffectCardAdoption(registry)).toEqual([])
    expect(registry.families.map((family: { id: string }) => family.id)).toEqual([
      'actor/casualty-effects',
      'item/equipment-effects',
      'item/throw-effects',
      'item/use-effects',
      'skill/base-effects',
      'skill/execution-effects',
    ])
    expect(registry.families.find((family: { id: string }) => family.id === 'item/use-effects'))
      .toMatchObject({ density: 'default', privateBranch: true, kinds: expect.arrayContaining([
        'dieIfNotPoisoned',
        'levelUp',
        'placeEntityInFront',
      ]) })
  })

  test('fails loud for a missing owner, wrong key, misaligned grip, or lost full-span body', () => {
    const owner = source('EffectEditorCard.tsx')
    const editorCss = source('editor.css')
    const fullSpanStart = editorCss.indexOf(
      '.effect-editor-card__fields > .item-effect-field-wide',
    )
    const editorCssWithoutFullSpan =
      editorCss.slice(0, fullSpanStart) +
      editorCss
        .slice(fullSpanStart)
        .replace(/grid-column:\s*1\s*\/\s*-1;/, '')
    const responsiveStart = editorCss.indexOf(
      '@container effect-editor-card (max-width: 520px)',
    )
    const editorCssWithWrongResponsiveGrip =
      editorCss.slice(0, responsiveStart) +
      editorCss
        .slice(responsiveStart)
        .replace('var(--ds-control-height-compact)', 'var(--ds-control-height)')

    expect(
      validateEffectCardAdoption(registry, {
        'ItemTab.tsx': source('ItemTab.tsx').replace('<EffectEditorCard', '<LegacyEffectCard'),
      }),
    ).not.toEqual([])
    expect(
      validateEffectCardAdoption(registry, {
        'EffectEditorCard.tsx': owner.replace(
          'itemKey={props.itemKey}',
          'itemKey={props.effectKind}',
        ),
      }),
    ).toContainEqual(expect.stringContaining('itemKey'))
    const itemUseSource = source('ItemUseEffectEditor.tsx')
    const itemUseStart = itemUseSource.indexOf('family="item/use-effects"')
    const itemUseKey = itemUseSource.indexOf('itemKey={reorderKey}', itemUseStart)
    expect(
      validateEffectCardAdoption(registry, {
        'ItemUseEffectEditor.tsx':
          itemUseSource.slice(0, itemUseKey) +
          'itemKey={String(index)}' +
          itemUseSource.slice(itemUseKey + 'itemKey={reorderKey}'.length),
      }),
    ).toContain('item/use-effects must bind each card to its stable reorderKey')
    expect(
      validateEffectCardAdoption(registry, {
        'editor.css': editorCss.replace(
          'inset-block-start: 0;',
          'inset-block-start: 50%;',
        ),
      }),
    ).toContain('EffectEditorCard overlay handle is not header-aligned')
    expect(
      validateEffectCardAdoption(registry, {
        'editor.css': editorCssWithWrongResponsiveGrip,
      }),
    ).toContain('EffectEditorCard responsive overlay handle is not first-row aligned')
    expect(
      validateEffectCardAdoption(registry, {
        'editor.css': editorCssWithoutFullSpan,
      }),
    ).toContain('EffectEditorCard lost its full-span nested field contract')
  })
})
