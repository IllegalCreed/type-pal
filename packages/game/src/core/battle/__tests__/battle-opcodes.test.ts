import type { Enemy, Magic, ObjectMagicView } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { BattleCtx } from '../../event-system.js'
import type { BattleEnemy, BattleState } from '../battle-state.js'
import { dispatchBattleOpcode } from '../battle-opcodes.js'

function makeEnemy(health: number, magic = 0, magicRate = 0): BattleEnemy {
  return {
    // biome-ignore lint/suspicious/noExplicitAny: minimal Enemy shape
    e: { id: 1, health, magic, magicRate } as any,
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
    prevHp: 100,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
  }
}

function makeCtx(enemy: BattleEnemy): BattleCtx {
  return {
    // biome-ignore lint/suspicious/noExplicitAny: minimal BattleState
    state: { enemies: [enemy], players: [] } as any as BattleState,
    caster: { type: 'enemy', idx: 0 },
  }
}

describe('B-w2.a battle-opcodes dispatch', () => {
  it('0x0064 jump if enemy hp > N%:hp 满 100/100 + operand[0]=50 → jump operand[1]', () => {
    const enemy = makeEnemy(100)  // prevHp 100, cur 100 → 100% > 50%
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0x0064, [50, 200, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(r.newIp).toBe(200)
  })

  it('0x0064 jump if hp > N%:hp 残 30 + operand[0]=50 → 不 jump(返回 ip 不变)', () => {
    const enemy = makeEnemy(30)  // 30/100 = 30% < 50%
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0x0064, [50, 200, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(r.newIp).toBeUndefined()
  })

  it('0x0067 enemy use magic:operand[0]=12, operand[1]=20 → enemy.e.magic=12, magicRate=20', () => {
    const enemy = makeEnemy(100)
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0x0067, [12, 20, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(enemy.e.magic).toBe(12)
    expect(enemy.e.magicRate).toBe(20)
  })

  it('0x0067:operand[1]=0 → magicRate 默认 10(sdlpal `script.c:2022` 真值)', () => {
    const enemy = makeEnemy(100)
    const ctx = makeCtx(enemy)
    dispatchBattleOpcode(0x0067, [5, 0, 0], ctx)
    expect(enemy.e.magicRate).toBe(10)
  })

  it('0x0061 jump if player not poisoned:简版无 poison apply → 总是 jump', () => {
    const enemy = makeEnemy(100)
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0x0061, [0, 300, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(r.newIp).toBe(300)
  })

  it('0x0069 enemy escape:enemy.e.health 设 0', () => {
    const enemy = makeEnemy(50)
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0x0069, [0, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(enemy.e.health).toBe(0)
  })

  it('0x0060 immediate KO:operand[0]=0xFFFF(self)→ caster enemy health=0', () => {
    const enemy = makeEnemy(100)
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0x0060, [0xFFFF, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(enemy.e.health).toBe(0)
  })

  it('未具名 opcode 返回 consumed=false(走 raw skip)', () => {
    const enemy = makeEnemy(100)
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0xC0, [0, 0, 0], ctx)
    expect(r.consumed).toBe(false)
  })
})

// ============================================================================
// 0x42 SimulateMagic(E2)—— PAL_BattleSimulateMagic(fight.c:5300)
//   script.c:1630:i = (SHORT)op2 - 1; if (i<0) i = wEventObjectID;
//                 SimulateMagic(i, op0=magicObjID, op1=baseDamage)
// ============================================================================

function richEnemy(opts: Partial<Enemy>): BattleEnemy {
  return {
    e: {
      health: 200, defense: 30, level: 5, poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      ...opts,
      // biome-ignore lint/suspicious/noExplicitAny: 只填伤害公式相关字段
    } as any as Enemy,
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
    prevHp: opts.health ?? 200,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
  }
}

function simulateCtx(
  enemies: BattleEnemy[],
  targetIdx: number | undefined,
  objectMagics: ObjectMagicView[],
  magics: Magic[],
): BattleCtx {
  return {
    state: {
      enemies,
      players: [],
      field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
      // rngFactor 固定 1.0
      rng: { next: () => 0, range: () => 0, rangeInclusive: () => 0, getState: () => 0 },
      // biome-ignore lint/suspicious/noExplicitAny: 最小 BattleState
    } as any as BattleState,
    caster: { type: 'player', idx: 0 },
    target: targetIdx === undefined ? undefined : { type: 'enemy', idx: targetIdx },
    magicTables: { magics, objectMagics },
  }
}

function objMagic(id: number, magicNumber: number, applyToAll = false): ObjectMagicView {
  return { id, magicNumber, scriptOnSuccess: 0, scriptOnUse: 0, flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll } }
}

function magicStat(id: number, baseDamage: number, elemental: number): Magic {
  // biome-ignore lint/suspicious/noExplicitAny: 只填伤害相关字段
  return { id, baseDamage, elemental, type: 'normal' } as any as Magic
}

describe('0x42 SimulateMagic (E2)', () => {
  it('真伤害 magic(天师符法 obj349→magic54 baseDmg140 elem0)→ 目标落血 140', () => {
    // op2=0 → target = eventObjectID = ctx.target.idx = 0
    // magStr=op1=0;def=30+(5+6)*4=74;calcBase(0,74)=0;/4=0;+140=140;elem0→140;min0→140
    const enemies = [richEnemy({ health: 200, defense: 30, level: 5 })]
    const ctx = simulateCtx(enemies, 0, [objMagic(349, 54)], [magicStat(54, 140, 0)])
    const r = dispatchBattleOpcode(0x42, [349, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(enemies[0]!.e.health).toBe(60)
  })

  it('applyToAll(火灵符法 obj367→magic59 elem4 fire)→ 全体敌人落血', () => {
    const enemies = [richEnemy({ health: 300 }), richEnemy({ health: 300 })]
    const ctx = simulateCtx(enemies, 0, [objMagic(367, 59, true)], [magicStat(59, 103, 4)])
    dispatchBattleOpcode(0x42, [367, 0, 0], ctx)
    // elem4 fire,fireRes0:base103 → *10/5=206 → field0 *10/10=206
    expect(enemies[0]!.e.health).toBe(94)
    expect(enemies[1]!.e.health).toBe(94)
  })

  it('object24 sentinel(magic96 baseDmg=64537=SHORT−999)→ guard 进但伤害 0(投掷物动画)', () => {
    const enemies = [richEnemy({ health: 100 })]
    const ctx = simulateCtx(enemies, 0, [objMagic(24, 96)], [magicStat(96, 64537, 0)])
    const r = dispatchBattleOpcode(0x42, [24, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(enemies[0]!.e.health).toBe(100) // -999 → max(,0)=0
  })

  it('op1>0(0x66 throw weapon 路径,op1 当 magStr)→ 结算', () => {
    // magic baseDmg0 elem0,op1=100;guard:0>0||100>0 → true
    // magStr=100;calcBase(100,74)=trunc(200-118.4+0.5)=82;/4=20;+0=20;min0→20
    const enemies = [richEnemy({ health: 200, defense: 30, level: 5 })]
    const ctx = simulateCtx(enemies, 0, [objMagic(380, 70)], [magicStat(70, 0, 0)])
    dispatchBattleOpcode(0x42, [380, 100, 0], ctx)
    expect(enemies[0]!.e.health).toBe(180)
  })

  it('guard false(magic baseDmg0 + op1=0)→ 不结算', () => {
    const enemies = [richEnemy({ health: 200 })]
    const ctx = simulateCtx(enemies, 0, [objMagic(380, 70)], [magicStat(70, 0, 0)])
    dispatchBattleOpcode(0x42, [380, 0, 0], ctx)
    expect(enemies[0]!.e.health).toBe(200)
  })

  it('op2>0 显式目标:op2=2 → 打 enemy idx 1(op2-1)', () => {
    const enemies = [richEnemy({ health: 200, defense: 30, level: 5 }), richEnemy({ health: 200, defense: 30, level: 5 })]
    const ctx = simulateCtx(enemies, undefined, [objMagic(349, 54)], [magicStat(54, 140, 0)])
    dispatchBattleOpcode(0x42, [349, 0, 2], ctx)
    expect(enemies[0]!.e.health).toBe(200) // 未碰
    expect(enemies[1]!.e.health).toBe(60) // 140
  })

  it('未知 magic object → consumed 但 no-op(防御)', () => {
    const enemies = [richEnemy({ health: 200 })]
    const ctx = simulateCtx(enemies, 0, [], [])
    const r = dispatchBattleOpcode(0x42, [999, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(enemies[0]!.e.health).toBe(200)
  })
})

// ============================================================================
// 0x66 throw weapon(E2)—— script.c:2007-2014:
//   w = op1*5 + AttackStrength[movingPlayer] * RandomLong(0,3);
//   PAL_BattleSimulateMagic((SHORT)eventObjectID, op0, w)
// ============================================================================

function throwWeaponCtx(
  enemies: BattleEnemy[],
  targetIdx: number,
  attackStrength: number,
  rangeInclusiveVal: number,
  objectMagics: ObjectMagicView[],
  magics: Magic[],
): BattleCtx {
  return {
    state: {
      enemies,
      players: [{ roleId: 0, prevHp: 0, prevMp: 0, defending: false, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false } }],
      field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
      // next()=0 → rngFactor 1.0;rangeInclusive 固定 = RandomLong(0,3) 项
      rng: { next: () => 0, range: () => 0, rangeInclusive: () => rangeInclusiveVal, getState: () => 0 },
      // biome-ignore lint/suspicious/noExplicitAny: 最小 BattleState
    } as any as BattleState,
    caster: { type: 'player', idx: 0 },
    target: { type: 'enemy', idx: targetIdx },
    magicTables: { magics, objectMagics },
    // biome-ignore lint/suspicious/noExplicitAny: 只填 attackStrength
    playerRoles: { roles: [{ id: 0, attackStrength } as any] },
  }
}

describe('0x66 throw weapon (E2)', () => {
  it('w = op1*5 + attackStr*RandomLong(0,3) → 目标落血(obj344→magic53 base198 elem0)', () => {
    // op1=10, attackStr=30, RandomLong→2 → w = 50 + 60 = 110
    // def=30+(5+6)*4=74;calcBase(110,74)=trunc(220-118.4+0.5)=102;/4=25;+198=223
    const enemies = [richEnemy({ health: 300, defense: 30, level: 5 })]
    const ctx = throwWeaponCtx(enemies, 0, 30, 2, [objMagic(344, 53)], [magicStat(53, 198, 0)])
    const r = dispatchBattleOpcode(0x66, [344, 10, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(enemies[0]!.e.health).toBe(77) // 300 - 223
  })

  it('attackStr 项随 RandomLong 变(RandomLong→0 → w=op1*5,伤害更低)', () => {
    // op1=10, attackStr=30, RandomLong→0 → w = 50
    // calcBase(50,74)=trunc(50-44.4+0.5)=6;/4=1;+198=199
    const enemies = [richEnemy({ health: 300, defense: 30, level: 5 })]
    const ctx = throwWeaponCtx(enemies, 0, 30, 0, [objMagic(344, 53)], [magicStat(53, 198, 0)])
    dispatchBattleOpcode(0x66, [344, 10, 0], ctx)
    expect(enemies[0]!.e.health).toBe(101) // 300 - 199
  })

  it('target = eventObjectID(ctx.target):2 敌只打被掷的那个', () => {
    const enemies = [richEnemy({ health: 300, defense: 30, level: 5 }), richEnemy({ health: 300, defense: 30, level: 5 })]
    const ctx = throwWeaponCtx(enemies, 1, 30, 2, [objMagic(344, 53)], [magicStat(53, 198, 0)])
    dispatchBattleOpcode(0x66, [344, 10, 0], ctx)
    expect(enemies[0]!.e.health).toBe(300) // 未碰
    expect(enemies[1]!.e.health).toBe(77) // 223
  })

  it('无 playerRoles 注入 → attackStr=0 → w=op1*5(防御)', () => {
    const enemies = [richEnemy({ health: 300, defense: 30, level: 5 })]
    const ctx = throwWeaponCtx(enemies, 0, 30, 2, [objMagic(344, 53)], [magicStat(53, 198, 0)])
    ctx.playerRoles = undefined
    dispatchBattleOpcode(0x66, [344, 10, 0], ctx)
    // w = 50 → 同上 199
    expect(enemies[0]!.e.health).toBe(101)
  })
})
