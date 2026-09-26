/**
 * TEST-GLM-ITEM-LOGIC-1 I1：装备效果派生残差（item.derived.background.test.ts）。
 * 去重：item.test.ts 已证 effectiveBattleSpriteId 四层优先、effectiveResistances 叠加与
 * 上限、effectiveSkills 去重保序、effectiveRegen hp/mp、grantStatus/attackAll、
 * describeEquipEffects 六例——本文件只补冻结池内：describeEquipEffects 的 regenMp/
 * maxPool mp/grantSkill 名称回退，effectiveStat 全函数（content 内零直测）、
 * resistance 与其它效果混装的跳过臂、map 外装备 id 的 `?? []` 回退族、
 * battleSprite byActor 空串不覆盖臂、grantStatus 双件去重臂。全部为纯函数：
 * 调用前独立快照、调用后比较同一入参。
 */
import { describe, expect, test } from 'vitest'
import {
  expectInputsUnchanged,
  hero,
  heroActor,
  item as makeItem,
} from './__tests__/glm-item-logic-fixtures.js'
import { expectAcceptsUnchanged } from './__tests__/guard-leaf-fixtures.js'
import type { CharacterInstance } from './character.js'
import {
  describeEquipEffects,
  type EquipEffect,
  effectiveBattleSpriteId,
  effectiveGrantedStatuses,
  effectiveRegen,
  effectiveResistances,
  effectiveSkills,
  effectiveStat,
  equipGrantsAttackAll,
  type ItemDataMap,
} from './item.js'

const char = (equipment: Record<string, string> = { accessory: 'oldRing' }) => {
  const base = hero()
  return { ...base, equipment } satisfies CharacterInstance
}

describe('I1 describeEquipEffects 残差', () => {
  test('regenMp 词条与 maxPool 的真气侧描述', () => {
    const effects: EquipEffect[] = [
      { kind: 'regenMp', amount: 20 },
      { kind: 'maxPool', pool: 'mp', delta: 30 },
    ]
    const input = [...effects]
    let lines: string[] = []
    expectAcceptsUnchanged((value) => {
      lines = describeEquipEffects(value)
    }, input)
    expect(lines).toEqual(['真气上限+30', '每回合回真气+20'])
  })

  test('grantSkill 无名称 resolver 时回退技能 id', () => {
    const input: EquipEffect[] = [{ kind: 'grantSkill', skillId: '336' }]
    let lines: string[] = []
    expectAcceptsUnchanged((value) => {
      lines = describeEquipEffects(value)
    }, input)
    expect(lines).toEqual(['习得·336'])
  })
})

describe('I1 effectiveStat（content 内零直测的派生口）', () => {
  const items: ItemDataMap = {
    sword: makeItem({
      id: 'sword',
      name: '剑',
      sellable: true,
      equip: {
        slot: 'weapon',
        equipableBy: ['hero'],
        effects: [
          { kind: 'statBonus', stat: 'attack', delta: 2 },
          { kind: 'statBonus', stat: 'defense', delta: 3 },
          { kind: 'resistance', element: 'fire', percent: 20 },
        ],
      },
    }),
  }

  test('同名 stat 累加、异 stat 与非 statBonus 不串扰，map 外装备 id 回退', () => {
    const c = char({ accessory: 'oldRing', weapon: 'sword' })
    let attack = 0
    let defense = 0
    let luck = 0
    expectAcceptsUnchanged((value) => {
      attack = effectiveStat(value, 'attack', items)
      defense = effectiveStat(value, 'defense', items)
      luck = effectiveStat(value, 'luck', items)
    }, c)
    expect(attack).toBe(12)
    expect(defense).toBe(13)
    expect(luck).toBe(10)
    const dangling = char({ accessory: 'gone-ring' })
    expectAcceptsUnchanged((value) => {
      attack = effectiveStat(value, 'attack', items)
    }, dangling)
    expect(attack).toBe(10)
  })
})

describe('I1 effectiveResistances 残差', () => {
  test('混装装备跳过非 resistance 效果；map 外 id 回退不影响其余件', () => {
    const items: ItemDataMap = {
      mixed: makeItem({
        id: 'mixed',
        name: '混装件',
        equip: {
          slot: 'weapon',
          equipableBy: ['hero'],
          effects: [
            { kind: 'statBonus', stat: 'attack', delta: 5 },
            { kind: 'resistance', element: 'wind', percent: 30 },
            { kind: 'resistance', element: 'poison', percent: 40 },
          ],
        },
      }),
    }
    const c = char({ accessory: 'gone-ring', weapon: 'mixed' })
    let result:
      | {
          elemRes: { wind: number; thunder: number; water: number; fire: number; earth: number }
          poisonRes: number
        }
      | undefined
    expectAcceptsUnchanged((value) => {
      result = effectiveResistances(value, items)
    }, c)
    expect(result?.elemRes.wind).toBe(30)
    expect(result?.elemRes.fire).toBe(0)
    expect(result?.poisonRes).toBe(40)
  })
})

describe('I1 effectiveSkills/effectiveBattleSpriteId 残差', () => {
  test('grantSkill 与 map 外装备 id：学习集在前、授予追加、map 外无影响', () => {
    const items: ItemDataMap = {
      skillRing: makeItem({
        id: 'skillRing',
        name: '授技珠',
        equip: {
          slot: 'accessory',
          equipableBy: ['hero'],
          effects: [{ kind: 'grantSkill', skillId: '336' }],
        },
      }),
    }
    const c = char({ accessory: 'skillRing', weapon: 'gone-sword' })
    let skills: string[] = []
    expectAcceptsUnchanged((value) => {
      skills = effectiveSkills(['100'], value, items)
    }, c)
    expect(skills).toEqual(['100', '336'])
  })

  test('battleSprite byActor 命中合法映射时覆盖前层（hasOwn 命中臂）', () => {
    const items: ItemDataMap = {
      bossSprite: makeItem({
        id: 'bossSprite',
        name: '首领形象件',
        equip: {
          slot: 'weapon',
          equipableBy: ['hero'],
          effects: [{ kind: 'battleSprite', byActor: { hero: 'battle.hero.boss' } }],
        },
      }),
    }
    const c = char({ weapon: 'bossSprite' })
    const actor = heroActor()
    let sprite: string | undefined
    expectInputsUnchanged(() => {
      sprite = effectiveBattleSpriteId(c, actor, items)
    }, [c, actor, items])
    expect(sprite).toBe('battle.hero.boss')
  })
})

describe('I1 grantStatus 去重/regen 下落臂/attackAll 回退族', () => {
  const items: ItemDataMap = {
    dualA: makeItem({
      id: 'dualA',
      name: '连击甲',
      equip: {
        slot: 'body',
        equipableBy: ['hero'],
        effects: [{ kind: 'grantStatus', status: 'dualAttack' }],
      },
    }),
    dualB: makeItem({
      id: 'dualB',
      name: '连击饰',
      equip: {
        slot: 'accessory',
        equipableBy: ['hero'],
        effects: [{ kind: 'grantStatus', status: 'dualAttack' }],
      },
    }),
    regenPiece: makeItem({
      id: 'regenPiece',
      name: '回气件',
      equip: {
        slot: 'weapon',
        equipableBy: ['hero'],
        effects: [{ kind: 'statBonus', stat: 'luck', delta: 1 }],
      },
    }),
  }

  test('两件授予同一状态只出一条；map 外 id 回退', () => {
    const c = char({ body: 'dualA', accessory: 'dualB' })
    let statuses: string[] = []
    expectAcceptsUnchanged((value) => {
      statuses = effectiveGrantedStatuses(value, items)
    }, c)
    expect(statuses).toEqual(['dualAttack'])
    const dangling = char({ accessory: 'gone-ring' })
    expectAcceptsUnchanged((value) => {
      statuses = effectiveGrantedStatuses(value, items)
      expect(equipGrantsAttackAll(value, items)).toBe(false)
    }, dangling)
    expect(statuses).toEqual([])
  })

  test('regen 装备件只含非 regen 效果时回蓝回血不变；map 外 id 回退', () => {
    const c = char({ weapon: 'regenPiece' })
    let regen: { hp: number; mp: number } | undefined
    expectAcceptsUnchanged((value) => {
      regen = effectiveRegen(value, items)
    }, c)
    expect(regen).toEqual({ hp: 0, mp: 0 })
    const dangling = char({ accessory: 'gone-ring' })
    expectAcceptsUnchanged((value) => {
      regen = effectiveRegen(value, items)
    }, dangling)
    expect(regen).toEqual({ hp: 0, mp: 0 })
  })
})
