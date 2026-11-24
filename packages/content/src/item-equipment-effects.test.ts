/** Equipment display and derived character stats. */
import { describe, expect, test } from 'vitest'
import {
  expectInputsUnchanged,
  hero,
  heroActor,
  item as makeItem,
} from './__tests__/item-world-fixtures.js'
import { expectAcceptsUnchanged } from './__tests__/validation-assertions.js'
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

describe('describeEquipEffects', () => {
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

describe('effectiveStat（content 内零直测的派生口）', () => {
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
    expectInputsUnchanged(() => {
      attack = effectiveStat(c, 'attack', items)
    }, [c, items])
    expect(attack).toBe(12)
    let defense = 0
    expectInputsUnchanged(() => {
      defense = effectiveStat(c, 'defense', items)
    }, [c, items])
    expect(defense).toBe(13)
    let luck = 0
    expectInputsUnchanged(() => {
      luck = effectiveStat(c, 'luck', items)
    }, [c, items])
    expect(luck).toBe(10)
    const dangling = char({ accessory: 'gone-ring' })
    expectInputsUnchanged(() => {
      attack = effectiveStat(dangling, 'attack', items)
    }, [dangling, items])
    expect(attack).toBe(10)
  })
})

describe('effectiveResistances', () => {
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
    expectInputsUnchanged(() => {
      result = effectiveResistances(c, items)
    }, [c, items])
    expect(result?.elemRes.wind).toBe(30)
    expect(result?.elemRes.fire).toBe(0)
    expect(result?.poisonRes).toBe(40)
  })
})

describe('effectiveSkills/effectiveBattleSpriteId', () => {
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
    const learned = ['100']
    let skills: string[] = []
    expectInputsUnchanged(() => {
      skills = effectiveSkills(learned, c, items)
    }, [learned, c, items])
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

describe('grantStatus 去重/regen 下落臂/attackAll 回退族', () => {
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
    expectInputsUnchanged(() => {
      statuses = effectiveGrantedStatuses(c, items)
    }, [c, items])
    expect(statuses).toEqual(['dualAttack'])
    const dangling = char({ accessory: 'gone-ring' })
    expectInputsUnchanged(() => {
      statuses = effectiveGrantedStatuses(dangling, items)
    }, [dangling, items])
    expect(statuses).toEqual([])
    let attackAll = true
    expectInputsUnchanged(() => {
      attackAll = equipGrantsAttackAll(dangling, items)
    }, [dangling, items])
    expect(attackAll).toBe(false)
  })

  test('regen 装备件只含非 regen 效果时回蓝回血不变；map 外 id 回退', () => {
    const c = char({ weapon: 'regenPiece' })
    let regen: { hp: number; mp: number } | undefined
    expectInputsUnchanged(() => {
      regen = effectiveRegen(c, items)
    }, [c, items])
    expect(regen).toEqual({ hp: 0, mp: 0 })
    const dangling = char({ accessory: 'gone-ring' })
    expectInputsUnchanged(() => {
      regen = effectiveRegen(dangling, items)
    }, [dangling, items])
    expect(regen).toEqual({ hp: 0, mp: 0 })
  })
})
