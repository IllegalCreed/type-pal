/**
 * TEST-GLM-NEW-H-1 / H02 — battle-progression 当前公开合同补测。
 *
 * applyHiddenExpGrowth 在 battle-system.test.ts 只有 3 条基础直测(单池/total=0/占比);
 * battle-levelup.test.ts 只测主升级。本文件按 CHECK_HIDDEN_EXP 宏(battle.c:1238-1293)一手真值补:
 *  - wLevel > 99 先钳 99(battle.c:1248-1252);99 级上 while 继续扣 exp 涨属性、wLevel 停 99
 *  - 隐藏涨点**无 STAT_LIMIT 999 钳**(宏内无 cap —— 与主升级 global.c:2440 明确不同)
 *  - 七池严格 Health→…→Flee 序消费 RandomLong(1,2)(battle.c:1276-1282 顺序)
 *  - battleWonLevelUp:隐藏经验抬了 maxHP 但**无主升级** → 不回满(battle.c:1287-1292 if(fLevelUp))
 */
import { describe, expect, it } from 'vitest'
import {
  makeHBattle,
  makeHRole,
  recordingRng,
  seededRng,
} from '../../__tests__/glm-next-wave/H/harness.js'
import type { SeedableRng } from '../rng.js'
import { applyHiddenExpGrowth, battleWonLevelUp } from './battle-progression.js'

const oneRng: { rangeInclusive: (a: number, b: number) => number } = {
  rangeInclusive: (_a: number, _b: number) => 1,
}

describe('applyHiddenExpGrowth —— CHECK_HIDDEN_EXP 宏边角(battle.c:1238-1293)', () => {
  it('wLevel=120 先钳 99;99 级上继续扣阈值涨属性,wLevel 停 99 不再 ++', () => {
    const gs = makeHBattle().gs
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
    gs.Exp.rgHealthExp[0] = { wExp: 0, wLevel: 120, wCount: 1 } // >99 → 先钳 99
    // levelUpExp[99]=100;dwExp = trunc(1000*1/1)*2 = 2000 → 99 级上扣 20 次,每次 +R(1,2)=1
    const res = applyHiddenExpGrowth({
      exp: gs.Exp,
      rt: gs.PlayerRolesRuntime,
      roleId: 0,
      expGained: 1000,
      levelUpExp: Array(100).fill(100),
      rng: oneRng,
    })
    expect(gs.PlayerRolesRuntime.rgwMaxHP[0]).toBe(120) // 100 + 20×1
    expect(gs.Exp.rgHealthExp[0]!.wLevel).toBe(99) // 停在 99(MAX_LEVELS)
    expect(gs.Exp.rgHealthExp[0]!.wExp).toBe(0)
    expect(res).toEqual([{ stat: 'rgwMaxHP', label: 'maxHP', statLabelWord: 49, delta: 20 }])
  })

  it('隐藏涨点无 STAT_LIMIT 999 钳:base 998 再涨 → 突破 999(与主升级 cap 明确不同)', () => {
    const gs = makeHBattle().gs
    gs.PlayerRolesRuntime.rgwAttackStrength[0] = 998
    gs.Exp.rgAttackExp[0] = { wExp: 0, wLevel: 0, wCount: 1 }
    applyHiddenExpGrowth({
      exp: gs.Exp,
      rt: gs.PlayerRolesRuntime,
      roleId: 0,
      expGained: 100, // dwExp = 200 → 两级(阈值 100),998+1+1=1000
      levelUpExp: Array(100).fill(100),
      rng: oneRng,
    })
    expect(gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(1000) // 无 999 clamp
    expect(gs.Exp.rgAttackExp[0]!.wLevel).toBe(2)
  })

  it('多池同涨:R(1,2) 按 Health→Magic 严格序消费(rng 调用序可证)', () => {
    // 脚本化 rng:第一次 R(1,2)=2(Health),第二次=1(Magic)—— 若顺序颠倒断言即翻
    const seq: number[] = [2, 1]
    let i = 0
    const orderRng: SeedableRng = {
      ...seededRng(1),
      rangeInclusive: (lo: number, hi: number) => {
        void lo
        void hi
        return seq[i++] ?? 1
      },
    }
    const gs = makeHBattle().gs
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 100
    gs.Exp.rgHealthExp[0] = { wExp: 0, wLevel: 0, wCount: 1 }
    gs.Exp.rgMagicExp[0] = { wExp: 0, wLevel: 0, wCount: 1 }
    const res = applyHiddenExpGrowth({
      exp: gs.Exp,
      rt: gs.PlayerRolesRuntime,
      roleId: 0,
      expGained: 100, // 每池 dwExp=200 → 各涨 1 级
      levelUpExp: Array(100).fill(100),
      rng: orderRng,
    })
    expect(gs.PlayerRolesRuntime.rgwMaxHP[0]).toBe(102) // 首个 R(1,2)=2 → Health
    expect(gs.PlayerRolesRuntime.rgwMaxMP[0]).toBe(101) // 次个 R(1,2)=1 → Magic
    expect(res.map((r) => r.stat)).toEqual(['rgwMaxHP', 'rgwMaxMP'])
  })
})

describe('battleWonLevelUp:隐藏经验抬 maxHP 与回满的先后(battle.c:1287-1292)', () => {
  it('无主升级但隐藏涨 maxHP → HP 保持战后值不回满(if(fLevelUp) 才回满)', () => {
    const role = makeHRole(0, { hp: 40, maxHP: 100, mp: 5, maxMP: 40 })
    const { gs } = makeHBattle({ roles: [role] })
    gs.PlayerRolesRuntime.rgwHP[0] = 40 // 战后受伤值
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
    gs.Exp.rgPrimaryExp[0] = { wExp: 0, wLevel: 1, wCount: 0 }
    gs.Exp.rgHealthExp[0] = { wExp: 0, wLevel: 0, wCount: 1 }
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 50, // < 阈值 100 → 不主升级
      levelUpExp: Array(100).fill(100),
      levelUpMagic: [],
      rng: recordingRng([1]), // 唯一一次 R(1,2)=1(隐藏涨点)
    })
    // 隐藏涨点成立:dwExp = 50×2 = 100 → 恰 1 隐藏级 → maxHP 100+1、结果条目产出
    expect(results.length).toBe(1)
    expect(results[0]!.fromLevel).toBe(results[0]!.toLevel) // 无主升级
    expect(results[0]!.snapshot).toBeUndefined() // 无主升级 → 无升级 box
    expect(results[0]!.hiddenExpGrowth).toEqual([
      { stat: 'rgwMaxHP', label: 'maxHP', statLabelWord: 49, delta: 1 },
    ])
    expect(gs.PlayerRolesRuntime.rgwMaxHP[0]).toBe(101)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(40) // ★ 不回满:battle.c:1289 if(fLevelUp) 不成立
  })

  it('主升级成立 → 隐藏涨点后 HP/MP 回满到(可能更高的)新 max(battle.c:1289-1292)', () => {
    const role = makeHRole(0, { hp: 40, maxHP: 100, mp: 5, maxMP: 40 })
    const { gs } = makeHBattle({ roles: [role] })
    gs.PlayerRolesRuntime.rgwHP[0] = 40
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 40
    gs.Exp.rgPrimaryExp[0] = { wExp: 50, wLevel: 1, wCount: 0 }
    gs.Exp.rgHealthExp[0] = { wExp: 0, wLevel: 0, wCount: 1 }
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 100, // dwExp=150 ≥ 100 → 主升级 1→2
      levelUpExp: Array(100).fill(100),
      levelUpMagic: [],
      rng: recordingRng([1, 1, 1, 1, 1, 1, 1]), // 主升级 6 掷 + 隐藏 1 掷,全取下界
    })
    expect(results.length).toBe(1)
    expect(results[0]!.snapshot).toBeDefined() // 主升级 → 有升级 box
    const curMax = gs.PlayerRolesRuntime.rgwMaxHP[0]!
    expect(curMax).toBe(100 + 10 + 1 + 2) // 主升级 +10+R(0,7)=1;隐藏 dwExp=200 → 2 级 × R(1,2)=1
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(curMax) // 回满到新 max(含隐藏抬升)
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(gs.PlayerRolesRuntime.rgwMaxMP[0])
  })
})
