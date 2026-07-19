import { describe, expect, test } from 'vitest'
import type { ActorDef } from './actor.js'
import type { CharacterInstance } from './character.js'
import { applyHiddenExp, grantBattleRewards } from './rewards.js'

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
      battleSprite: 'li-xiaoyao-battle-sprite',
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

describe('B7c 隐藏经验(CHECK_HIDDEN_EXP)', () => {
  test('比例分配 ×2 + 过阈值 +R(1,2) + 余数回存;零行为跳过', () => {
    const c = mkChar({ attack: 30 })
    // 阈值表:level1 起阈值 10(全等级同阈,便于算)
    const table = Array.from({ length: 100 }, () => 10)
    // 行为:attack 计 3、maxHP 计 1 → total 4;expGained 20
    //   attack 池:trunc(20*3/4)*2 = 30 → 过 3 次阈值(30/10),attack += 3×R(1,2)=3(rng0)
    //   maxHP 池:trunc(20*1/4)*2 = 10 → 过 1 次,maxHP += 1
    const ups = applyHiddenExp(c, { attack: 3, maxHP: 1 }, 20, table, () => 0)
    expect(c.attack).toBe(33)
    expect(c.maxHP).toBe(101)
    expect(ups).toEqual([
      { characterId: 'li-xiaoyao', stat: 'maxHP', delta: 1 },
      { characterId: 'li-xiaoyao', stat: 'attack', delta: 3 },
    ])
    // 池 level 前进 + 余数回存
    expect(c.hiddenExp?.attack?.level).toBe(4) // 1 + 3 次
    expect(c.hiddenExp?.attack?.exp).toBe(0)
    // 零行为:无计数 → 不动
    const c2 = mkChar()
    expect(applyHiddenExp(c2, {}, 100, table, () => 0)).toEqual([])
    expect(c2.attack).toBe(30)
  })

  test('grantBattleRewards 集成:hiddenCounts 走通 → hiddenUps 报告', () => {
    const c = mkChar()
    // exp 5 < 阈值 10:主升级不触发,隔离隐藏路径
    const rep = grantBattleRewards(
      [c],
      {},
      { 'li-xiaoyao': actor(Array.from({ length: 100 }, () => 10)) },
      {},
      { exp: 5, cash: 0, hiddenCounts: { 'li-xiaoyao': { defense: 2 } } },
      rng0,
    )
    expect(c.level).toBe(1) // 主升级未触发
    // defense 池独占:trunc(5*2/2)*2 = 10 → 过 1 次阈值,defense += R(1,2)=1(rng0)
    expect(c.defense).toBe(21)
    expect(rep.hiddenUps).toEqual([{ characterId: 'li-xiaoyao', stat: 'defense', delta: 1 }])
  })
})
