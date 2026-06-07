/**
 * magic-damage.test.ts —— E 类共享核心(applyMagicDamage + resolveObjectMagic)。
 *
 * applyMagicDamage 是 inline 法术伤害(fight.c:4270 PAL_BattleCommitAction)与
 * 0x42 SimulateMagic(fight.c:5300)的共享核心:
 *   def = (SHORT)enemy.defense + (level+6)*4,clamp≥0
 *   dmg = PAL_CalcMagicDamage(magStr, def, elemRes, poisonRes, mult=1, magic)
 *   dmg = max(dmg, minDamage)   // inline: minDamage=1(sDamage<=0→1);SimulateMagic: minDamage=0(sDamage<0→0)
 *   enemy.health -= dmg
 *
 * 期望值全部手算(rngFactor=1.0 固定)对照 sdlpal 公式。
 */

import type { BattleField, Enemy, ObjectMagicView, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createSeedableRng } from '../../rng.js'
import type { BattleEnemy, BattleState } from '../battle-state.js'
import { applyEnemyMagicDamage, applyMagicDamage, resolveObjectMagic } from '../magic-damage.js'

function makeEnemy(opts: Partial<Enemy> = {}): Enemy {
  return {
    id: 100,
    _name: 'TestEnemy',
    idleFrames: 0,
    magicFrames: 0,
    attackFrames: 0,
    idleAnimSpeed: 0,
    actWaitFrames: 0,
    yPosOffset: 0,
    attackSound: 0,
    actionSound: 0,
    magicSound: 0,
    deathSound: 0,
    callSound: 0,
    health: 100,
    exp: 10,
    cash: 30,
    level: 5,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 0,
    magicStrength: 0,
    defense: 30,
    dexterity: 20,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
    ...opts,
  }
}

function makeState(enemies: Partial<Enemy>[], fieldEffect?: BattleField['magicEffect']): BattleState {
  const field: BattleField = {
    id: 0,
    screenWave: 0,
    magicEffect: fieldEffect ?? { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  }
  const battleEnemies: BattleEnemy[] = enemies.map(e => ({
    e: makeEnemy(e),
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
    prevHp: (makeEnemy(e)).health,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
  }))
  return {
    players: [],
    enemies: battleEnemies,
    field,
    isBoss: false,
    phase: 'performAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'hidden',
    menuState: 'main',
    selectedAction: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    uiCursor: 0,
    expGained: 0,
    cashGained: 0,
    // rngFactor 现由伤害函数循环内逐目标 next() 掷;注入 next:()=>0 → 全目标 rngFactor 固定 1.0(等价旧 rngFactor:1.0 手算)。
    rng: { ...createSeedableRng(1), next: () => 0 },
    phaseStallTicks: 0,
  }
}

describe('applyMagicDamage', () => {
  it('单体:wind 元素咒手算伤害对(magStr64 / baseDmg45 / windRes5 → 50)', () => {
    // def = 30 + (5+6)*4 = 74
    // calcBaseDamage(64,74)= trunc(64 - 74*0.6 + 0.5)=trunc(20.1)=20; /4=5; +45=50
    // elem1(wind): *(10-5/1)=*5 → 250; /5=50; field0: *(10+0)/10=50
    const state = makeState([{ health: 100, defense: 30, level: 5, elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 } }])
    const results = applyMagicDamage({
      state,
      target: 0,
      magStr: 64,
      magicData: { baseDamage: 45, elemental: 1 },
      minDamage: 1,
    })
    expect(results).toEqual([{ enemyIdx: 0, damage: 50, hpBefore: 100, hpAfter: 50 }])
    expect(state.enemies[0]!.e.health).toBe(50)
  })

  it('全体 target="all":每个敌人都吃伤害', () => {
    const state = makeState([
      { health: 100, defense: 30, level: 5, elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 } },
      { health: 80, defense: 30, level: 5, elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 } },
    ])
    const results = applyMagicDamage({
      state,
      target: 'all',
      magStr: 64,
      magicData: { baseDamage: 45, elemental: 1 },
      minDamage: 1,
    })
    expect(results).toEqual([
      { enemyIdx: 0, damage: 50, hpBefore: 100, hpAfter: 50 },
      { enemyIdx: 1, damage: 50, hpBefore: 80, hpAfter: 30 },
    ])
    expect(state.enemies[0]!.e.health).toBe(50)
    expect(state.enemies[1]!.e.health).toBe(30)
  })

  it('SimulateMagic 负 baseDamage(magic96=−999 SHORT)+ minDamage=0 → 0 伤害(投掷物动画无伤)', () => {
    // op1(magStr)=0,baseDamage=64537(=SHORT −999),elem0
    // calcBase(0,74)=0; /4=0; +(asShort 64537)=−999; elem0 skip → −999; max(−999,0)=0
    const state = makeState([{ health: 100, defense: 30, level: 5 }])
    const results = applyMagicDamage({
      state,
      target: 0,
      magStr: 0,
      magicData: { baseDamage: 64537, elemental: 0 },
      minDamage: 0,
    })
    expect(results).toEqual([{ enemyIdx: 0, damage: 0, hpBefore: 100, hpAfter: 100 }])
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('inline minDamage=1:弱法术算出 ≤0 → 至少 1(sDamage<=0→1)', () => {
    const state = makeState([{ health: 100, defense: 200, level: 50 }])
    const results = applyMagicDamage({
      state,
      target: 0,
      magStr: 1,
      magicData: { baseDamage: 0, elemental: 0 },
      minDamage: 1,
    })
    expect(results[0]!.damage).toBe(1)
    expect(state.enemies[0]!.e.health).toBe(99)
  })

  it('health 落地 clamp≥0(不变负)', () => {
    const state = makeState([{ health: 10, defense: 30, level: 5, elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 } }])
    applyMagicDamage({
      state,
      target: 0,
      magStr: 64,
      magicData: { baseDamage: 45, elemental: 1 },
      minDamage: 1,
    })
    expect(state.enemies[0]!.e.health).toBe(0)
  })

  // L18/L20:群攻对每个敌人**各掷一次**独立 RandomFloat(10,11)(sdlpal fight.c:215 在 PAL_CalcMagicDamage
  //   函数体内,群攻 for 循环逐敌调用 fight.c:4288/4015 → N 敌 N 次独立掷骰)。旧实现 caller 预掷一次
  //   全目标共用同一倍率(相同 def 的多敌伤害撞车);改后伤害函数循环内逐目标掷,各目标 rngFactor 独立。
  it('L18/L20:多体 target="all" 每个目标各掷一次独立 rngFactor(相同敌人伤害不同)', () => {
    let calls = 0
    const seq = [0, 0.9] // 敌0 next=0 → rngFactor 1.0;敌1 next=0.9 → rngFactor 1.09
    const state = makeState([
      { health: 9999, defense: 30, level: 5 },
      { health: 9999, defense: 30, level: 5 },
    ])
    state.rng = { ...createSeedableRng(1), next: () => seq[calls++] ?? 0 }
    const results = applyMagicDamage({
      state,
      target: 'all',
      magStr: 640,
      magicData: { baseDamage: 80, elemental: 1 },
      minDamage: 1,
    })
    expect(calls).toBe(2) // 每个存活目标各掷一次(非全体共用一次)
    expect(results[0]!.damage).not.toBe(results[1]!.damage) // 独立 rngFactor → 相同敌人伤害不同
  })
})

describe('resolveObjectMagic', () => {
  const objMagics: ObjectMagicView[] = [
    { id: 0, magicNumber: 0, scriptOnSuccess: 0, scriptOnUse: 0, flags: { usableOutsideBattle: false, usableInBattle: false, usableToEnemy: false, applyToAll: false } },
    { id: 24, magicNumber: 96, scriptOnSuccess: 0, scriptOnUse: 0, flags: { usableOutsideBattle: false, usableInBattle: false, usableToEnemy: false, applyToAll: false } },
    { id: 349, magicNumber: 54, scriptOnSuccess: 0, scriptOnUse: 0, flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: false } },
  ]

  it('按 object id 解析 magic-union 视图', () => {
    expect(resolveObjectMagic(24, objMagics)?.magicNumber).toBe(96)
    expect(resolveObjectMagic(349, objMagics)?.magicNumber).toBe(54)
  })

  it('未知 id → undefined', () => {
    expect(resolveObjectMagic(999, objMagics)).toBeUndefined()
  })
})

// ============================================================================
// applyEnemyMagicDamage —— 敌方攻击魔法伤害结算(enemy→player,fight.c:4772-4853)。
// magStr = enemy.magicStrength+(level+6)*6;PAL_CalcMagicDamage resistMult=20 + 玩家抗(100+mod);
// 除因子 ((defending?2:1)*(protect?2:1=1))+(autoDefend?1:0);clamp dmg>hp→hp(不钳最小 1)。
// ============================================================================

interface PRoleCfg {
  hp: number
  defense?: number
  level?: number
  poisonResistance?: number
  windRes?: number
  status?: { sleep?: number, paralyzed?: number, confused?: number, protect?: number }
  defending?: boolean
}

/** 建带队员 + 单敌(施法者)的 state + playerRoles。rangeVal 控 autoDefend(range(0,3)==0 → 自卫)。 */
function makeEnemyMagicState(
  caster: { magicStrength: number, level: number },
  players: PRoleCfg[],
  rangeVal = 1, // 默认 !=0 → 不自卫
): { state: BattleState, playerRoles: PlayerRoles } {
  const state = makeState([{ magicStrength: caster.magicStrength, level: caster.level }])
  state.players = players.map((p, i) => ({
    roleId: i,
    prevHp: 0,
    prevMp: 0,
    defending: p.defending ?? false,
    status: {
      sleep: p.status?.sleep ?? 0,
      paralyzed: p.status?.paralyzed ?? 0,
      confused: p.status?.confused ?? 0,
      protect: p.status?.protect ?? 0,
      haste: 0,
      slow: 0,
    },
  }))
  // next:()=>0 → rngFactor 固定 1.0(逐队员掷,值恒定);range 控 autoDefend。
  state.rng = { ...createSeedableRng(1), next: () => 0, range: () => rangeVal }
  const roles: PlayerRole[] = players.map((p, i) => ({
    id: i,
    hp: p.hp,
    defense: p.defense ?? 0,
    level: p.level ?? 0,
    poisonResistance: p.poisonResistance ?? 0,
    elemResistance: { wind: p.windRes ?? 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    // biome-ignore lint/suspicious/noExplicitAny: 只填伤害相关字段
  } as any as PlayerRole))
  return { state, playerRoles: { roles } }
}

describe('applyEnemyMagicDamage', () => {
  // P0#3(2026-06-02 审计核源):玩家 def = PAL_GetPlayerDefense(global.c:1800-1828)= rgwDefense + Σ装备,
  //   **无 level 项**(等级项是敌方被打才有,fight.c:4012)。此前 ts 误加 (level+6)*4(M3 简化把敌方公式套玩家)。
  //   role.defense 已是 projected(base+装备,game-state.ts:1281)→ 直接用,改后玩家 def 不随 level 变。
  it('P0#3:玩家 def 不含 level 项(level 5 vs 99 同 defense → 同伤害)', () => {
    const dmgAt = (lvl: number): number => {
      const { state, playerRoles } = makeEnemyMagicState({ magicStrength: 28, level: 0 }, [
        { hp: 9999, defense: 30, level: lvl, windRes: 0 },
      ])
      return applyEnemyMagicDamage({
        state, casterEnemyIdx: 0, target: 0,
        magicData: { baseDamage: 45, elemental: 1 }, playerRoles,
      })[0]!.damage
    }
    expect(dmgAt(5)).toBe(dmgAt(99)) // def=role.defense(30),与 level 无关
    expect(dmgAt(5)).toBe(65) // def=30:calcBase(64,30) 走 atk>def 分支=80;/4=20;+45=65;wind*5/5=65(旧 bug def=74→50)
  })

  // magStr = 28 + (0+6)*6 = 64(敌 magStr 含 level,正确);player def = 30(无 level 项);baseDmg45 wind(elem1)windRes0
  // calcBase(64,30):64>30 → trunc(64*2-30*1.6+0.5)=80; /4=20; +45=65; elem1: *5/5=65; field0: 65
  it('单体:手算伤害 65,player HP 100→35(无防御/无自卫)', () => {
    const { state, playerRoles } = makeEnemyMagicState({ magicStrength: 28, level: 0 }, [
      { hp: 100, defense: 30, level: 5, windRes: 0 },
    ])
    const r = applyEnemyMagicDamage({
      state, casterEnemyIdx: 0, target: 0,
      magicData: { baseDamage: 45, elemental: 1 }, playerRoles,
    })
    expect(r).toEqual([{ playerIdx: 0, damage: 65, hpBefore: 100, hpAfter: 35, autoDefend: false }])
    expect(playerRoles.roles[0]!.hp).toBe(35)
  })

  it('AoE target="all":全体活队员吃伤害', () => {
    const { state, playerRoles } = makeEnemyMagicState({ magicStrength: 28, level: 0 }, [
      { hp: 100, defense: 30, level: 5 },
      { hp: 80, defense: 30, level: 5 },
    ])
    const r = applyEnemyMagicDamage({
      state, casterEnemyIdx: 0, target: 'all',
      magicData: { baseDamage: 45, elemental: 1 }, playerRoles,
    })
    expect(r).toEqual([
      { playerIdx: 0, damage: 65, hpBefore: 100, hpAfter: 35, autoDefend: false },
      { playerIdx: 1, damage: 65, hpBefore: 80, hpAfter: 15, autoDefend: false },
    ])
  })

  it('defending → 除 2(65→32)', () => {
    const { state, playerRoles } = makeEnemyMagicState({ magicStrength: 28, level: 0 }, [
      { hp: 100, defense: 30, level: 5, defending: true },
    ])
    const r = applyEnemyMagicDamage({
      state, casterEnemyIdx: 0, target: 0,
      magicData: { baseDamage: 45, elemental: 1 }, playerRoles,
    })
    expect(r[0]!.damage).toBe(32) // trunc(65/((2*1)+0))=32
  })

  it('B2 c4:Protect 状态 → 除因子 ×2(65→32,fight.c:4802/4837)', () => {
    const { state, playerRoles } = makeEnemyMagicState({ magicStrength: 28, level: 0 }, [
      { hp: 100, defense: 30, level: 5, status: { protect: 1 } },
    ])
    const r = applyEnemyMagicDamage({
      state, casterEnemyIdx: 0, target: 0,
      magicData: { baseDamage: 45, elemental: 1 }, playerRoles,
    })
    expect(r[0]!.damage).toBe(32) // trunc(65/((1*2)+0))=32
  })

  it('B2 c4:Protect + defending → 除因子 ×2×2=4(65→16)', () => {
    const { state, playerRoles } = makeEnemyMagicState({ magicStrength: 28, level: 0 }, [
      { hp: 100, defense: 30, level: 5, defending: true, status: { protect: 1 } },
    ])
    const r = applyEnemyMagicDamage({
      state, casterEnemyIdx: 0, target: 0,
      magicData: { baseDamage: 45, elemental: 1 }, playerRoles,
    })
    expect(r[0]!.damage).toBe(16) // trunc(65/((2*2)+0))=16
  })

  it('autoDefend(range(0,3)==0)→ 除因子 +1(65→32)', () => {
    const { state, playerRoles } = makeEnemyMagicState({ magicStrength: 28, level: 0 }, [
      { hp: 100, defense: 30, level: 5 },
    ], /* rangeVal */ 0)
    const r = applyEnemyMagicDamage({
      state, casterEnemyIdx: 0, target: 0,
      magicData: { baseDamage: 45, elemental: 1 }, playerRoles,
    })
    expect(r[0]!.damage).toBe(32) // trunc(65/((1*1)+1))=32
    expect(r[0]!.autoDefend).toBe(true) // L16:被动格挡标志外传(供动画摆防御姿 frame3)
  })

  it('defending + autoDefend → 除 3(trunc 65/3=21)', () => {
    const { state, playerRoles } = makeEnemyMagicState({ magicStrength: 28, level: 0 }, [
      { hp: 100, defense: 30, level: 5, defending: true },
    ], 0)
    const r = applyEnemyMagicDamage({
      state, casterEnemyIdx: 0, target: 0,
      magicData: { baseDamage: 45, elemental: 1 }, playerRoles,
    })
    expect(r[0]!.damage).toBe(21) // trunc(65/((2*1)+1))=21
  })

  it('sleep 队员不触发 autoDefend(range==0 也不自卫)→ 满伤 65', () => {
    const { state, playerRoles } = makeEnemyMagicState({ magicStrength: 28, level: 0 }, [
      { hp: 100, defense: 30, level: 5, status: { sleep: 3 } },
    ], 0)
    const r = applyEnemyMagicDamage({
      state, casterEnemyIdx: 0, target: 0,
      magicData: { baseDamage: 45, elemental: 1 }, playerRoles,
    })
    expect(r[0]!.damage).toBe(65) // 睡眠 → canAutoDefend=false → 除因子 1
  })

  it('clamp:dmg > 剩余 HP → 钳到 HP(hp30 吃 65 → 掉 30,hp→0)', () => {
    const { state, playerRoles } = makeEnemyMagicState({ magicStrength: 28, level: 0 }, [
      { hp: 30, defense: 30, level: 5 },
    ])
    const r = applyEnemyMagicDamage({
      state, casterEnemyIdx: 0, target: 0,
      magicData: { baseDamage: 45, elemental: 1 }, playerRoles,
    })
    expect(r[0]!.damage).toBe(30)
    expect(playerRoles.roles[0]!.hp).toBe(0)
  })

  it('AoE 跳过已死队员(hp=0 不结算)', () => {
    const { state, playerRoles } = makeEnemyMagicState({ magicStrength: 28, level: 0 }, [
      { hp: 0, defense: 30, level: 5 },
      { hp: 100, defense: 30, level: 5 },
    ])
    const r = applyEnemyMagicDamage({
      state, casterEnemyIdx: 0, target: 'all',
      magicData: { baseDamage: 45, elemental: 1 }, playerRoles,
    })
    expect(r.map(x => x.playerIdx)).toEqual([1]) // idx0 死 → 跳过
    expect(playerRoles.roles[0]!.hp).toBe(0)
  })

  it('元素抗 >100 → clamp 到 100(global.c:1969)→ 倍率不变负、伤害不回血', () => {
    // windRes=200 → clamp 100 → elemRes=200 → 倍率 10-200/20=0 → 伤害 0(无 clamp 会 10-300/20=-5 负伤回血)
    const { state, playerRoles } = makeEnemyMagicState({ magicStrength: 28, level: 0 }, [
      { hp: 100, defense: 30, level: 5, windRes: 200 },
    ])
    const r = applyEnemyMagicDamage({
      state, casterEnemyIdx: 0, target: 0,
      magicData: { baseDamage: 45, elemental: 1 }, playerRoles,
    })
    expect(r[0]!.damage).toBe(0) // 倍率 0 → 0 伤害(非负)
    expect(playerRoles.roles[0]!.hp).toBe(100) // 不回血(clamp 前会 >100)
  })

  // L20:敌方 AoE 同样逐队员各掷一次独立 RandomFloat(sdlpal fight.c:4793 在 for 循环内逐队员调
  //   PAL_CalcMagicDamage)。旧实现 caller 预掷一次全队员共用,改后循环内逐目标掷。
  it('L20:敌方 AoE target="all" 每个队员各掷一次独立 rngFactor', () => {
    let calls = 0
    const seq = [0, 0.9] // 队员0 rngFactor 1.0;队员1 rngFactor 1.09
    const { state, playerRoles } = makeEnemyMagicState({ magicStrength: 28, level: 0 }, [
      { hp: 9999, defense: 30, level: 5 },
      { hp: 9999, defense: 30, level: 5 },
    ]) // 默认 range:()=>1 → 不自卫;next 计数序列覆盖
    state.rng = { ...state.rng, next: () => seq[calls++] ?? 0 }
    const r = applyEnemyMagicDamage({
      state, casterEnemyIdx: 0, target: 'all',
      magicData: { baseDamage: 45, elemental: 1 }, playerRoles,
    })
    expect(calls).toBe(2) // 每个存活队员各掷一次(非全队共用一次)
    expect(r[0]!.damage).not.toBe(r[1]!.damage) // 独立 rngFactor → 相同队员伤害不同
  })
})
