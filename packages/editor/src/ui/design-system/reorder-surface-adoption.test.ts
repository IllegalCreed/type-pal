// @ts-nocheck -- static production/CSS gate; editor bundle intentionally has no Node types.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const uiRoot = join(here, '..')
const source = (file: string): string => readFileSync(join(uiRoot, file), 'utf8')

function cssRule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 's').exec(css)?.[1] ?? ''
}

function cssRuleInAtRule(css: string, atRule: string, selector: string): string {
  const escapedAtRule = atRule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (
    new RegExp(`${escapedAtRule}\\s*\\{[\\s\\S]*?${escapedSelector}\\s*\\{([^}]*)\\}`, 's').exec(
      css,
    )?.[1] ?? ''
  )
}

type JsxOwner = { tag: string; ancestors: string[] }

function classTokens(value: string): string[] {
  return value.split(/\s+/).filter(Boolean)
}

function fingerprintClassTokens(fingerprint: string): string[] {
  const literal = /className="([^"]+)"/.exec(fingerprint)?.[1]
  const template = /className=\{`([^`$}]*)/.exec(fingerprint)?.[1]
  return classTokens(literal ?? template ?? fingerprint)
}

function openingClassTokens(
  opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  sourceFile: ts.SourceFile,
): string[] {
  const attribute = opening.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'className',
  )
  const initializer = attribute?.initializer
  if (!initializer) return []
  if (ts.isStringLiteral(initializer)) return classTokens(initializer.text)
  if (!ts.isJsxExpression(initializer) || !initializer.expression) return []
  const expression = initializer.expression
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))
    return classTokens(expression.text)
  if (ts.isTemplateExpression(expression))
    return classTokens(
      [expression.head.text, ...expression.templateSpans.map((span) => span.literal.text)].join(
        ' ',
      ),
    )
  return []
}

function jsxOwners(file: string, fingerprint: string): JsxOwner[] {
  const content = source(file)
  const sourceFile = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const requiredTokens = fingerprintClassTokens(fingerprint)
  const owners: JsxOwner[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tokens = openingClassTokens(node, sourceFile)
      if (requiredTokens.length && requiredTokens.every((token) => tokens.includes(token))) {
        const ancestors: string[] = []
        const ownerElement = ts.isJsxOpeningElement(node) ? node.parent : node
        let current = ownerElement.parent
        while (current) {
          if (ts.isJsxElement(current))
            ancestors.push(current.openingElement.tagName.getText(sourceFile))
          current = current.parent
        }
        owners.push({ tag: node.tagName.getText(sourceFile), ancestors })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return owners
}

describe('reorder visible surface adoption gate', () => {
  test('freezes all 27 adoptions on independently evidenced content and rail axes', () => {
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
    expect(adoptions).toHaveLength(27)
    expect(
      Object.fromEntries(
        [...surfaces].map((surface) => [
          surface,
          adoptions.filter((entry) => entry.contentSurface === surface).length,
        ]),
      ),
    ).toEqual({
      'repeat-row': 8,
      'object-card': 12,
      'edge-to-edge-list': 3,
      'continuous-structure': 4,
    })
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
    ).toEqual(['asset/cutscene-import-frames', 'item/resource-reward-tiers', 'shop/stock'])
    expect(
      [...byId.values()]
        .filter((entry) => entry.contentSurface === 'continuous-structure')
        .map((entry) => entry.adoptionId)
        .sort(),
    ).toEqual([
      'map/layer-stack',
      'project/entry-points',
      'script/canonical-siblings',
      'script/legacy-siblings',
    ])
    expect(
      [...byId.values()]
        .filter((entry) => entry.railLayout === 'overlay')
        .map((entry) => entry.adoptionId)
        .sort(),
    ).toEqual(['item/craft-recipes'])
    for (const adoptionId of [
      'enemy/ai-rules',
      'enemy-team/fixed-slots',
      'actor/initial-magic',
      'story/dialogue-cue-rows',
      'story/set-party-members',
    ])
      expect(byId.get(adoptionId)?.contentSurface, adoptionId).toBe('repeat-row')
    for (const adoptionId of ['story/entity-behavior-schemes', 'story/scene-hook-variants'])
      expect(byId.get(adoptionId)?.contentSurface, adoptionId).toBe('object-card')
  })

  test('binds every row/card surface classification to its real JSX owner', () => {
    const manifest = JSON.parse(source('design-system/reorder-adoption.json'))
    const adoptions = manifest.families.flatMap(
      (family: { adoptions: unknown[] }) => family.adoptions,
    )

    for (const adoption of adoptions) {
      if (!['repeat-row', 'object-card', 'edge-to-edge-list'].includes(adoption.contentSurface))
        continue
      expect(adoption.contentOwner.file, adoption.adoptionId).toMatch(/\.tsx$/)
      const owners = jsxOwners(adoption.contentOwner.file, adoption.contentOwner.fingerprint)
      expect(owners, `${adoption.adoptionId} content owner`).toHaveLength(1)
      const owner = owners[0]!
      if (adoption.contentSurface === 'repeat-row')
        expect(owner.tag, `${adoption.adoptionId} must consume DsRepeatRow`).toBe('DsRepeatRow')
      else if (adoption.contentSurface === 'edge-to-edge-list')
        expect(owner.tag, `${adoption.adoptionId} edge row must not consume DsRepeatRow`).not.toBe(
          'DsRepeatRow',
        )
      else {
        expect(owner.tag, `${adoption.adoptionId} object card owner`).not.toBe('DsRepeatRow')
        expect(
          owner.ancestors,
          `${adoption.adoptionId} object card must not be wrapped by DsRepeatRow`,
        ).not.toContain('DsRepeatRow')
      }
    }
  })

  test('moves the remaining five debt owners to DsRepeatRow instead of layering private skins', () => {
    const expectations: Array<[string, RegExp]> = [
      ['EnemyTab.tsx', /<DsRepeatRow[^>]*className="rule-row"/s],
      ['EnemyTeamTab.tsx', /<DsRepeatRow[^>]*className="enemy-team-slot"/s],
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

  test('keeps Shop and spirit-gourd edge-to-edge with one density owner per action group', () => {
    const shop = source('ShopTab.tsx')
    const recipes = source('design-system/recipes.tsx')
    const recipeCss = source('design-system/recipes.css')
    expect(shop).toMatch(/<DsActionGroup[^>]*density="compact"[^>]*className="shop-stock-actions"/s)
    expect(shop).toContain('<div className="shop-stock-row">')
    const alchemy = source('ItemAlchemyEditors.tsx')
    expect(alchemy).toMatch(
      /export function ResourceRewardTierList[\s\S]*?<DsActionGroup[^>]*density="default"[^>]*className="item-alchemy-row-actions"/s,
    )
    expect(alchemy).toContain('<div className="item-alchemy-reward-row">')
    expect(alchemy).not.toMatch(/<DsRepeatRow[^>]*className="item-alchemy-reward-row"/s)
    expect(recipes).toContain('export function DsActionGroup')
    expect(
      cssRule(recipeCss, '.ds-action-group[data-density="compact"] .ds-icon-button'),
    ).toContain('var(--ds-hit-target-compact)')
    expect(cssRule(recipeCss, '.ds-action-group[data-density="compact"] .ds-button')).toContain(
      'min-width: var(--ds-hit-target-compact)',
    )
    const defaultIcons = cssRule(
      recipeCss,
      '.ds-action-group[data-density="default"] .ds-icon-button',
    )
    for (const property of ['width', 'min-width', 'height', 'min-height'])
      expect(defaultIcons).toContain(`${property}: var(--ds-control-height)`)
    expect(cssRule(recipeCss, '.ds-action-group[data-density="default"] .ds-button')).toContain(
      'min-height: var(--ds-control-height)',
    )

    const businessCss = source('editor.css')
    expect(cssRule(businessCss, '.item-alchemy-row-actions')).toBe('')
    expect(cssRule(businessCss, '.item-alchemy-row-action-slot')).not.toContain('grid-area')
    expect(
      cssRule(businessCss, '.item-alchemy-reward-row > .item-alchemy-row-action-slot'),
    ).toContain('grid-area: actions')
    expect(
      cssRule(businessCss, '.item-alchemy-recipe-row__header > .item-alchemy-row-action-slot'),
    ).toContain('grid-area: actions')
    const recipeRail = cssRule(
      businessCss,
      '.ds-reorder-item.item-alchemy-recipe-item[data-layout="overlay"] > .ds-reorder-item__rail',
    )
    expect(recipeRail).toContain('inset-block-start: 0')
    expect(recipeRail).toContain('block-size: var(--item-alchemy-recipe-header-height)')
    const mediumRewardRow = cssRuleInAtRule(
      businessCss,
      '@container item-alchemy (max-width: 760px)',
      '.item-alchemy-reward-row',
    )
    expect(mediumRewardRow).toContain('"cost flow reward reward"')
    expect(mediumRewardRow).toContain('"count count count actions"')
    const narrowRewardRow = cssRuleInAtRule(
      businessCss,
      '@container item-alchemy (max-width: 520px)',
      '.item-alchemy-reward-row',
    )
    expect(narrowRewardRow).toContain('"cost cost cost"')
    expect(narrowRewardRow).toContain('"flow reward reward"')
    expect(narrowRewardRow).toContain('"count count actions"')
    expect(businessCss).not.toMatch(
      /\.item-alchemy-reward-row\s*>\s*\.item-alchemy-formula-arrow\s*\{[^}]*transform:/s,
    )
  })
})
