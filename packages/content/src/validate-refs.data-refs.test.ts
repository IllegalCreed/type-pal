/**
 * TEST-CONTENT-RESIDUAL-1 A12：validate-refs 数据引用轴残项（validate-refs.ts）。
 * validate-refs.contracts.test.ts 已覆盖实体 actor/entryPoint/mapId/levelUp skillId 单轴——
 * 本文件补 r2 收敛后的余轴：world appearance.battleSprite（:412-423）、商店货单→items
 * （:1594）、levelUp 属主悬空（:1655）；可选切片缺席对照。onLose/onFlee 须走当前合法
 * startBattle 载荷、scriptChunks 无当前非空消费者证据不新增旧分片正例（r2 归类）。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-residual-fixtures.js'
import type { ContentBundle } from './validate-refs.js'
import { validateReferences } from './validate-refs.js'

const bundle = (): ContentBundle =>
  ({
    scenes: [
      {
        id: 's1',
        mapId: 'map-a',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'e1', actor: 'hero', pos: { col: 1, row: 1, height: 0 } }],
      },
    ],
    actors: [
      {
        id: 'hero',
        name: 'name.hero',
        spriteId: 'sprite.hero',
        battler: {
          baseStats: {
            level: 1,
            hp: 10,
            maxHP: 10,
            mp: 5,
            maxMP: 5,
            attack: 1,
            defense: 1,
            magicAttack: 1,
            speed: 1,
            luck: 1,
          },
          initialEquipment: {},
          initialMagic: [],
          battleSprite: 'bs-hero',
        },
      },
    ],
    skills: [],
    levelUp: {},
    items: [],
    locale: { 'name.hero': '主角' },
    sprites: [
      { id: 'sprite.hero', label: '主角', asset: 'sprite.hero', layout: { kind: 'static' } },
    ],
    battleSprites: [
      {
        id: 'bs-hero',
        label: '主角',
        asset: 'battle.hero',
        profile: {
          kind: 'player-fighter',
          frames: {
            idle: 0,
            dying: 1,
            dead: 2,
            defend: 3,
            hurt: 4,
            preMagic: 5,
            magic: 6,
            attackWindup: 7,
            attackRush: 8,
            attackStrike: 9,
          },
          castEffectBase: 0,
          attackEffectBase: 0,
        },
      },
    ],
    entryPoints: [
      {
        id: 'main',
        label: '入口',
        scene: 's1',
        startWorld: { party: ['hero'], money: 0, inventory: [] },
      },
    ],
    mapIndex: { version: 1, maps: [{ id: 'map-a', name: 'A', path: 'maps/a.json' }] },
  }) as unknown as ContentBundle

describe('A12 world appearance.battleSprite 数据引用轴', () => {
  test('队员 appearance.battleSprite 悬空 → 精确 error；补回后零 issue（完整往返）', () => {
    const withGhost = bundle()
    ;(withGhost as unknown as { worlds: unknown[] }).worlds = [
      {
        party: [{ id: 'w-hero', template: 'hero', appearance: { battleSprite: 'bs-ghost' } }],
        money: 0,
        inventory: [],
      },
    ]
    const issues = validateReferences(withGhost)
    expect(issues).toEqual([
      {
        severity: 'error',
        where: 'worlds[0].party[0].appearance.battleSprite',
        message: '战斗精灵 "bs-ghost" 不在 battleSprites 注册表',
      },
    ])
    const repaired = bundle()
    ;(repaired as unknown as { worlds: unknown[] }).worlds = [
      {
        party: [{ id: 'w-hero', template: 'hero', appearance: { battleSprite: 'bs-hero' } }],
        money: 0,
        inventory: [],
      },
    ]
    expect(validateReferences(repaired)).toEqual([])
  })
})

describe('A12 商店货单 → items 数据引用轴', () => {
  test('货单引用悬空物品 → 精确 error；正控合法货单零 issue', () => {
    const withShop = bundle()
    withShop.items = [
      {
        id: 'item-ok',
        name: '合法物',
        desc: [],
        buyPrice: 1,
        sellPrice: 1,
        sellable: true,
      },
    ]
    withShop.shops = [
      { id: 1, items: ['item-ok', 'item-ghost'] },
    ]
    const issues = validateReferences(withShop)
    expect(issues).toEqual([
      {
        severity: 'error',
        where: 'shops[0](1).items[1]',
        message: '商店物品 "item-ghost" 不在 items',
      },
    ])
    const legal = bundle()
    legal.items = [
      { id: 'item-ok', name: '合法物', desc: [], buyPrice: 1, sellPrice: 1, sellable: true },
    ]
    legal.shops = [{ id: 1, items: ['item-ok'] }]
    expect(validateReferences(legal)).toEqual([])
  })
})

describe('A12 levelUp 属主悬空 + 可选切片缺席对照', () => {
  test('levelUp 键角色不在 actors → warn（companion 降级政策）；空 levelUp 缺席语义不产生 issue', () => {
    const withOwner = bundle()
    withOwner.levelUp = { ghost: [{ level: 2, skillId: 'any' }] }
    const issues = validateReferences(withOwner)
    // 完整多重集合：属主悬空 warn + 其条目技能悬空 warn（同键两轴都报，不互相吞并）
    expect(issues).toEqual([
      {
        severity: 'warn', // 现行 ACTOR_REFERENCE_POLICIES['level-up-owner'].danglingSeverity
        where: 'levelUp[ghost]',
        message: '升级习得伴随表角色 "ghost" 不在 actors',
      },
      {
        severity: 'warn',
        where: 'levelUp[ghost][0].skillId',
        message: '升级习得 "any" 不在 skills',
      },
    ])
    expect(bundle().levelUp).toEqual({}) // 基线带空 levelUp（缺席语义：无键无 issue）
    expect(validateReferences(bundle())).toEqual([])
  })
  test('验证后实际输入逐值不变（深快照同一 bundle 对象）', () => {
    const value = bundle()
    const snapshot = deepSnapshot(value)
    validateReferences(value)
    expect(value).toEqual(snapshot)
  })
})
