import type { SpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { SourceEventObject, SourceScene } from './pal-source-types.js'
import { createPalWorldSpriteRegistry } from './pal-world-sprite-registry.js'

const scene = (sceneId: number, eventObjects: SourceEventObject[]): SourceScene => ({
  sceneId,
  mapNum: sceneId + 1,
  eventObjects,
})
const entity = (id: number, spriteNum: number, nSpriteFrames: number): SourceEventObject => ({
  id,
  x: 0,
  y: 0,
  spriteNum,
  nSpriteFrames,
})
const liXiaoyaoSprite: SpriteDef = {
  id: 'li-xiaoyao',
  asset: 'sprite.pal.002',
  label: '李逍遥(大世界)',
  layout: { kind: 'directional', framesPerDir: 3 },
}
function materialize(sources: SourceScene[], roles = new Map<number, SpriteDef>(), options = {}) {
  const registry = createPalWorldSpriteRegistry(sources, roles, options)
  const references = [...sources]
    .sort((a, b) => a.sceneId - b.sceneId)
    .flatMap((s) =>
      [...s.eventObjects].sort((a, b) => a.id - b.id).map((e) => registry.spriteRef(e)),
    )
  return { references, sprites: [...registry.spriteDefs.values()], report: registry.report }
}
describe('static world sprite layout registry', () => {
  test('strict role identity serves scene references without duplicate definitions', () => {
    const output = materialize([scene(0, [entity(1, 2, 3)])], new Map([[2, liXiaoyaoSprite]]), {
      sceneSemanticSpriteIds: new Set(['li-xiaoyao']),
    })
    expect(output.references).toEqual(['li-xiaoyao'])
    expect(output.sprites.filter(({ asset }) => asset === 'sprite.pal.002')).toEqual([])
  })
  test('a role candidate with a different asset stays independent', () => {
    const output = materialize(
      [scene(0, [entity(1, 2, 3)])],
      new Map([[2, { ...liXiaoyaoSprite, asset: 'sprite.pal.003' }]]),
      { sceneSemanticSpriteIds: new Set(['li-xiaoyao']) },
    )
    expect(output.references).toEqual(['sprite-2'])
    expect(output.sprites).toContainEqual({
      id: 'sprite-2',
      asset: 'sprite.pal.002',
      label: '原精灵 2',
      layout: { kind: 'directional', framesPerDir: 3 },
    })
  })
  test('a role candidate with a different layout keeps an explicit scene variant', () => {
    const output = materialize([scene(0, [entity(1, 2, 0)])], new Map([[2, liXiaoyaoSprite]]), {
      sceneSemanticSpriteIds: new Set(['li-xiaoyao']),
    })
    expect(output.references).toEqual(['sprite-2-f0'])
    expect(output.sprites).toContainEqual({
      id: 'sprite-2-f0',
      asset: 'sprite.pal.002',
      label: '原精灵 2',
      layout: { kind: 'static' },
    })
    expect(output.sprites.some(({ id }) => id === 'li-xiaoyao')).toBe(false)
  })
  test('pre-registration stays lazy and later scene evidence supplies a stable static definition', () => {
    const registry = createPalWorldSpriteRegistry(
      [scene(0, [entity(1, 100, 0)]), scene(3, [entity(2, 541, 0)])],
      new Map(),
    )
    expect(registry.spriteDefs.size).toBe(0)
    expect(registry.spriteRef(entity(2, 541, 0))).toBe('sprite-541')
    expect([...registry.spriteDefs.values()]).toEqual([
      {
        id: 'sprite-541',
        asset: 'sprite.pal.541',
        label: '原精灵 541(0x65 换装)',
        layout: { kind: 'static' },
      },
    ])
  })
  test('scene source order does not change identities, layout conflicts or definition order', () => {
    const early = scene(2, [entity(10, 100, 0), entity(11, 445, 0)]),
      late = scene(9, [entity(12, 541, 0), entity(13, 445, 1)])
    expect(materialize([late, early])).toEqual(materialize([early, late]))
  })
  test('scene nSpriteFrames=3 evidence retains directional/3', () => {
    expect(materialize([scene(3, [entity(2, 245, 3)])]).sprites).toEqual([
      {
        id: 'sprite-245',
        asset: 'sprite.pal.245',
        label: '原精灵 245(0x65 换装)',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
    ])
  })
  test('overlay-only registrations do not become used definitions or undeclared scene references', () => {
    const registry = createPalWorldSpriteRegistry([scene(0, [entity(1, 100, 0)])], new Map())
    registry.spriteRef(entity(1, 100, 0))
    expect(registry.spriteDefs.has('sprite-627')).toBe(false)
    expect(registry.report.layoutEvidence.some(({ spriteNum }) => spriteNum === 627)).toBe(false)
    expect(() => registry.spriteRef(entity(2, 627, 0))).toThrow(/缺场景布局注册/)
  })
  test('534 directional/4 evidence does not fall back to directional/3', () => {
    expect(
      materialize([scene(0, [entity(1, 534, 4)])]).sprites.find(({ id }) => id === 'sprite-534')
        ?.layout,
    ).toEqual({ kind: 'directional', framesPerDir: 4 })
  })
  test('511 scene static evidence yields one stable definition', () => {
    const output = materialize([scene(5, [entity(2, 511, 0)])])
    expect(output.sprites).toEqual([
      {
        id: 'sprite-511',
        asset: 'sprite.pal.511',
        label: '原精灵 511',
        layout: { kind: 'static' },
      },
    ])
    expect(output.references).toEqual(['sprite-511'])
  })
  test('two scene layouts of one resource receive stable distinct definitions', () => {
    const output = materialize([scene(8, [entity(21, 700, 3)]), scene(3, [entity(20, 700, 0)])])
    expect(output.sprites).toEqual([
      {
        id: 'sprite-700',
        asset: 'sprite.pal.700',
        label: '原精灵 700',
        layout: { kind: 'static' },
      },
      {
        id: 'sprite-700-f3',
        asset: 'sprite.pal.700',
        label: '原精灵 700',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
    ])
    expect(output.report.layoutConflicts).toContain('sprite-700-f3')
  })
  test('193 overlay keeps directional base while a static scene remains an explicit -f0 variant', () => {
    expect(
      materialize([scene(2, [entity(1, 193, 3)]), scene(5, [entity(2, 193, 0)])]).sprites,
    ).toEqual([
      {
        id: 'sprite-193',
        asset: 'sprite.pal.193',
        label: '原精灵 193(0x65 换装)',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
      {
        id: 'sprite-193-f0',
        asset: 'sprite.pal.193',
        label: '原精灵 193',
        layout: { kind: 'static' },
      },
    ])
  })
})
