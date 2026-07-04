import { describe, expect, test } from 'vitest'
import type { ActorDef } from './actor.js'
import type { CharacterInstance } from './character.js'
import { grantBattleRewards } from './rewards.js'

function mkChar(o: Partial<CharacterInstance> = {}): CharacterInstance {
  return {
    id: 'li-xiaoyao',
    template: 'li-xiaoyao',
    level: 1,
    exp: 0,
    hp: 50,
    maxHP: 100,
    mp: 10,
    maxMP: 30,
    attack: 30,
    defense: 20,
    magicAttack: 25,
    speed: 40,
    luck: 30,
    equipment: {},
    ...o,
  } as CharacterInstance
}

const actor = (expTable: number[]): ActorDef =>
  ({
    id: 'li-xiaoyao',
    name: 'name.li-xiaoyao',
    spriteId: 'li-xiaoyao',
    battler: {
      baseStats: {} as never,
      initialEquipment: {},
      initialMagic: [],
      leveling: { expTable },
    },
  }) as ActorDef

const rng0 = () => 0 // 掷骰全取下限

describe('B7a 战后结算', () => {
  test('升级:扣减式 exp、成长下限、HP/MP 回满、学技能', () => {
    const c = mkChar()
    const ls: Record<string, string[]> = { 'li-xiaoyao': [] }
    // level1 阈值 15、level2 阈值 30;给 20 exp → 升到 2,余 5
    const rep = grantBattleRewards(
      [c],
      ls,
      { 'li-xiaoyao': actor([10, 15, 30]) },
      { 'li-xiaoyao': [{ level: 2, skillId: '345' }] },
      { exp: 20, cash: 7 },
      rng0,
    )
    expect(c.level).toBe(2)
    expect(c.exp).toBe(5)
    expect(c.maxHP).toBe(110) // +10+R(0,7)=+10
    expect(c.maxMP).toBe(38) // +8
    expect(c.attack).toBe(34) // +4
    expect(c.defense).toBe(22) // +2
    expect(c.luck).toBe(32) // +2 固定
    // 升级回满 → Phase F 半恢复无变化
    expect(c.hp).toBe(110)
    expect(ls['li-xiaoyao']).toContain('345')
    expect(rep.levelUps).toMatchObject([
      { characterId: 'li-xiaoyao', from: 1, to: 2, learned: ['345'] },
    ])
    // B7b:升级屏 8 属性 old→cur 快照(before level 1 / after level 2)
    const lu = rep.levelUps[0]!
    expect(lu.before.level).toBe(1)
    expect(lu.after.level).toBe(2)
    expect(lu.after.maxHP).toBeGreaterThan(lu.before.maxHP)
  })

  test('不升级:exp 累计 + Phase F 半恢复', () => {
    const c = mkChar({ hp: 40, mp: 10 })
    const rep = grantBattleRewards(
      [c],
      {},
      { 'li-xiaoyao': actor([10, 999]) },
      {},
      { exp: 3, cash: 0 },
      rng0,
    )
    expect(c.level).toBe(1)
    expect(c.exp).toBe(3)
    expect(c.hp).toBe(40 + Math.floor((100 - 40) / 2)) // 70
    expect(c.mp).toBe(10 + Math.floor((30 - 10) / 2)) // 20
    expect(rep.levelUps).toEqual([])
  })

  test('死者不获经验,但吃 Phase F 半恢复(调用方先回 1 血 = 原版战后复活观感)', () => {
    const c = mkChar({ hp: 1, exp: 0 })
    grantBattleRewards([c], {}, {}, {}, { exp: 100, cash: 0 }, rng0)
    // 无 expTable(actorsById 空)→ 直接累计;hp 1 → 半恢复
    expect(c.exp).toBe(100)
    const dead = mkChar({ hp: 0 })
    grantBattleRewards([dead], {}, {}, {}, { exp: 100, cash: 0 }, rng0)
    expect(dead.exp).toBe(0) // 死者无经验
    expect(dead.hp).toBe(50) // 但半恢复(0 + (100-0)/2)
  })
})
