// @ts-nocheck -- static production/CSS gate; editor bundle intentionally has no Node types.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const uiRoot = join(here, '..')
const source = (file: string): string => readFileSync(join(uiRoot, file), 'utf8')

function cssRule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 's').exec(css)?.[1] ?? ''
}

describe('reorder visible surface adoption gate', () => {
  test('freezes all 29 adoptions on independently evidenced content and rail axes', () => {
    const manifest = JSON.parse(source('design-system/reorder-adoption.json'))
    const adoptions = manifest.families.flatMap(
      (family: { adoptions: unknown[] }) => family.adoptions,
    )
    const byId = new Map(
      adoptions.map((entry: { adoptionId: string }) => [entry.adoptionId, entry]),
    )
    const surfaces = new Set([
      'repeat-row',
      'object-card',
      'edge-to-edge-list',
      'continuous-structure',
    ])

    expect(manifest.version).toBe(2)
    expect(adoptions).toHaveLength(29)
    for (const adoption of adoptions) {
      expect(surfaces.has(adoption.contentSurface), adoption.adoptionId).toBe(true)
      expect(['inline', 'overlay']).toContain(adoption.railLayout)
      expect(adoption.contentOwner, adoption.adoptionId).toEqual({
        file: expect.stringMatching(/\.tsx$|\.css$/),
        fingerprint: expect.stringMatching(/\S/),
      })
      expect(adoption.railOwner, adoption.adoptionId).toEqual({
        file: expect.stringMatching(/\.tsx$|\.css$/),
        fingerprint: expect.stringMatching(/\S/),
      })
      expect(source(adoption.contentOwner.file)).toContain(adoption.contentOwner.fingerprint)
      expect(source(adoption.railOwner.file)).toContain(adoption.railOwner.fingerprint)
    }

    expect(
      [...byId.values()]
        .filter((entry) => entry.contentSurface === 'edge-to-edge-list')
        .map((entry) => entry.adoptionId)
        .sort(),
    ).toEqual(['asset/cutscene-import-frames', 'shop/stock'])
    expect(
      [...byId.values()]
        .filter((entry) => entry.contentSurface === 'continuous-structure')
        .map((entry) => entry.adoptionId)
        .sort(),
    ).toEqual([
      'asset/sprite-action-definitions',
      'map/layer-stack',
      'project/entry-points',
      'script/canonical-siblings',
      'script/legacy-siblings',
    ])
    expect(
      [...byId.values()]
        .filter((entry) => entry.railLayout === 'overlay')
        .map((entry) => entry.adoptionId),
    ).toEqual(['asset/frame-animation-timeline'])
    for (const adoptionId of [
      'enemy/ai-rules',
      'enemy-team/fixed-slots',
      'item/resource-reward-tiers',
      'actor/initial-magic',
      'story/dialogue-cue-rows',
      'story/set-party-members',
    ])
      expect(byId.get(adoptionId)?.contentSurface, adoptionId).toBe('repeat-row')
    for (const adoptionId of ['story/entity-behavior-schemes', 'story/scene-hook-variants'])
      expect(byId.get(adoptionId)?.contentSurface, adoptionId).toBe('object-card')
  })

  test('moves all six debt owners to DsRepeatRow instead of layering private skins', () => {
    const expectations: Array<[string, RegExp]> = [
      ['EnemyTab.tsx', /<DsRepeatRow[^>]*className="rule-row"/s],
      ['EnemyTeamTab.tsx', /<DsRepeatRow[^>]*className="enemy-team-slot"/s],
      ['ItemUseEffectEditor.tsx', /<DsRepeatRow[^>]*className="item-amount-row ordered"/s],
      ['ActorMode.tsx', /<DsRepeatRow[^>]*className="actor-initial-magic-row"/s],
      ['CommandForm.tsx', /<DsRepeatRow[^>]*className="cf-dialog-row"/s],
      ['CommandForm.tsx', /<DsRepeatRow[^>]*className="cf-party-row"/s],
    ]
    for (const [file, pattern] of expectations) expect(source(file), file).toMatch(pattern)
  })

  test('keeps the public wrapper neutral and rejects the old half-framed row skins', () => {
    const reorderCss = source('design-system/reorder.css')
    const item = cssRule(reorderCss, '.ds-reorder-item')
    for (const property of ['border:', 'padding:', 'background:', 'gap:'])
      expect(item, `.ds-reorder-item must not own ${property}`).not.toContain(property)

    const css = source('editor.css')
    for (const selector of [
      '.actor-initial-magic-row',
      '.enemy-team-slot',
      '.item-amount-row.ordered',
      '.cf-dialog-row',
      '.cf-party-row',
      '.rule-row',
    ]) {
      const rule = cssRule(css, selector)
      for (const property of ['border:', 'border-radius:', 'background:', 'padding:', 'margin:'])
        expect(rule, `${selector} must leave ${property} to DsRepeatRow`).not.toContain(property)
    }
    expect(css).not.toMatch(/\.rr-[\w-]+\s*\{[^}]*\bflex\s*:/s)
  })

  test('keeps Shop edge-to-edge while using the public compact action-group hit target', () => {
    const shop = source('ShopTab.tsx')
    const recipes = source('design-system/recipes.tsx')
    const recipeCss = source('design-system/recipes.css')
    expect(shop).toMatch(/<DsActionGroup[^>]*className="shop-stock-actions"/s)
    expect(shop).toContain('<div className="shop-stock-row">')
    expect(recipes).toContain('export function DsActionGroup')
    expect(
      cssRule(recipeCss, '.ds-action-group[data-density="compact"] .ds-icon-button'),
    ).toContain('var(--ds-hit-target-compact)')
    expect(cssRule(recipeCss, '.ds-action-group[data-density="compact"] .ds-button')).toContain(
      'min-width: var(--ds-hit-target-compact)',
    )
  })
})
