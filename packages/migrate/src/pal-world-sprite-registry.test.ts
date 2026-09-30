import type { SpriteDef } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import type { SourceScene } from './pal-source-types.js'
import { createPalWorldSpriteRegistry, migratedSpriteId } from './pal-world-sprite-registry.js'

const scene = (spriteNum: number, nSpriteFrames: number): SourceScene => ({
  sceneId: 0,
  mapNum: 1,
  eventObjects: [{ id: 1, x: 0, y: 0, spriteNum, nSpriteFrames }],
})

describe('shared static sprite registry', () => {
  it('registers evidence without materializing unused definitions', () => {
    const registry = createPalWorldSpriteRegistry([scene(999, 3)], new Map())
    expect(registry.spriteDefs.size).toBe(0)
    expect(registry.spriteRef(scene(999, 3).eventObjects[0]!)).toBe('sprite-999')
    expect([...registry.spriteDefs.keys()]).toEqual(['sprite-999'])
    expect(registry.report.layoutEvidence).toHaveLength(1)
  })

  it('rejects undeclared scene layouts without materializing definitions', () => {
    const registry = createPalWorldSpriteRegistry(
      [scene(999, 3), { ...scene(999, 2), sceneId: 1 }],
      new Map(),
    )
    expect(() => registry.spriteRef(scene(999, 4).eventObjects[0]!)).toThrow(/缺场景布局注册/)
  })

  it('shares only explicitly configured semantic scene aliases with matching layouts', () => {
    const role: SpriteDef = {
      id: 'role',
      asset: 'sprite.pal.001',
      label: 'role',
      layout: { kind: 'directional', framesPerDir: 3 },
    }
    const roles = new Map([[1, role]])
    const registry = createPalWorldSpriteRegistry(
      [scene(1, 3), { ...scene(1, 2), sceneId: 1 }],
      roles,
      { sceneSemanticSpriteIds: new Set(['role']) },
    )
    expect(registry.spriteRef(scene(1, 3).eventObjects[0]!)).toBe('role')
    expect(registry.spriteRef(scene(1, 2).eventObjects[0]!)).toBe('sprite-1-f2')
    expect(registry.spriteDefs.has('role')).toBe(false)
    const withoutAlias = createPalWorldSpriteRegistry([scene(1, 3)], roles)
    expect(withoutAlias.spriteRef(scene(1, 3).eventObjects[0]!)).toBe('sprite-1')
  })
})

describe('migratedSpriteId：中性 SpriteDef 稳定身份', () => {
  it('编号直映射；布局变体仅在显式给定时追加 -f<n>', () => {
    expect(migratedSpriteId(245)).toBe('sprite-245')
    expect(migratedSpriteId(1)).toBe('sprite-1')
    expect(migratedSpriteId(193, 5)).toBe('sprite-193-f5')
    expect(migratedSpriteId(7, 0)).toBe('sprite-7-f0')
  })
})
