/**
 * TEST-CONTENT-RESIDUAL-1 A12：validate-refs 数据引用轴残项（validate-refs.ts）。
 * validate-refs.contracts.test.ts 已覆盖实体 actor/entryPoint/mapId/levelUp skillId 单轴——
 * 本文件补 r2 收敛后的余轴：world appearance.battleSprite（:412-423）、商店货单→items
 * （:1594）、levelUp 属主悬空（:1655）；可选切片缺席对照。onLose/onFlee 须走当前合法
 * startBattle 载荷、scriptChunks 无当前非空消费者证据不新增旧分片正例（r2 归类）。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-residual-fixtures.js'
import { buildWorld, type CharacterInstance } from './character.js'
import * as c from './index.js'
import type { ContentBundle } from './validate-refs.js'
import { validateReferences } from './validate-refs.js'

/** 经正式 buildWorld 构造的合法 world（ContentBundle.worlds 元素形态，可选形象覆写）。 */
const legalWorld = (appearance?: CharacterInstance['appearance']) => {
  const base = buildWorld(
    {
      party: ['hero'],
      money: 25,
      inventory: [{ itemId: 'item-ok', count: 2 }],
      seedStats: { hero: { hp: 30, mp: 4 } },
    },
    { hero: bundle().actors[0]! },
  )
  if (!appearance) return base
  const hero = base.party[0]!
  return { ...base, party: [{ ...hero, appearance }] }
}

const bundle = (): ContentBundle => {
  const value: ContentBundle = {
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
  }
  c.validateAuthorScenes(value.scenes)
  c.validateActors(value.actors)
  c.validateSprites(value.sprites)
  c.validateBattleSprites(value.battleSprites)
  c.validateMapIndex(value.mapIndex)
  c.validateAuthorItems(value.items)
  c.validateSkills({ skills: value.skills, levelUp: value.levelUp })
  for (const entry of value.entryPoints) c.validateStartWorld(entry.startWorld)
  if (c.validateReferences(value).length) throw new Error('fixture references must be valid')
  return value
}

describe('A12 world appearance.battleSprite 数据引用轴（正式 buildWorld 构造）', () => {
  test('合法 world（含形象覆写+学习技能+装备数值）先零 issue；悬空 battleSprite → 精确 error；实际入参快照', () => {
    // 正控：合法 battleSprite 形象覆写经 buildWorld 建立后零 issue（结构+引用双自证）
    const okBundle = bundle()
    okBundle.items = [
      { id: 'item-ok', name: '合法物', desc: [], buyPrice: 1, sellPrice: 1, sellable: true },
    ]
    c.validateAuthorItems(okBundle.items)
    okBundle.worlds = [legalWorld({ spriteId: 'sprite.hero', battleSprite: 'bs-hero' })]
    const okSnapshot = deepSnapshot(okBundle)
    expect(validateReferences(okBundle)).toEqual([])
    expect(okBundle).toEqual(okSnapshot)
    // 单轴坏：battleSprite 悬空（其余字段不变）
    const withGhost = bundle()
    withGhost.items = okBundle.items
    withGhost.worlds = [legalWorld({ spriteId: 'sprite.hero', battleSprite: 'bs-ghost' })]
    const ghostSnapshot = deepSnapshot(withGhost)
    const issues = validateReferences(withGhost)
    expect(issues).toEqual([
      {
        severity: 'error',
        where: 'worlds[0].party[0].appearance.battleSprite',
        message: '战斗精灵 "bs-ghost" 不在 battleSprites 注册表',
      },
    ])
    expect(withGhost).toEqual(ghostSnapshot) // 消费后实际 bundle（含 world）不变
  })
})

describe('A12 商店货单 → items 数据引用轴（实际入参快照）', () => {
  test('货单引用悬空物品 → 精确 error；正控合法货单零 issue；消费前后 bundle 不变', () => {
    const withShop = bundle()
    withShop.items = [
      { id: 'item-ok', name: '合法物', desc: [], buyPrice: 1, sellPrice: 1, sellable: true },
    ]
    withShop.shops = [{ id: 1, items: ['item-ok', 'item-ghost'] }]
    c.validateAuthorItems(withShop.items)
    c.validateShops(withShop.shops)
    const shopSnapshot = deepSnapshot(withShop)
    const issues = validateReferences(withShop)
    expect(issues).toEqual([
      {
        severity: 'error',
        where: 'shops[0](1).items[1]',
        message: '商店物品 "item-ghost" 不在 items',
      },
    ])
    expect(withShop).toEqual(shopSnapshot) // 实际传入 bundle（含 shops/items 数据）不变
    const legal = bundle()
    legal.items = [
      { id: 'item-ok', name: '合法物', desc: [], buyPrice: 1, sellPrice: 1, sellable: true },
    ]
    legal.shops = [{ id: 1, items: ['item-ok'] }]
    c.validateAuthorItems(legal.items)
    c.validateShops(legal.shops)
    const legalSnapshot = deepSnapshot(legal)
    expect(validateReferences(legal)).toEqual([])
    expect(legal).toEqual(legalSnapshot)
  })
})

describe('A12 levelUp 属主轴（合法技能下单轴坏 owner）', () => {
  test('合法技能引用的 levelUp 零 issue；仅 owner 悬空 → warn；owner+技能双坏并列不吞并', () => {
    // 单轴正控：owner 存在、技能存在 → 零 issue
    const ok = bundle()
    ok.skills = [
      {
        id: 'skill-a',
        name: '技能A',
        desc: '',
        cost: { mp: 1 },
        usableOutsideBattle: true,
        target: 'oneAlly',
        effects: [],
        animation: { effectSprite: 0 },
      },
    ]
    ok.levelUp = { hero: [{ level: 2, skillId: 'skill-a' }] }
    c.validateSkills({ skills: ok.skills, levelUp: ok.levelUp })
    const okSnapshot = deepSnapshot(ok)
    expect(validateReferences(ok)).toEqual([])
    expect(ok).toEqual(okSnapshot)
    // 单轴坏：仅 owner 悬空（技能合法）
    const ownerOnly = bundle()
    ownerOnly.skills = ok.skills
    ownerOnly.levelUp = { ghost: [{ level: 2, skillId: 'skill-a' }] }
    c.validateSkills({ skills: ownerOnly.skills, levelUp: ownerOnly.levelUp })
    const ownerSnapshot = deepSnapshot(ownerOnly)
    expect(validateReferences(ownerOnly)).toEqual([
      {
        severity: 'warn', // 现行 companion 政策
        where: 'levelUp[ghost]',
        message: '升级习得伴随表角色 "ghost" 不在 actors',
      },
    ])
    expect(ownerOnly).toEqual(ownerSnapshot)
    // 组合：owner 与技能双悬空 → 两条并列（去重检查，不互相吞并）
    const both = bundle()
    both.levelUp = { ghost: [{ level: 2, skillId: 'any' }] }
    c.validateSkills({ skills: both.skills, levelUp: both.levelUp })
    const bothSnapshot = deepSnapshot(both)
    expect(validateReferences(both)).toEqual([
      {
        severity: 'warn',
        where: 'levelUp[ghost]',
        message: '升级习得伴随表角色 "ghost" 不在 actors',
      },
      {
        severity: 'warn',
        where: 'levelUp[ghost][0].skillId',
        message: '升级习得 "any" 不在 skills',
      },
    ])
    expect(both).toEqual(bothSnapshot)
    expect(bundle().levelUp).toEqual({}) // 基线空 levelUp（缺席语义：无键无 issue）
    expect(validateReferences(bundle())).toEqual([])
  })
  test('验证后实际输入逐值不变（深快照同一 bundle 对象）', () => {
    const value = bundle()
    const snapshot = deepSnapshot(value)
    validateReferences(value)
    expect(value).toEqual(snapshot)
  })
})
