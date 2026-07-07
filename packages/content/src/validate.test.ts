import { describe, expect, test } from 'vitest'
import { validateActors, validateScenes, validateSprites } from './validate.js'

const mkScene = (over: Record<string, unknown> = {}): unknown => ({
  id: 's',
  map: { reuseOriginalMap: 1, room: { col: 0, row: 0, cols: 1, rows: 1 } },
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
  ...over,
})
const mkEnt = (ref: Record<string, unknown>): Record<string, unknown> => ({
  id: 'e',
  pos: { col: 0, row: 0, height: 0 },
  ...ref,
})

describe('validateScenes · paletteId', () => {
  test('无 paletteId → 通过(可选,缺省 0 由调用方兜)', () => {
    expect(() => validateScenes([mkScene()])).not.toThrow()
  })
  test('paletteId 是 number → 通过', () => {
    expect(() => validateScenes([mkScene({ paletteId: 0 })])).not.toThrow()
  })
  test('paletteId 非 number → throw', () => {
    expect(() => validateScenes([mkScene({ paletteId: '0' })])).toThrow('paletteId 非number')
  })
})

describe('validateScenes · 实体 actor ⊕ sprite(C0)', () => {
  test('actor 形态 / sprite 形态 → 各自通过', () => {
    expect(() =>
      validateScenes([mkScene({ entities: [mkEnt({ actor: 'youhun' })] })]),
    ).not.toThrow()
    expect(() =>
      validateScenes([mkScene({ entities: [mkEnt({ sprite: 'vase' })] })]),
    ).not.toThrow()
  })
  test('两者都有 → throw(M3a:恰一 actor/sprite/zone)', () => {
    expect(() =>
      validateScenes([mkScene({ entities: [mkEnt({ actor: 'a', sprite: 's' })] })]),
    ).toThrow('现 2 个')
  })
  test('两者都无 → throw', () => {
    expect(() => validateScenes([mkScene({ entities: [mkEnt({})] })])).toThrow('现 0 个')
  })
  test('zone 触发区:zone:true 单独合法', () => {
    expect(() => validateScenes([mkScene({ entities: [mkEnt({ zone: true })] })])).not.toThrow()
  })
})

const layout = { kind: 'directional', framesPerDir: 3 }

describe('validateSprites(含 layout,C0)', () => {
  test('合法数组 → 原样返回', () => {
    const sprites = [
      { id: 'ghost', spriteNum: 16, label: '游魂', layout },
      { id: 'oldman', spriteNum: 2, label: '老者', layout: { kind: 'static' } },
      { id: 'pool', spriteNum: 30, label: '血池', layout: { kind: 'loop', frameCount: 24 } },
    ]
    expect(validateSprites(sprites)).toEqual(sprites)
  })
  test('非数组 → throw', () => {
    expect(() => validateSprites({})).toThrow('期望数组')
  })
  test('缺 spriteNum → throw', () => {
    expect(() => validateSprites([{ id: 'ghost', label: '游魂', layout }])).toThrow(
      '缺键 "spriteNum"',
    )
  })
  test('spriteNum 非数字 → throw', () => {
    expect(() =>
      validateSprites([{ id: 'ghost', spriteNum: '16', label: '游魂', layout }]),
    ).toThrow('spriteNum 非number')
  })
  test('缺 layout → throw', () => {
    expect(() => validateSprites([{ id: 'ghost', spriteNum: 16, label: '游魂' }])).toThrow(
      '缺键 "layout"',
    )
  })
  test('layout.kind 非法 → throw', () => {
    expect(() =>
      validateSprites([{ id: 'g', spriteNum: 1, label: 'x', layout: { kind: 'walk' } }]),
    ).toThrow('kind 非法')
  })
  test('directional 缺 framesPerDir → throw', () => {
    expect(() =>
      validateSprites([{ id: 'g', spriteNum: 1, label: 'x', layout: { kind: 'directional' } }]),
    ).toThrow('缺 framesPerDir')
  })
  test('loop 缺 frameCount → throw', () => {
    expect(() =>
      validateSprites([{ id: 'g', spriteNum: 1, label: 'x', layout: { kind: 'loop' } }]),
    ).toThrow('缺 frameCount')
  })
})

describe('validateActors(C0)', () => {
  const battler = { baseStats: {}, initialEquipment: {}, initialMagic: [] }
  test('合法(带/不带 battler)→ 原样返回', () => {
    const actors = [
      { id: 'youhun', name: 'name.youhun', spriteId: 'ghost' },
      { id: 'hero', name: 'name.hero', spriteId: 'hero-s', battler },
    ]
    expect(validateActors(actors)).toEqual(actors)
  })
  test('缺 spriteId → throw', () => {
    expect(() => validateActors([{ id: 'a', name: 'n' }])).toThrow('缺键 "spriteId"')
  })
  test('name 非 string → throw', () => {
    expect(() => validateActors([{ id: 'a', name: 1, spriteId: 's' }])).toThrow('name 非string')
  })
  test('battler 缺 baseStats → throw', () => {
    expect(() =>
      validateActors([
        { id: 'a', name: 'n', spriteId: 's', battler: { initialEquipment: {}, initialMagic: [] } },
      ]),
    ).toThrow('缺键 "baseStats"')
  })
})
