import { describe, expect, test } from 'vitest'
import {
  validateActors,
  validateBattleFields,
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
      { id: 'ghost', asset: 'sprite.ghost', label: '游魂', layout },
      { id: 'oldman', asset: 'sprite.oldman', label: '老者', layout: { kind: 'static' } },
      { id: 'pool', asset: 'sprite.pool', label: '血池', layout: { kind: 'loop', frameCount: 24 } },
    ]
    expect(validateSprites(sprites)).toEqual(sprites)
  })
  test('非数组 → throw', () => {
    expect(() => validateSprites({})).toThrow('期望数组')
  })
  test('缺 asset → throw', () => {
    expect(() => validateSprites([{ id: 'ghost', label: '游魂', layout }])).toThrow('缺键 "asset"')
  })
  test('旧 spriteNum/path 与空 asset → throw', () => {
    expect(() =>
      validateSprites([
        { id: 'ghost', asset: 'sprite.ghost', spriteNum: 16, label: '游魂', layout },
      ]),
    ).toThrow('spriteNum: 已退役')
    expect(() =>
      validateSprites([
        {
          id: 'ghost',
          asset: 'sprite.ghost',
          path: 'assets/sprites/ghost.rle',
          label: '游魂',
          layout,
        },
      ]),
    ).toThrow('path: 已退役')
    expect(() => validateSprites([{ id: 'ghost', asset: '', label: '游魂', layout }])).toThrow(
      '期望非空 AssetId',
    )
  })
  test('缺 layout → throw', () => {
    expect(() => validateSprites([{ id: 'ghost', asset: 'sprite.ghost', label: '游魂' }])).toThrow(
      '缺键 "layout"',
    )
  })
  test('layout.kind 非法 → throw', () => {
    expect(() =>
      validateSprites([{ id: 'g', asset: 'sprite.g', label: 'x', layout: { kind: 'walk' } }]),
    ).toThrow('kind 非法')
  })
  test('directional 缺 framesPerDir → throw', () => {
    expect(() =>
      validateSprites([
        { id: 'g', asset: 'sprite.g', label: 'x', layout: { kind: 'directional' } },
      ]),
    ).toThrow('缺 framesPerDir')
  })
  test('loop 缺 frameCount → throw', () => {
    expect(() =>
      validateSprites([{ id: 'g', asset: 'sprite.g', label: 'x', layout: { kind: 'loop' } }]),
    ).toThrow('缺 frameCount')
  })
  test('布局计数必须是正整数，姿势帧号与播放参数完整校验', () => {
    for (const framesPerDir of [0, -1, 1.5])
      expect(() =>
        validateSprites([
          {
            id: 'g',
            asset: 'sprite.g',
            label: 'x',
            layout: { kind: 'directional', framesPerDir },
          },
        ]),
      ).toThrow(/正整数/)
    for (const frameCount of [0, -1, 1.5])
      expect(() =>
        validateSprites([
          { id: 'g', asset: 'sprite.g', label: 'x', layout: { kind: 'loop', frameCount } },
        ]),
      ).toThrow(/正整数/)
    expect(() =>
      validateSprites([
        {
          id: 'g',
          asset: 'sprite.g',
          label: 'x',
          layout: { kind: 'static' },
          poses: { 坏动作: { frames: [], mode: 'static' } },
        },
      ]),
    ).toThrow(/非空数组/)
    expect(() =>
      validateSprites([
        {
          id: 'g',
          asset: 'sprite.g',
          label: 'x',
          layout: { kind: 'static' },
          poses: { 坏动作: { frames: [0], mode: 'bad' } },
        },
      ]),
    ).toThrow(/mode: 非法/)
  })
  test('id 唯一，且可与 catalog 的 sprite kind 交叉校验', () => {
    const def = { id: 'g', asset: 'sprite.g', label: 'x', layout: { kind: 'static' } }
    const record = {
      path: 'assets/authored/sprites/g.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 1,
      sha256: 'a'.repeat(64),
      origin: { kind: 'authored' as const },
    }
    expect(() => validateSprites([def, def])).toThrow('重复 id')
    expect(() => validateSprites([def], { version: 1, assets: {} })).toThrow('不在 catalog')
    expect(() =>
      validateSprites([def], {
        version: 1,
        assets: { 'sprite.g': { ...record, kind: 'tileset' } },
      }),
    ).toThrow('期望 sprite')
    expect(
      validateSprites([def], {
        version: 1,
        assets: { 'sprite.g': { ...record, kind: 'sprite' } },
      }),
    ).toEqual([def])
  })
})

describe('validateActors(C0)', () => {
  const battler = {
    battleSprite: 'hero-battle-sprite',
    baseStats: {},
    initialEquipment: {},
    initialMagic: [],
  }
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
  test('立绘组与 face 只接受 AssetId，expressions 全量检查', () => {
    expect(() =>
      validateActors([
        {
          id: 'a',
          name: 'n',
          spriteId: 's',
          portraits: { default: 'portrait.a', expressions: { hurt: 'portrait.a.hurt' } },
          face: 'face.a',
        },
      ]),
    ).not.toThrow()
    expect(() =>
      validateActors([{ id: 'a', name: 'n', spriteId: 's', portraits: { default: 1 } }]),
    ).toThrow('期望非空 AssetId')
    expect(() =>
      validateActors([
        {
          id: 'a',
          name: 'n',
          spriteId: 's',
          portraits: { default: 'portrait.a', expressions: { hurt: 2 } },
        },
      ]),
    ).toThrow('期望非空 AssetId')
    expect(() => validateActors([{ id: 'a', name: 'n', spriteId: 's', face: 1 }])).toThrow(
      '期望非空 AssetId',
    )
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
        battleSprite: 'enemy-battle-1',
        yPosOffset: 0,
        stats: {},
        ai: {},
        sounds: { magic: -47 },
      },
    ]),
  ).toThrow('期望非空 AssetId')
})

test('物品图标和战场背景拒绝旧数字/路径字段，缺席语义合法', () => {
  const item = {
    id: '277',
    name: '无图物品',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  }
  expect(validateItems([item])).toEqual([item])
  expect(() => validateItems([{ ...item, icon: 1 }])).toThrow('期望非空 AssetId')
  expect(() =>
    validateBattleFields([
      {
        id: 6,
        bg: 'battle/bg/006.png',
        screenWave: 0,
        magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    ]),
  ).toThrow('旧路径字段已退役')
  expect(() =>
    validateBattleFields([
      {
        id: 6,
        background: 6,
        screenWave: 0,
        magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
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
