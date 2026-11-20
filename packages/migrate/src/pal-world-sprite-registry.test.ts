import type { SpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { SourceEventObject, SourceScene } from './pal-source-types.js'
import { createPalWorldSpriteRegistry, migratedSpriteId } from './pal-world-sprite-registry.js'

function entity(id: number, spriteNum: number, nSpriteFrames?: number): SourceEventObject {
  return { id, x: 0, y: 0, spriteNum, ...(nSpriteFrames === undefined ? {} : { nSpriteFrames }) }
}

function scene(sceneId: number, ...eventObjects: SourceEventObject[]): SourceScene {
  return { sceneId, mapNum: sceneId + 1, eventObjects }
}

const hero: SpriteDef = {
  id: 'li-xiaoyao',
  asset: 'sprite.pal.002',
  label: '李逍遥(大世界)',
  layout: { kind: 'directional', framesPerDir: 3 },
}

function roleRegistry(event: SourceEventObject, role: SpriteDef, configured = true) {
  return createPalWorldSpriteRegistry([scene(20, event)], new Map([[2, role]]), {
    sceneSemanticSpriteIds: configured ? new Set([hero.id]) : new Set(),
  })
}

test('stable sprite IDs distinguish an explicit static variant from the base', () => {
  expect(migratedSpriteId(245)).toBe('sprite-245')
  expect(migratedSpriteId(7, 0)).toBe('sprite-7-f0')
  expect(migratedSpriteId(193, 5)).toBe('sprite-193-f5')
})

describe('registered scene layouts', () => {
  test('materializes a scene definition and its evidence only once when used', () => {
    const first = entity(2, 511)
    const second = entity(7, 511, 0)
    const registry = createPalWorldSpriteRegistry([scene(1, second, first)], new Map())
    expect([...registry.spriteDefs]).toEqual([])
    expect(registry.report.layoutEvidence).toEqual([])
    expect(registry.spriteRef(first)).toBe('sprite-511')
    expect(registry.spriteRef(second)).toBe('sprite-511')
    expect([...registry.spriteDefs.values()]).toEqual([
      {
        id: 'sprite-511',
        asset: 'sprite.pal.511',
        label: '原精灵 511',
        layout: { kind: 'static' },
      },
    ])
    expect(registry.report.layoutEvidence).toEqual([
      {
        spriteNum: 511,
        definitionId: 'sprite-511',
        source: 'scene',
        evidence: 'scene s001/e2 nSpriteFrames=0',
      },
    ])
  })

  test('rejects both an undeclared layout and an overlay-only reference without materializing either', () => {
    const registry = createPalWorldSpriteRegistry([scene(1, entity(1, 100, 3))], new Map())
    expect(() => registry.spriteRef(entity(2, 100, 4))).toThrow(
      'sprite 100 缺场景布局注册: nSpriteFrames=4',
    )
    expect(() => registry.spriteRef(entity(3, 627, 0))).toThrow(
      'sprite 627 缺场景布局注册: nSpriteFrames=0',
    )
    expect([...registry.spriteDefs]).toEqual([])
    expect(registry.report.layoutEvidence).toEqual([])
  })

  test('sorts source scenes and uses the lowest entity ID in a scene to choose a stable base', () => {
    const first = entity(2, 511, 3)
    const sameScene = entity(5, 511, 0)
    const later = entity(1, 511, 4)
    const registry = createPalWorldSpriteRegistry(
      [scene(9, later), scene(1, sameScene, first)],
      new Map(),
    )
    expect(registry.spriteRef(later)).toBe('sprite-511-f4')
    expect(registry.spriteRef(sameScene)).toBe('sprite-511-f0')
    expect(registry.spriteRef(first)).toBe('sprite-511')
    expect(registry.spriteDefs.get('sprite-511')?.layout).toEqual({
      kind: 'directional',
      framesPerDir: 3,
    })
    expect(registry.report.layoutConflicts).toEqual(['sprite-511-f0', 'sprite-511-f4'])
  })
})

describe('scene reuse of a party sprite', () => {
  test('uses a configured role definition without materializing a second definition', () => {
    const source = entity(344, 2, 3)
    const registry = roleRegistry(source, hero)
    expect(registry.spriteRef(source)).toBe('li-xiaoyao')
    expect([...registry.spriteDefs]).toEqual([])
    expect(registry.report.layoutEvidence).toEqual([])
  })

  test('uses the actual scene asset when the configured role points at a different asset', () => {
    const source = entity(344, 2, 3)
    const registry = roleRegistry(source, { ...hero, asset: 'sprite.pal.003' })
    expect(registry.spriteRef(source)).toBe('sprite-2')
    expect(registry.spriteDefs.get('sprite-2')?.asset).toBe('sprite.pal.002')
  })

  test('keeps the scene definition when the same role is outside the reviewed alias set', () => {
    const source = entity(344, 2, 3)
    const registry = roleRegistry(source, hero, false)
    expect(registry.spriteRef(source)).toBe('sprite-2')
    expect(registry.spriteDefs.get('sprite-2')?.asset).toBe('sprite.pal.002')
  })

  test('gives a different scene layout an independent variant of the same asset', () => {
    const source = entity(344, 2, 0)
    const registry = roleRegistry(source, hero)
    expect(registry.spriteRef(source)).toBe('sprite-2-f0')
    expect([...registry.spriteDefs.values()]).toEqual([
      { id: 'sprite-2-f0', asset: 'sprite.pal.002', label: '原精灵 2', layout: { kind: 'static' } },
    ])
  })
})

describe('PAL-specific script layouts', () => {
  test.each([
    [541, 0, { kind: 'static' }],
    [245, 3, { kind: 'directional', framesPerDir: 3 }],
    [534, 4, { kind: 'directional', framesPerDir: 4 }],
  ] as const)('retains the exact registered layout for sprite %i', (spriteNum, frameWidth, layout) => {
    const source = entity(4659, spriteNum, frameWidth)
    const registry = createPalWorldSpriteRegistry([scene(266, source)], new Map())
    const id = registry.spriteRef(source)
    expect(id).toBe(`sprite-${spriteNum}`)
    expect(registry.spriteDefs.get(id)).toEqual({
      id,
      asset: `sprite.pal.${spriteNum}`,
      label: `原精灵 ${spriteNum}(0x65 换装)`,
      layout,
    })
    expect(registry.report.layoutEvidence[0]?.source).toBe('pal-overlay')
  })

  test('keeps sprite 193 directional for scripts and an explicit static variant for scene use', () => {
    const sceneStatic = entity(1, 193, 0)
    const sceneDirectional = entity(2, 193, 3)
    const registry = createPalWorldSpriteRegistry(
      [scene(20, sceneStatic, sceneDirectional)],
      new Map(),
    )
    expect(registry.spriteRef(sceneStatic)).toBe('sprite-193-f0')
    expect(registry.spriteRef(sceneDirectional)).toBe('sprite-193')
    expect(registry.spriteDefs.get('sprite-193-f0')?.layout).toEqual({ kind: 'static' })
    expect(registry.spriteDefs.get('sprite-193')?.layout).toEqual({
      kind: 'directional',
      framesPerDir: 3,
    })
    expect(registry.report.layoutConflicts).toEqual(['sprite-193-f0'])
  })
})
