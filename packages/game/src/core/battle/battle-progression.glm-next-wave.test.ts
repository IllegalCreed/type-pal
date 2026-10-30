/**
 * TEST-GLM-NEW-H-1 / H02 — battle-progression 当前公开合同补测。
 *
 * applyHiddenExpGrowth 在 battle-system.test.ts 只有 3 条基础直测(单池/total=0/占比);
 * battle-levelup.test.ts 只测主升级。本文件按 CHECK_HIDDEN_EXP 宏(battle.c:1238-1293)一手真值补:
 *  - wLevel > 99 先钳 99(battle.c:1248-1252);99 级上 while 继续扣 exp 涨属性、wLevel 停 99
 *  - 隐藏涨点**无 STAT_LIMIT 999 钳**(宏内无 cap,主升级宏见global.c:2393-2401)
 *  - 七池按Health→…→Flee序消费RandomLong(1,2);身法只用存留经验,不伪造动作计数
 *  - battleWonLevelUp:隐藏经验抬了 maxHP 但**无主升级** → 不回满(battle.c:1287-1292 if(fLevelUp))
 */
import { describe, expect, it } from 'vitest'
import { recordingRng } from '../../__tests__/glm-next-wave/H/harness.js'
import { createBattleLifecycleFixture } from './battle-lifecycle.test-fixtures.js'
import { applyHiddenExpGrowth, battleWonLevelUp } from './battle-progression.js'

const oneRng: { rangeInclusive: (a: number, b: number) => number } = {
  rangeInclusive: (_a: number, _b: number) => 1,
}

describe('applyHiddenExpGrowth —— CHECK_HIDDEN_EXP 宏边角(battle.c:1238-1293)', () => {
  it('wLevel=120 先钳 99;99 级上继续扣阈值涨属性,wLevel 停 99 不再 ++', () => {
    // 120级是有意的防御边界;不声称正常战斗会生成该隐藏等级。
    const { gs } = createBattleLifecycleFixture({ role: { level: 1, hp: 100, maxHP: 100 } })
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
    const { gs } = createBattleLifecycleFixture({ role: { level: 1, attackStrength: 998 } })
    gs.Exp.rgAttackExp[0] = { wExp: 0, wLevel: 1, wCount: 1 }
    applyHiddenExpGrowth({
      exp: gs.Exp,
      rt: gs.PlayerRolesRuntime,
      roleId: 0,
      expGained: 100, // dwExp = 200 → 两级(阈值 100),998+1+1=1000
      levelUpExp: Array(100).fill(100),
      rng: oneRng,
    })
    expect(gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(1000) // 无 999 clamp
    expect(gs.Exp.rgAttackExp[0]!.wLevel).toBe(3)
  })

  it('七池映射与消费顺序:身法只结算存留经验,不伪造动作计数', () => {
    const { gs } = createBattleLifecycleFixture({
      role: {
        maxHP: 100,
        hp: 100,
        maxMP: 110,
        attackStrength: 120,
        magicStrength: 130,
        defense: 140,
        dexterity: 150,
        fleeRate: 160,
      },
    })
    // 普攻、施法、防御、失败逃跑可形成这六项计数,身法没有动作累计源。
    // 身法wExp=15是当前V1允许的存留值边界,不声称正常原盘战斗能积出它。
    gs.Exp.rgHealthExp[0] = { wExp: 0, wLevel: 1, wCount: 2 }
    gs.Exp.rgMagicExp[0] = { wExp: 0, wLevel: 1, wCount: 2 }
    gs.Exp.rgAttackExp[0] = { wExp: 0, wLevel: 1, wCount: 1 }
    gs.Exp.rgMagicPowerExp[0] = { wExp: 0, wLevel: 1, wCount: 1 }
    gs.Exp.rgDefenseExp[0] = { wExp: 0, wLevel: 1, wCount: 2 }
    gs.Exp.rgDexterityExp[0] = { wExp: 15, wLevel: 1, wCount: 0 }
    gs.Exp.rgFleeExp[0] = { wExp: 0, wLevel: 1, wCount: 2 }
    // 原盘阈值前缀0/15/40;只读取1、2级,其余级用正数占位。
    const levelUpExp = Array<number>(100).fill(32000)
    levelUpExp[0] = 0
    levelUpExp[1] = 15
    levelUpExp[2] = 40
    const rng = recordingRng([2, 1, 2, 1, 2, 1, 2])
    const rt = gs.PlayerRolesRuntime
    const res = applyHiddenExpGrowth({
      exp: gs.Exp,
      rt,
      roleId: 0,
      expGained: 100, // 总计数10:六池获40/40/20/20/40/40,身法只用原有15。
      levelUpExp,
      rng,
    })
    expect([
      rt.rgwMaxHP[0],
      rt.rgwMaxMP[0],
      rt.rgwAttackStrength[0],
      rt.rgwMagicStrength[0],
      rt.rgwDefense[0],
      rt.rgwDexterity[0],
      rt.rgwFleeRate[0],
    ]).toEqual([102, 111, 122, 131, 142, 151, 162])
    expect(res).toEqual([
      { stat: 'rgwMaxHP', label: 'maxHP', statLabelWord: 49, delta: 2 },
      { stat: 'rgwMaxMP', label: 'maxMP', statLabelWord: 50, delta: 1 },
      { stat: 'rgwAttackStrength', label: 'attack', statLabelWord: 51, delta: 2 },
      { stat: 'rgwMagicStrength', label: 'magic', statLabelWord: 52, delta: 1 },
      { stat: 'rgwDefense', label: 'defense', statLabelWord: 53, delta: 2 },
      { stat: 'rgwDexterity', label: 'dexterity', statLabelWord: 54, delta: 1 },
      { stat: 'rgwFleeRate', label: 'fleeRate', statLabelWord: 55, delta: 2 },
    ])
    expect([
      gs.Exp.rgHealthExp[0],
      gs.Exp.rgMagicExp[0],
      gs.Exp.rgAttackExp[0],
      gs.Exp.rgMagicPowerExp[0],
      gs.Exp.rgDefenseExp[0],
      gs.Exp.rgDexterityExp[0],
      gs.Exp.rgFleeExp[0],
    ]).toEqual([
      { wExp: 25, wLevel: 2, wCount: 2 },
      { wExp: 25, wLevel: 2, wCount: 2 },
      { wExp: 5, wLevel: 2, wCount: 1 },
      { wExp: 5, wLevel: 2, wCount: 1 },
      { wExp: 25, wLevel: 2, wCount: 2 },
      { wExp: 0, wLevel: 2, wCount: 0 },
      { wExp: 25, wLevel: 2, wCount: 2 },
    ])
    expect(rng.calls).toEqual(Array<string>(7).fill('rangeInclusive(1,2)'))
  })
})

describe('battleWonLevelUp:隐藏经验抬 maxHP 与回满的先后(battle.c:1287-1292)', () => {
  it('无主升级但隐藏涨 maxHP → HP 保持战后值不回满(if(fLevelUp) 才回满)', () => {
    const { gs } = createBattleLifecycleFixture({
      role: { level: 1, hp: 40, maxHP: 100, mp: 5, maxMP: 40 },
    })
    gs.Exp.rgPrimaryExp[0] = { wExp: 0, wLevel: 1, wCount: 0 }
    // 一次普攻给Health2/Attack1;合法存留34使本次Health恰过阈值。
    gs.Exp.rgHealthExp[0] = { wExp: 34, wLevel: 1, wCount: 2 }
    gs.Exp.rgAttackExp[0] = { wExp: 0, wLevel: 1, wCount: 1 }
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 50, // < 阈值 100 → 不主升级
      levelUpExp: Array(100).fill(100),
      levelUpMagic: [],
      rng: recordingRng([1]), // 唯一一次 R(1,2)=1(隐藏涨点)
    })
    // 隐藏涨点成立:dwExp = trunc(50×2/3)×2+34 = 100 → 恰 1 隐藏级 → maxHP 100+1、结果条目产出
    expect(results.length).toBe(1)
    expect(results[0]).toMatchObject({ fromLevel: 1, toLevel: 1 })
    expect(results[0]!.snapshot).toBeUndefined() // 无主升级 → 无升级 box
    expect(results[0]!.hiddenExpGrowth).toEqual([
      { stat: 'rgwMaxHP', label: 'maxHP', statLabelWord: 49, delta: 1 },
    ])
    expect(gs.PlayerRolesRuntime.rgwMaxHP[0]).toBe(101)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(40) // ★ 不回满:battle.c:1289 if(fLevelUp) 不成立
  })

  it('主升级成立 → 隐藏涨点后 HP/MP 回满到(可能更高的)新 max(battle.c:1289-1292)', () => {
    const { gs } = createBattleLifecycleFixture({
      role: { level: 1, hp: 40, maxHP: 100, mp: 5, maxMP: 40 },
    })
    gs.Exp.rgPrimaryExp[0] = { wExp: 50, wLevel: 1, wCount: 0 }
    // 同一合法普攻计数;trunc(100*2/3)*2+68=200,Health恰涨两级。
    gs.Exp.rgHealthExp[0] = { wExp: 68, wLevel: 1, wCount: 2 }
    gs.Exp.rgAttackExp[0] = { wExp: 0, wLevel: 1, wCount: 1 }
    const rng = recordingRng([1, 1, 1, 1, 1, 1, 1, 1]) // 主升级6抽、隐藏2抽;不依赖耗尽回退
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 100, // dwExp=150 ≥ 100 → 主升级 1→2
      levelUpExp: Array(100).fill(100),
      levelUpMagic: [],
      rng,
    })
    expect(results.length).toBe(1)
    expect(results[0]).toMatchObject({ fromLevel: 1, toLevel: 2 })
    expect(results[0]!.snapshot).toBeDefined() // 主升级 → 有升级 box
    const curMax = gs.PlayerRolesRuntime.rgwMaxHP[0]!
    expect(curMax).toBe(100 + 10 + 1 + 2) // 主升级 +10+R(0,7)=1;隐藏132+68=200 → 2 级 × R(1,2)=1
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(curMax) // 回满到新 max(含隐藏抬升)
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(gs.PlayerRolesRuntime.rgwMaxMP[0])
    expect(rng.calls).toEqual([
      'rangeInclusive(0,7)',
      'rangeInclusive(0,5)',
      'rangeInclusive(0,1)',
      'rangeInclusive(0,1)',
      'rangeInclusive(0,1)',
      'rangeInclusive(0,1)',
      'rangeInclusive(1,2)',
      'rangeInclusive(1,2)',
    ])
  })
})
