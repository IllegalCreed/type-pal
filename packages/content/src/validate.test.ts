import { describe, expect, test } from 'vitest'
import {
  validateActors,
  validateEnemies,
  validateItems,
  validateLocale,
  validateScenes,
  validateSkills,
  validateSprites,
} from './validate.js'

const mkScene = (over: Record<string, unknown> = {}): unknown => ({
  id: 's',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
  ...over,
})
const mkEnt = (ref: Record<string, unknown>): Record<string, unknown> => ({
  id: 'e',
  pos: { col: 0, row: 0, height: 0 },
  ...ref,
})

describe('validateScenes · 实体 actor ⊕ sprite(C0)', () => {
  test('actor 形态 / sprite 形态 → 各自通过', () => {
    expect(() =>
      validateScenes([mkScene({ entities: [mkEnt({ actor: 'youhun' })] })]),
    ).not.toThrow()
    expect(() => validateScenes([mkScene({ entities: [mkEnt({ sprite: 'vase' })] })])).not.toThrow()
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
  test('战斗音效只接受可选 AssetId，拒绝旧数字', () => {
    expect(() =>
      validateActors([
        {
          id: 'a',
          name: 'n',
          spriteId: 's',
          battler: { ...battler, sounds: { attack: 9 } },
        },
      ]),
    ).toThrow('期望非空 AssetId')
  })
})

test('技能、物品和敌人音效 guard 拒绝旧数字与负号协议', () => {
  expect(() =>
    validateSkills({
      skills: [
        {
          id: '1',
          name: 'n',
          cost: {},
          target: 'oneEnemy',
          effects: [],
          animation: { effectSprite: 1, sound: 45 },
        },
      ],
      levelUp: {},
    }),
  ).toThrow('期望非空 AssetId')
  expect(() =>
    validateItems([
      {
        id: '151',
        name: '引路蜂',
        desc: [],
        icon: 1,
        buyPrice: 1,
        sellPrice: 1,
        sellable: true,
        use: { consuming: true, effects: [], sound: 45 },
      },
    ]),
  ).toThrow('期望非空 AssetId')
  expect(() =>
    validateEnemies([
      {
        id: 'enemy-1',
        name: 'name.enemy-1',
        stats: {},
        ai: {},
        anim: {},
        sounds: { magic: -47 },
      },
    ]),
  ).toThrow('期望非空 AssetId')
})

describe('validateLocale · 对话行边界', () => {
  test('新内容禁止 locale 内换行；loader 兼容边界可显式保留旧软换行', () => {
    expect(() => validateLocale({ old: '第一行\n第二行' })).toThrow(/DialogueCue\.rows/)
    expect(validateLocale({ old: '第一行\n第二行' }, { allowLegacySoftWrap: true })).toEqual({
      old: '第一行\n第二行',
    })
  })
})
