/**
 * battle-levelup.test.ts —— D11 战斗胜利升级(battleWonLevelUp)。
 *
 * 对照 sdlpal `PAL_BattleWon`(battle.c:1088-1120 升级 loop + 1300-1321 学法术)+
 * `PAL_PlayerLevelUp`(global.c:2347 stat 成长)。mock exp 进阈值 → 核对 level/stats/满血/exp余/学法术。
 *
 * stat 成长用可控 rng(rangeInclusive:()=>0 → 增长取确定下界 base),核对精确值。
 */

import type { LevelUpMagicEntry, PlayerRole } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  createInitialGameState,
  type GameState,
  projectRuntimeToBattleRoles,
} from '../../game-state.js'
import { createSeedableRng, type SeedableRng } from '../../rng.js'
import { battleWonLevelUp } from '../battle-system.js'

/** rng 取确定下界(rangeInclusive 恒返 0)→ stat 增长 = base(10/8/4/4/2/2/2)。 */
function rng0(): SeedableRng {
  return { ...createSeedableRng(1), rangeInclusive: () => 0 }
}

/** 建带单角色 runtime 的 gs。 */
function makeGs(role0: {
  level: number
  hp: number
  maxHP: number
  mp?: number
  maxMP?: number
  exp?: number
  attackStrength?: number
  magicStrength?: number
  defense?: number
  dexterity?: number
  fleeRate?: number
}): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  const rt = gs.PlayerRolesRuntime
  rt.rgwLevel[0] = role0.level
  rt.rgwHP[0] = role0.hp
  rt.rgwMaxHP[0] = role0.maxHP
  rt.rgwMP[0] = role0.mp ?? 0
  rt.rgwMaxMP[0] = role0.maxMP ?? 30
  rt.rgwAttackStrength[0] = role0.attackStrength ?? 20
  rt.rgwMagicStrength[0] = role0.magicStrength ?? 15
  rt.rgwDefense[0] = role0.defense ?? 10
  rt.rgwDexterity[0] = role0.dexterity ?? 8
  rt.rgwFleeRate[0] = role0.fleeRate ?? 5
  gs.Exp.rgPrimaryExp[0] = { wExp: role0.exp ?? 0, wLevel: role0.level }
  gs.partyMembers = [0]
  return gs
}

/** levelUpExp[level] = 阈值(稀疏)。 */
function expTable(map: Record<number, number>): number[] {
  const arr: number[] = []
  for (const [lvl, v] of Object.entries(map)) arr[Number(lvl)] = v
  return arr
}

describe('battleWonLevelUp —— D11 战斗胜利升级', () => {
  it('exp 进阈值 → 升 1 级 + stat 成长 + HP/MP 满 + exp 余数(user mock 场景)', () => {
    // 1 级,残血 50/100,exp 0;levelUpExp[1]=100;打怪得 100 exp → 刚好升 1 级
    const gs = makeGs({
      level: 1,
      hp: 50,
      maxHP: 100,
      mp: 10,
      maxMP: 30,
      exp: 0,
      attackStrength: 20,
      defense: 10,
    })
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 100,
      levelUpExp: expTable({ 1: 100 }),
      levelUpMagic: [],
      rng: rng0(),
    })
    const rt = gs.PlayerRolesRuntime
    expect(rt.rgwLevel[0]).toBe(2) // 1 → 2
    // stat 成长(rng=0 → base):maxHP+10 / maxMP+8 / attack+4 / magic+4 / def+2 / dex+2 / flee+2
    expect(rt.rgwMaxHP[0]).toBe(110)
    expect(rt.rgwMaxMP[0]).toBe(38)
    expect(rt.rgwAttackStrength[0]).toBe(24)
    expect(rt.rgwMagicStrength[0]).toBe(19)
    expect(rt.rgwDefense[0]).toBe(12)
    expect(rt.rgwDexterity[0]).toBe(10)
    expect(rt.rgwFleeRate[0]).toBe(7)
    // 升级 HP/MP 回满(battle.c:1115)
    expect(rt.rgwHP[0]).toBe(110)
    expect(rt.rgwMP[0]).toBe(38)
    // exp 余数 0(100-100)+ wLevel 同步
    expect(gs.Exp.rgPrimaryExp[0]!.wExp).toBe(0)
    expect(gs.Exp.rgPrimaryExp[0]!.wLevel).toBe(2)
    expect(results).toMatchObject([{ roleId: 0, fromLevel: 1, toLevel: 2, learnedMagics: [] }])
    // D11b 升级 box 快照(old→cur):无装备 → 有效值=base
    expect(results[0]!.snapshot).toMatchObject({
      level: { old: 1, cur: 2 },
      hp: { old: 50, oldMax: 100, cur: 110, curMax: 110 },
      mp: { old: 10, oldMax: 30, cur: 38, curMax: 38 },
      attack: { old: 20, cur: 24 },
      defense: { old: 10, cur: 12 },
    })
  })

  it('exp 不够 → 不升级,exp 累积(余数 = 旧+得),不动属性/HP', () => {
    const gs = makeGs({ level: 1, hp: 50, maxHP: 100, exp: 30 })
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 40,
      levelUpExp: expTable({ 1: 100 }),
      levelUpMagic: [],
      rng: rng0(),
    })
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(1) // 不升
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(50) // HP 不变(不满血)
    expect(gs.PlayerRolesRuntime.rgwMaxHP[0]).toBe(100) // 属性不变
    expect(gs.Exp.rgPrimaryExp[0]!.wExp).toBe(70) // 30+40 累积
    expect(results).toEqual([]) // 无升级
  })

  it('exp 远超阈值 → 连升多级(余数正确)', () => {
    // 1 级,exp 0;levelUpExp[1]=100 / [2]=100 / [3]=100;得 250 exp → 1→3,余 50
    const gs = makeGs({ level: 1, hp: 50, maxHP: 100 })
    battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 250,
      levelUpExp: expTable({ 1: 100, 2: 100, 3: 100 }),
      levelUpMagic: [],
      rng: rng0(),
    })
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(3) // 连升 2 级
    expect(gs.PlayerRolesRuntime.rgwMaxHP[0]).toBe(120) // +10 ×2
    expect(gs.Exp.rgPrimaryExp[0]!.wExp).toBe(50) // 250-100-100
  })

  it('死队员(runtime hp=0)不获 exp / 不升级', () => {
    const gs = makeGs({ level: 1, hp: 0, maxHP: 100, exp: 0 })
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 999,
      levelUpExp: expTable({ 1: 100 }),
      levelUpMagic: [],
      rng: rng0(),
    })
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(1) // 死人不升
    expect(gs.Exp.rgPrimaryExp[0]!.wExp).toBe(0) // 不获 exp
    expect(results).toEqual([])
  })

  it('升级学新法术:level-up-magic[j][role] level<=新等级 + magic!=0 + 未学 → AddMagic', () => {
    const gs = makeGs({ level: 1, hp: 50, maxHP: 100 })
    // level-up-magic:[j][role0]:{level:2,magic:349}(2 级学)/ {level:30,magic:354}(30 级,不学)/ {level:0,magic:0}(空)
    const lum: LevelUpMagicEntry[][] = [
      [{ level: 2, magic: 349 }],
      [{ level: 30, magic: 354 }],
      [{ level: 0, magic: 0 }],
    ]
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 100, // 升到 2 级
      levelUpExp: expTable({ 1: 100 }),
      levelUpMagic: lum,
      rng: rng0(),
    })
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(2)
    // 学了 349(level 2<=2),没学 354(level 30>2)、没学 0(空)
    expect(results[0]!.learnedMagics).toEqual([349])
    // 写进 runtime.rgwMagic 第一个空槽
    expect(gs.PlayerRolesRuntime.rgwMagic[0]![0]).toBe(349)
  })

  it('已学法术不重复学(PAL_AddMagic 去重)', () => {
    const gs = makeGs({ level: 1, hp: 50, maxHP: 100 })
    gs.PlayerRolesRuntime.rgwMagic[0]![0] = 349 // 已学 349
    const lum: LevelUpMagicEntry[][] = [[{ level: 2, magic: 349 }]]
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 100,
      levelUpExp: expTable({ 1: 100 }),
      levelUpMagic: lum,
      rng: rng0(),
    })
    expect(results[0]!.learnedMagics).toEqual([]) // 已学 → 不重复
  })

  it('满级(MAX_LEVELS=99):exp 仍扣但不再升级 / 不长属性', () => {
    const gs = makeGs({ level: 99, hp: 100, maxHP: 100, exp: 0, attackStrength: 50 })
    battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 250,
      levelUpExp: expTable({ 99: 100 }),
      levelUpMagic: [],
      rng: rng0(),
    })
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(99) // 不超 99
    expect(gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(50) // 属性不长
    expect(gs.Exp.rgPrimaryExp[0]!.wExp).toBe(50) // 250-100-100 扣到 < 100
  })

  it('STAT_LIMIT cap 999:属性接近上限 → clamp 999', () => {
    const gs = makeGs({ level: 1, hp: 50, maxHP: 998 })
    battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 100,
      levelUpExp: expTable({ 1: 100 }),
      levelUpMagic: [],
      rng: rng0(),
    })
    expect(gs.PlayerRolesRuntime.rgwMaxHP[0]).toBe(999) // 998+10=1008 → cap 999
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(999) // 满血也 cap
  })

  it('levelUpExp 缺省([])→ 不升级,exp 仍累积(向后兼容 fixture/测试)', () => {
    const gs = makeGs({ level: 1, hp: 50, maxHP: 100, exp: 10 })
    battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 5000,
      levelUpExp: [],
      levelUpMagic: [],
      rng: rng0(),
    })
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(1)
    expect(gs.Exp.rgPrimaryExp[0]!.wExp).toBe(5010) // 10+5000
  })

  it('D11×M5:升级写 runtime → 投影 → 下一场战斗吃升级后属性(整链闭环)', () => {
    const gs = makeGs({ level: 1, hp: 50, maxHP: 100, attackStrength: 20, magicStrength: 15 })
    battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 100,
      levelUpExp: expTable({ 1: 100 }),
      levelUpMagic: [],
      rng: rng0(),
    })
    // 升级后 runtime(攻击 20→24,等级 1→2)
    expect(gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(24)
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(2)
    // 投影到战斗 roles —— 下一场战斗用的是升级后属性(原架构裂缝:战斗永远用 1 级基线)
    const staticRoles = {
      roles: [
        {
          id: 0,
          _name: 'r0',
          level: 1,
          attackStrength: 20,
          hp: 100,
          maxHP: 100,
          mp: 0,
          maxMP: 30,
          magicStrength: 15,
          defense: 0,
          dexterity: 0,
          fleeRate: 0,
          poisonResistance: 0,
          elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        } as any as PlayerRole,
      ],
    }
    const battleRoles = projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, staticRoles)
    expect(battleRoles.roles[0]!.attackStrength).toBe(24) // 战斗吃升级后攻击
    expect(battleRoles.roles[0]!.level).toBe(2)
    expect(battleRoles.roles[0]!.hp).toBe(gs.PlayerRolesRuntime.rgwHP[0]) // 满血战果也带入
  })

  it('真值表:lv1 + 1000 经验 → lv7 → 学会 天师符法(magic 349;user 实测"没学新法术"真因核查)', () => {
    // 真值表内联(level-up-exp.json 前 10 项 + 李逍遥 role0 真值 level-up-magic:lv7=349 天师符法)
    const realExp = [0, 15, 40, 90, 165, 265, 390, 540, 715, 915]
    const realMagic: LevelUpMagicEntry[][] = [
      [{ level: 7, magic: 349 }], // role0 lv7 学 天师符法(其余角色省略 → entry[0] 即 role0)
      [{ level: 8, magic: 311 }], // role0 lv8 学 天罡战气(本例升不到 8,验证 level 门控)
    ]
    const gs = makeGs({ level: 1, hp: 30, maxHP: 30, exp: 1000 }) // fixture-levelup expOverrides=1000
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 0,
      levelUpExp: realExp,
      levelUpMagic: realMagic,
      rng: rng0(),
    })
    // 1000 经验跨 15/40/90/165/265/390=965,余 35<540 → lv7
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(7)
    // lv7 学 349(天师符法)→ learnedMagics + 写进 runtime.rgwMagic 首槽;lv8 的 311 不学(8>7 门控)
    expect(results[0]!.learnedMagics).toEqual([349])
    expect(gs.PlayerRolesRuntime.rgwMagic.some((slot) => slot[0] === 349)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwMagic.some((slot) => slot[0] === 311)).toBe(false)
  })
})
