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

import type { BattleField, Enemy, ObjectMagicView } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createSeedableRng } from '../../rng.js'
import type { BattleEnemy, BattleState } from '../battle-state.js'
import { applyMagicDamage, resolveObjectMagic } from '../magic-damage.js'

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
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
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
    uiCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
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
      rngFactor: 1.0,
      minDamage: 1,
    })
    expect(results).toEqual([{ enemyIdx: 0, damage: 50 }])
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
      rngFactor: 1.0,
      minDamage: 1,
    })
    expect(results).toEqual([{ enemyIdx: 0, damage: 50 }, { enemyIdx: 1, damage: 50 }])
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
      rngFactor: 1.0,
      minDamage: 0,
    })
    expect(results).toEqual([{ enemyIdx: 0, damage: 0 }])
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('inline minDamage=1:弱法术算出 ≤0 → 至少 1(sDamage<=0→1)', () => {
    const state = makeState([{ health: 100, defense: 200, level: 50 }])
    const results = applyMagicDamage({
      state,
      target: 0,
      magStr: 1,
      magicData: { baseDamage: 0, elemental: 0 },
      rngFactor: 1.0,
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
      rngFactor: 1.0,
      minDamage: 1,
    })
    expect(state.enemies[0]!.e.health).toBe(0)
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
