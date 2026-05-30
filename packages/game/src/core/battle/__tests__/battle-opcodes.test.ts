import type { Enemy, EnemyObject, Magic, ObjectMagicView, ObjectPoisonView } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus, type PresentCommand } from '../../command-bus.js'
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

  it('0x0064 用 maxHealth(满血)非逐回合 prevHp:cur40 / max100 / prevHp50 + pct50 → 不 jump', () => {
    // cur*100=4000;max100*50=5000 → 不 jump。若误用 prevHp50:4000 > 50*50=2500 会误 jump。
    const enemy = { ...makeEnemy(40), maxHealth: 100, prevHp: 50 }
    const ctx = makeCtx(enemy)
    const r = dispatchBattleOpcode(0x0064, [50, 200, 0], ctx)
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

// ============================================================================
// 0x68 jump if enemy turn / 0x91 jump if enemy not first of kind
// ============================================================================

/** 多敌 + caster idx 可控的 ctx(0x91 同类计数用);e.id = 敌人种类。 */
function kindCtx(kindIds: number[], casterIdx: number): BattleCtx {
  return {
    state: {
      // biome-ignore lint/suspicious/noExplicitAny: 只填 e.id + health
      enemies: kindIds.map(id => ({ e: { id, health: 100 } as any, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false }, prevHp: 100, scriptOnTurnStart: 0, scriptOnBattleEnd: 0, scriptOnReady: 0 })),
      players: [],
      // biome-ignore lint/suspicious/noExplicitAny: 最小 BattleState
    } as any as BattleState,
    caster: { type: 'enemy', idx: casterIdx },
  }
}

// ============================================================================
// 0x5B halve enemy HP / 0x39 drain HP(投掷物 scriptOnThrow 上下文)
// ============================================================================

function drainCtx(enemyHealth: number, targetIdx: number, roleHp: number, roleMaxHP: number): BattleCtx {
  return {
    state: {
      enemies: [richEnemy({ health: enemyHealth }), richEnemy({ health: enemyHealth })],
      players: [{ roleId: 0, prevHp: 0, prevMp: 0, defending: false, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false } }],
      // biome-ignore lint/suspicious/noExplicitAny: 最小 BattleState
    } as any as BattleState,
    caster: { type: 'player', idx: 0 },
    target: { type: 'enemy', idx: targetIdx },
    // biome-ignore lint/suspicious/noExplicitAny: 只填 hp/maxHP
    playerRoles: { roles: [{ id: 0, hp: roleHp, maxHP: roleMaxHP } as any] },
  }
}

// ============================================================================
// 0x28 apply poison / 0x5E jump if no poison(毒系投掷物)
// ============================================================================

function poisonEnemy(resist: number, health = 100): BattleEnemy {
  return {
    // biome-ignore lint/suspicious/noExplicitAny: 只填伤害/抗性字段
    e: { id: 100, health, defense: 30, level: 5, poisonResistance: 0, elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } } as any as Enemy,
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
    prevHp: health,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
    resistanceToSorcery: resist,
    poisons: [],
  }
}

/** 稀疏 objectPoisons 数组(index = poison id)。 */
function makeObjectPoisons(map: Record<number, number>): ObjectPoisonView[] {
  const out: ObjectPoisonView[] = []
  for (const [id, enemyScript] of Object.entries(map))
    out[Number(id)] = { id: Number(id), level: 0, color: 0, playerScript: 0, enemyScript }
  return out
}

function poisonCtx(enemies: BattleEnemy[], targetIdx: number, rangeVal: number, objectPoisons: ObjectPoisonView[]): BattleCtx {
  return {
    state: {
      enemies,
      players: [],
      rng: { next: () => 0, range: () => 0, rangeInclusive: () => rangeVal, getState: () => 0 },
      // biome-ignore lint/suspicious/noExplicitAny: 最小 BattleState
    } as any as BattleState,
    caster: { type: 'player', idx: 0 },
    target: { type: 'enemy', idx: targetIdx },
    objectPoisons,
  }
}

describe('0x28 apply poison (script.c:0028,毒蛇卵/卵/蛊 throw)', () => {
  const op = makeObjectPoisons({ 555: 40889, 558: 40911 })

  it('抗性通过(RandomLong>=resist)→ 加毒 {poisonId, scriptEntry}', () => {
    const enemies = [poisonEnemy(0)] // resist 0 → 总中
    const r = dispatchBattleOpcode(0x28, [0, 558, 0], poisonCtx(enemies, 0, 5, op))
    expect(r.consumed).toBe(true)
    expect(enemies[0]!.poisons).toEqual([{ poisonId: 558, scriptEntry: 40911 }])
  })

  it('抗性挡住(RandomLong<resist)→ 不中毒', () => {
    const enemies = [poisonEnemy(8)] // resist 8;RandomLong→5 → 5<8 挡住
    dispatchBattleOpcode(0x28, [0, 558, 0], poisonCtx(enemies, 0, 5, op))
    expect(enemies[0]!.poisons).toEqual([])
  })

  it('去重:同毒应用两次 → 一条', () => {
    const enemies = [poisonEnemy(0)]
    const ctx = poisonCtx(enemies, 0, 5, op)
    dispatchBattleOpcode(0x28, [0, 555, 0], ctx)
    dispatchBattleOpcode(0x28, [0, 555, 0], ctx)
    expect(enemies[0]!.poisons).toHaveLength(1)
  })

  it('全体(op0!=0)→ 所有敌人中毒', () => {
    const enemies = [poisonEnemy(0), poisonEnemy(0)]
    dispatchBattleOpcode(0x28, [1, 558, 0], poisonCtx(enemies, 0, 5, op))
    expect(enemies[0]!.poisons).toHaveLength(1)
    expect(enemies[1]!.poisons).toHaveLength(1)
  })
})

describe('0x5E jump if enemy no poison (script.c:005E)', () => {
  const op = makeObjectPoisons({ 558: 40911 })

  it('敌人无该毒 → jump op1', () => {
    const enemies = [poisonEnemy(0)]
    const r = dispatchBattleOpcode(0x5E, [558, 300, 0], poisonCtx(enemies, 0, 5, op))
    expect(r.consumed).toBe(true)
    expect(r.newIp).toBe(300)
  })

  it('敌人有该毒 → 不 jump', () => {
    const enemies = [poisonEnemy(0)]
    const ctx = poisonCtx(enemies, 0, 5, op)
    dispatchBattleOpcode(0x28, [0, 558, 0], ctx) // 先中毒 558
    const r = dispatchBattleOpcode(0x5E, [558, 300, 0], ctx)
    expect(r.newIp).toBeUndefined()
  })

  it('有别的毒但无 op0 种 → 仍 jump', () => {
    const op2 = makeObjectPoisons({ 555: 40889, 558: 40911 })
    const enemies = [poisonEnemy(0)]
    const ctx = poisonCtx(enemies, 0, 5, op2)
    dispatchBattleOpcode(0x28, [0, 555, 0], ctx) // 中毒 555
    expect(dispatchBattleOpcode(0x5E, [558, 300, 0], ctx).newIp).toBe(300) // 查 558 → 无 → jump
  })
})

// ============================================================================
// 0x57 set magic dmg by MP / 0x88 set magic dmg by money(scriptOnUse 改 baseDamage)
// ============================================================================

function setDmgCtx(roleMp: number, cash: number, objectMagics: ObjectMagicView[], magics: Magic[]): BattleCtx {
  return {
    state: {
      enemies: [],
      players: [{ roleId: 0, prevHp: 0, prevMp: 0, defending: false, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false } }],
      // biome-ignore lint/suspicious/noExplicitAny: 最小 BattleState
    } as any as BattleState,
    caster: { type: 'player', idx: 0 },
    magicTables: { magics, objectMagics },
    // biome-ignore lint/suspicious/noExplicitAny: 只填 mp
    playerRoles: { roles: [{ id: 0, mp: roleMp } as any] },
    // biome-ignore lint/suspicious/noExplicitAny: 只填 dwCash
    gs: { dwCash: cash } as any,
  }
}

describe('Batch A 状态/数据 opcode', () => {
  function stateCtx(over: Partial<BattleState> = {}, caster?: BattleCtx['caster'], target?: BattleCtx['target'], gs?: BattleCtx['gs']): BattleCtx {
    return {
      // biome-ignore lint/suspicious/noExplicitAny: 最小 BattleState
      state: { enemies: [], players: [], phase: 'performAction', iHidingTime: 0, iBlow: 0, isBoss: false, ...over } as any as BattleState,
      caster,
      target,
      gs,
    }
  }

  it('0x5F kill player:目标队员 HP=0', () => {
    const ctx = stateCtx(
      { players: [{ roleId: 0, prevHp: 0, prevMp: 0, defending: false, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false } }] },
      undefined, { type: 'player', idx: 0 },
    )
    // biome-ignore lint/suspicious/noExplicitAny: 只填 hp
    ctx.playerRoles = { roles: [{ id: 0, hp: 100 } as any] }
    const r = dispatchBattleOpcode(0x5F, [0, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(ctx.playerRoles.roles[0]!.hp).toBe(0)
  })

  it('0x5C hide party:iHidingTime = -op0', () => {
    const ctx = stateCtx()
    dispatchBattleOpcode(0x5C, [3, 0, 0], ctx)
    expect(ctx.state.iHidingTime).toBe(-3)
  })

  it('0x6B blow away:iBlow = op0', () => {
    const ctx = stateCtx()
    dispatchBattleOpcode(0x6B, [5, 0, 0], ctx)
    expect(ctx.state.iBlow).toBe(5)
  })

  it('0x89 set battle result:3→won / 1→lost / 0xFFFF→fleed', () => {
    expect((() => { const c = stateCtx(); dispatchBattleOpcode(0x89, [3, 0, 0], c); return c.state.phase })()).toBe('won')
    expect((() => { const c = stateCtx(); dispatchBattleOpcode(0x89, [1, 0, 0], c); return c.state.phase })()).toBe('lost')
    expect((() => { const c = stateCtx(); dispatchBattleOpcode(0x89, [0xFFFF, 0, 0], c); return c.state.phase })()).toBe('fleed')
  })

  it('0x8A enable auto-battle:gs.fAutoBattle=true', () => {
    // biome-ignore lint/suspicious/noExplicitAny: 只填 fAutoBattle
    const gs = { fAutoBattle: false } as any
    dispatchBattleOpcode(0x8A, [0, 0, 0], stateCtx({}, undefined, undefined, gs))
    expect(gs.fAutoBattle).toBe(true)
  })

  it('0x33 collect:有 collectValue → gs.wCollectValue 累加;无 → jump op0', () => {
    // biome-ignore lint/suspicious/noExplicitAny: 只填 wCollectValue
    const gs = { wCollectValue: 5 } as any
    const ctx = stateCtx({ enemies: [richEnemy({})] }, undefined, { type: 'enemy', idx: 0 }, gs)
    ctx.state.enemies[0]!.e.collectValue = 10
    dispatchBattleOpcode(0x33, [200, 0, 0], ctx)
    expect(gs.wCollectValue).toBe(15) // 5+10
    // collectValue 0 → jump op0
    const gs2 = { wCollectValue: 0 } as any
    const ctx2 = stateCtx({ enemies: [richEnemy({})] }, undefined, { type: 'enemy', idx: 0 }, gs2)
    ctx2.state.enemies[0]!.e.collectValue = 0
    expect(dispatchBattleOpcode(0x33, [200, 0, 0], ctx2).newIp).toBe(200)
  })

  it('0x3A player flee:非 boss → fleed;boss → jump op0', () => {
    const ctx = stateCtx({ isBoss: false })
    dispatchBattleOpcode(0x3A, [200, 0, 0], ctx)
    expect(ctx.state.phase).toBe('fleed')
    const bossCtx = stateCtx({ isBoss: true })
    expect(dispatchBattleOpcode(0x3A, [200, 0, 0], bossCtx).newIp).toBe(200)
  })
})

describe('0x5A halve player HP (script.c:005A,无影毒 use)', () => {
  function playerCtx(hp: number): BattleCtx {
    return {
      state: {
        enemies: [],
        players: [{ roleId: 0, prevHp: 0, prevMp: 0, defending: false, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false } }],
        // biome-ignore lint/suspicious/noExplicitAny: 最小 BattleState
      } as any as BattleState,
      caster: { type: 'player', idx: 0 },
      target: { type: 'player', idx: 0 },
      // biome-ignore lint/suspicious/noExplicitAny: 只填 hp
      playerRoles: { roles: [{ id: 0, hp } as any] },
    }
  }
  it('目标队员 HP 减半(floor)', () => {
    const ctx = playerCtx(101)
    const r = dispatchBattleOpcode(0x5A, [0, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(ctx.playerRoles!.roles[0]!.hp).toBe(50) // floor(101/2)
  })
})

describe('0x57 set magic base damage by MP (script.c:0057,酒神)', () => {
  it('magic.baseDamage = casterMP * (op1||8);casterMP 清 0', () => {
    const magics = [magicStat(75, 3, 0)]
    const ctx = setDmgCtx(100, 0, [objMagic(370, 75)], magics)
    const r = dispatchBattleOpcode(0x57, [370, 0, 0], ctx) // op1=0 → i=8
    expect(r.consumed).toBe(true)
    expect(magics[0]!.baseDamage).toBe(800) // 100*8
    expect(ctx.playerRoles!.roles[0]!.mp).toBe(0)
  })
  it('op1 显式倍率', () => {
    const magics = [magicStat(75, 3, 0)]
    dispatchBattleOpcode(0x57, [370, 5, 0], setDmgCtx(50, 0, [objMagic(370, 75)], magics))
    expect(magics[0]!.baseDamage).toBe(250) // 50*5
  })
})

describe('0x88 set magic base damage by money (script.c:0088,乾坤一掷)', () => {
  it('magic.baseDamage = min(cash,5000)*2/5;扣 cash', () => {
    const magics = [magicStat(100, 0, 0)]
    const ctx = setDmgCtx(0, 1000, [objMagic(394, 100)], magics)
    const r = dispatchBattleOpcode(0x88, [394, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(magics[0]!.baseDamage).toBe(400) // 1000*2/5
    expect(ctx.gs!.dwCash).toBe(0) // 扣 1000
  })
  it('cash > 5000 → cap 5000', () => {
    const magics = [magicStat(100, 0, 0)]
    const ctx = setDmgCtx(0, 8000, [objMagic(394, 100)], magics)
    dispatchBattleOpcode(0x88, [394, 0, 0], ctx)
    expect(magics[0]!.baseDamage).toBe(2000) // 5000*2/5
    expect(ctx.gs!.dwCash).toBe(3000) // 8000-5000
  })
})

describe('0x21 inflict damage to enemy (script.c:0021,梅花镖/银针 throw)', () => {
  it('单体(op0=0):ctx.target -op1', () => {
    const ctx = drainCtx(100, 0, 0, 0)
    const r = dispatchBattleOpcode(0x21, [0, 90, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(ctx.state.enemies[0]!.e.health).toBe(10) // 100-90
    expect(ctx.state.enemies[1]!.e.health).toBe(100) // 未碰
  })
  it('全体(op0!=0):每个敌人 -op1', () => {
    const ctx = drainCtx(100, 0, 0, 0)
    dispatchBattleOpcode(0x21, [1, 50, 0], ctx)
    expect(ctx.state.enemies[0]!.e.health).toBe(50)
    expect(ctx.state.enemies[1]!.e.health).toBe(50)
  })
  it('clamp ≥0', () => {
    const ctx = drainCtx(30, 0, 0, 0)
    dispatchBattleOpcode(0x21, [0, 90, 0], ctx)
    expect(ctx.state.enemies[0]!.e.health).toBe(0)
  })
})

describe('0x5B halve enemy HP (script.c:005B,无影毒 throw)', () => {
  it('w = health/2+1,cap op0:health100 op0=30 → -30 = 70', () => {
    const ctx = drainCtx(100, 0, 0, 0)
    const r = dispatchBattleOpcode(0x5B, [30, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(ctx.state.enemies[0]!.e.health).toBe(70) // w=51>30→30
  })
  it('cap 不触发:health100 op0=80 → w=51 → 49', () => {
    const ctx = drainCtx(100, 0, 0, 0)
    dispatchBattleOpcode(0x5B, [80, 0, 0], ctx)
    expect(ctx.state.enemies[0]!.e.health).toBe(49)
  })
  it('target = ctx.target(被掷敌人):打 idx1 不碰 idx0', () => {
    const ctx = drainCtx(100, 1, 0, 0)
    dispatchBattleOpcode(0x5B, [30, 0, 0], ctx)
    expect(ctx.state.enemies[0]!.e.health).toBe(100)
    expect(ctx.state.enemies[1]!.e.health).toBe(70)
  })
})

describe('0x39 drain HP (script.c:0039,吸星锁 throw)', () => {
  it('enemy -op0,caster player +op0(clamp maxHP)', () => {
    const ctx = drainCtx(100, 0, 50, 200)
    const r = dispatchBattleOpcode(0x39, [40, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(ctx.state.enemies[0]!.e.health).toBe(60) // 100-40
    expect(ctx.playerRoles!.roles[0]!.hp).toBe(90) // 50+40
  })
  it('player hp 回满 clamp maxHP', () => {
    const ctx = drainCtx(100, 0, 190, 200)
    dispatchBattleOpcode(0x39, [40, 0, 0], ctx)
    expect(ctx.playerRoles!.roles[0]!.hp).toBe(200) // min(200, 230)
  })
})

// ============================================================================
// 0x9E enemy summon(战斗中召唤敌人)
// ============================================================================

function summonCtx(roster: BattleEnemy[], casterIdx: number, allEnemies: Enemy[], enemyObjects: EnemyObject[]): BattleCtx {
  return {
    // biome-ignore lint/suspicious/noExplicitAny: 最小 BattleState
    state: { enemies: roster, players: [] } as any as BattleState,
    caster: { type: 'enemy', idx: casterIdx },
    summonTables: { enemies: allEnemies, enemyObjects },
  }
}

const ENEMY_OBJ = (objectIndex: number, enemyId: number): EnemyObject => ({ objectIndex, enemyId, resistanceToSorcery: 3, scriptOnTurnStart: 11, scriptOnBattleEnd: 0, scriptOnReady: 22 })
// biome-ignore lint/suspicious/noExplicitAny: 只填关键字段
const ENEMY = (id: number, health: number): Enemy => ({ id, health, defense: 0, level: 1 } as any as Enemy)

describe('0x9C enemy division (script.c:009C)', () => {
  it('恰 1 活敌 + health>1 → 分裂 op0+1 份(各 floor((h+w)/(w+1)))', () => {
    const roster = [richEnemy({ health: 100 })]
    const ctx = summonCtx(roster, 0, [], [])
    const r = dispatchBattleOpcode(0x9C, [2, 300, 0], ctx) // 分裂成 3
    expect(r.consumed).toBe(true)
    expect(roster).toHaveLength(3)
    // floor((100+2)/3)=34
    expect(roster[0]!.e.health).toBe(34)
    expect(roster[1]!.e.health).toBe(34)
    expect(roster[2]!.e.health).toBe(34)
  })
  it('不止 1 活敌 → 不分裂,jump op1', () => {
    const roster = [richEnemy({ health: 100 }), richEnemy({ health: 100 })]
    const r = dispatchBattleOpcode(0x9C, [2, 300, 0], summonCtx(roster, 0, [], []))
    expect(roster).toHaveLength(2)
    expect(r.newIp).toBe(300)
  })
  it('self health<=1 → 不分裂,jump op1', () => {
    const roster = [richEnemy({ health: 1 })]
    expect(dispatchBattleOpcode(0x9C, [2, 300, 0], summonCtx(roster, 0, [], [])).newIp).toBe(300)
  })
})

describe('0x9F enemy transform (script.c:009F)', () => {
  it('变身成 op0 对象(保留当前 health)', () => {
    const self = richEnemy({ health: 30 })
    self.e.id = 5
    const roster = [self]
    dispatchBattleOpcode(0x9F, [419, 0, 0], summonCtx(roster, 0, [ENEMY(22, 80)], [ENEMY_OBJ(419, 22)]))
    expect(roster[0]!.e.id).toBe(22) // 变成新种
    expect(roster[0]!.e.health).toBe(30) // 保留当前血
    expect(roster[0]!.scriptOnReady).toBe(22)
  })
  it('自身睡眠 → 不变身', () => {
    const self = richEnemy({ health: 30 })
    self.e.id = 5
    self.status.sleep = 3
    const roster = [self]
    dispatchBattleOpcode(0x9F, [419, 0, 0], summonCtx(roster, 0, [ENEMY(22, 80)], [ENEMY_OBJ(419, 22)]))
    expect(roster[0]!.e.id).toBe(5) // 没变
  })
})

describe('0x9E enemy summon (script.c:009E)', () => {
  it('w!=0 召唤指定敌人(obj→enemyId→enemies)+ 满血 + 脚本/抗性', () => {
    const roster = [richEnemy({ health: 200 })]
    const ctx = summonCtx(roster, 0, [ENEMY(22, 80)], [ENEMY_OBJ(419, 22)])
    const r = dispatchBattleOpcode(0x9E, [419, 1, 300], ctx)
    expect(r.consumed).toBe(true)
    expect(roster).toHaveLength(2)
    expect(roster[1]!.e.id).toBe(22)
    expect(roster[1]!.e.health).toBe(80) // 满血(enemies.json base)
    expect(roster[1]!.scriptOnReady).toBe(22)
    expect(roster[1]!.resistanceToSorcery).toBe(3)
    expect(roster[1]!.poisons).toEqual([])
  })

  it('count op1:召唤 2 只', () => {
    const roster = [richEnemy({ health: 200 })]
    dispatchBattleOpcode(0x9E, [419, 2, 300], summonCtx(roster, 0, [ENEMY(22, 80)], [ENEMY_OBJ(419, 22)]))
    expect(roster).toHaveLength(3)
  })

  it('w=0 召唤自身同种(满血副本)', () => {
    const self = richEnemy({ health: 30 }) // 当前残血 30
    self.e.id = 7
    const roster = [self]
    dispatchBattleOpcode(0x9E, [0, 1, 300], summonCtx(roster, 0, [ENEMY(7, 150)], [ENEMY_OBJ(500, 7)]))
    expect(roster).toHaveLength(2)
    expect(roster[1]!.e.id).toBe(7)
    expect(roster[1]!.e.health).toBe(150) // 满血,非 self 当前 30
  })

  it('房间不足(已 5 只)→ fail → jump op2', () => {
    const roster = [richEnemy({}), richEnemy({}), richEnemy({}), richEnemy({}), richEnemy({})]
    const r = dispatchBattleOpcode(0x9E, [419, 1, 300], summonCtx(roster, 0, [ENEMY(22, 80)], [ENEMY_OBJ(419, 22)]))
    expect(roster).toHaveLength(5) // 没加
    expect(r.newIp).toBe(300) // 跳失败分支
  })

  it('自身睡眠 → fail → jump op2', () => {
    const self = richEnemy({ health: 200 })
    self.status.sleep = 3
    const roster = [self]
    const r = dispatchBattleOpcode(0x9E, [419, 1, 300], summonCtx(roster, 0, [ENEMY(22, 80)], [ENEMY_OBJ(419, 22)]))
    expect(roster).toHaveLength(1)
    expect(r.newIp).toBe(300)
  })

  it('count<=0 → 当 1', () => {
    const roster = [richEnemy({ health: 200 })]
    dispatchBattleOpcode(0x9E, [419, 0, 300], summonCtx(roster, 0, [ENEMY(22, 80)], [ENEMY_OBJ(419, 22)]))
    expect(roster).toHaveLength(2)
  })
})

describe('0x68 jump if enemy turn (script.c:2025)', () => {
  it('caster=enemy(fEnemyMoving)→ jump op0', () => {
    const ctx = makeCtx(makeEnemy(100)) // caster {type:'enemy'}
    const r = dispatchBattleOpcode(0x68, [200, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(r.newIp).toBe(200)
  })

  it('caster=player → 不 jump(ip++)', () => {
    const ctx = makeCtx(makeEnemy(100))
    ctx.caster = { type: 'player', idx: 0 }
    const r = dispatchBattleOpcode(0x68, [200, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(r.newIp).toBeUndefined()
  })

  it('op0=0 → jump 到 ip 0(全局 end)', () => {
    const ctx = makeCtx(makeEnemy(100))
    expect(dispatchBattleOpcode(0x68, [0, 0, 0], ctx).newIp).toBe(0)
  })
})

describe('0x91 jump if enemy not first of kind (script.c:2091)', () => {
  it('同类首个(self_pos=1)→ 不 jump', () => {
    const ctx = kindCtx([5, 5, 5], 0) // idx0 是第一个 id5
    const r = dispatchBattleOpcode(0x91, [200, 0, 0], ctx)
    expect(r.consumed).toBe(true)
    expect(r.newIp).toBeUndefined()
  })

  it('同类第二个(self_pos=2)→ jump op0', () => {
    const ctx = kindCtx([5, 5, 5], 1)
    expect(dispatchBattleOpcode(0x91, [200, 0, 0], ctx).newIp).toBe(200)
  })

  it('同类第三个 → jump', () => {
    const ctx = kindCtx([5, 5, 5], 2)
    expect(dispatchBattleOpcode(0x91, [200, 0, 0], ctx).newIp).toBe(200)
  })

  it('独一份(只有 1 个该种)→ 不 jump', () => {
    const ctx = kindCtx([5, 7, 9], 0)
    expect(dispatchBattleOpcode(0x91, [200, 0, 0], ctx).newIp).toBeUndefined()
  })

  it('混种:[5,7,5] 的第二个 5(idx2)→ jump;第一个 5(idx0)→ 不 jump', () => {
    expect(dispatchBattleOpcode(0x91, [200, 0, 0], kindCtx([5, 7, 5], 2)).newIp).toBe(200)
    expect(dispatchBattleOpcode(0x91, [200, 0, 0], kindCtx([5, 7, 5], 0)).newIp).toBeUndefined()
  })

  it('op0=0(真实数据全 0)→ self_pos>1 时 jump 到 ip 0(end,只首个跑脚本)', () => {
    expect(dispatchBattleOpcode(0x91, [0, 0, 0], kindCtx([5, 5], 1)).newIp).toBe(0)
  })
})

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

// ============================================================================
// Batch C battle-context:0x30 stat-buff% / 0x31 sprite-swap / 0x92 magic-anim
// ============================================================================

// biome-ignore lint/suspicious/noExplicitAny: 只填 stat 字段
function statBuffCtx(roles: any[], casterIdx = 0): BattleCtx {
  return {
    state: {
      enemies: [],
      players: roles.map((r, i) => ({ roleId: r.id ?? i, prevHp: 0, prevMp: 0, defending: false, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false } })),
      // biome-ignore lint/suspicious/noExplicitAny: 最小 BattleState
    } as any as BattleState,
    caster: { type: 'player', idx: casterIdx },
    // biome-ignore lint/suspicious/noExplicitAny: roles 直填
    playerRoles: { roles } as any,
  }
}

describe('0x30 buff player stat % (script.c:0030,梦蛇 等)', () => {
  it('op0=17 attackStrength +100%,op2=0 → caster role(base 30 → 60)', () => {
    const roles = [{ id: 0, attackStrength: 30, magicStrength: 50, defense: 40, dexterity: 20 }]
    const r = dispatchBattleOpcode(0x30, [17, 100, 0], statBuffCtx(roles))
    expect(r.consumed).toBe(true)
    expect(roles[0]!.attackStrength).toBe(60) // 30 + trunc(30*100/100)
  })

  it('op2>0 → role=op2-1(指定队员而非 caster)', () => {
    const roles = [
      { id: 0, attackStrength: 30, magicStrength: 50, defense: 40, dexterity: 20 },
      { id: 1, attackStrength: 80, magicStrength: 50, defense: 40, dexterity: 20 },
    ]
    dispatchBattleOpcode(0x30, [18, 10, 2], statBuffCtx(roles)) // op0=18 magicStr,op2=2 → roles[1]
    expect(roles[0]!.magicStrength).toBe(50) // 未碰
    expect(roles[1]!.magicStrength).toBe(55) // 50 + trunc(50*10/100)
  })

  it('op1 负值(SHORT)= debuff:op0=19 defense op1=0xFFCE(-50%)→ base40 → 20', () => {
    const roles = [{ id: 0, attackStrength: 30, magicStrength: 50, defense: 40, dexterity: 20 }]
    dispatchBattleOpcode(0x30, [19, 0xFFCE, 0], statBuffCtx(roles)) // 0xFFCE = -50
    expect(roles[0]!.defense).toBe(20) // 40 + trunc(40*-50/100) = 40 - 20
  })

  it('op0=20 dexterity 走映射', () => {
    const roles = [{ id: 0, attackStrength: 30, magicStrength: 50, defense: 40, dexterity: 20 }]
    dispatchBattleOpcode(0x30, [20, 50, 0], statBuffCtx(roles))
    expect(roles[0]!.dexterity).toBe(30) // 20 + trunc(20*50/100) = 20 + 10
  })

  it('未知 op0 row → 无字段映射,no-op consumed', () => {
    const roles = [{ id: 0, attackStrength: 30, magicStrength: 50, defense: 40, dexterity: 20 }]
    const r = dispatchBattleOpcode(0x30, [99, 100, 0], statBuffCtx(roles))
    expect(r.consumed).toBe(true)
    expect(roles[0]!.attackStrength).toBe(30) // 未碰
  })

  it('无 playerRoles → consumed,不崩', () => {
    const ctx = statBuffCtx([{ id: 0, attackStrength: 30, magicStrength: 50, defense: 40, dexterity: 20 }])
    ctx.playerRoles = undefined
    const r = dispatchBattleOpcode(0x30, [17, 100, 0], ctx)
    expect(r.consumed).toBe(true)
  })
})

describe('0x31 / 0x92 present-only(no-op consumed)', () => {
  it('0x31 change battle sprite → consumed,不崩(present 精灵替换待)', () => {
    const r = dispatchBattleOpcode(0x31, [200, 0, 0], statBuffCtx([{ id: 0, attackStrength: 30 }]))
    expect(r.consumed).toBe(true)
  })

  it('0x92 show magic anim → consumed,不崩(present 跳过战斗动画 D17)', () => {
    const r = dispatchBattleOpcode(0x92, [1, 0, 0], statBuffCtx([{ id: 0, attackStrength: 30 }]))
    expect(r.consumed).toBe(true)
  })
})

// ============================================================================
// 0x6A steal from enemy(fight.c:5193 PAL_BattleStealFromEnemy)
// ============================================================================

// rangeInclusive(0,10)=roll010;rangeInclusive(2,3)=div23。其余 lo。
// biome-ignore lint/suspicious/noExplicitAny: 只填 rangeInclusive
function fakeRng(roll010: number, div23 = 2): any {
  return {
    next: () => 0,
    range: () => 0,
    rangeInclusive: (lo: number, hi: number) => {
      if (lo === 0 && hi === 10) return roll010
      if (lo === 2 && hi === 3) return div23
      return lo
    },
    getState: () => 0,
  }
}

// biome-ignore lint/suspicious/noExplicitAny: 最小 ctx
function stealCtx(enemy: BattleEnemy, rng: any, cash = 0, inventory: Array<{ itemId: number, count: number }> = []): BattleCtx {
  return {
    state: {
      enemies: [enemy],
      players: [{ roleId: 0, prevHp: 0, prevMp: 0, defending: false, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false } }],
      rng,
      // biome-ignore lint/suspicious/noExplicitAny: 最小 BattleState
    } as any as BattleState,
    caster: { type: 'player', idx: 0 },
    target: { type: 'enemy', idx: 0 },
    // biome-ignore lint/suspicious/noExplicitAny: 只填 dwCash/inventory
    gs: { dwCash: cash, inventory } as any,
  }
}

describe('0x6A steal from enemy (fight.c:5193)', () => {
  it('偷物成功(wStealItem!=0,roll<=rate)→ nStealItem-- + AddItem', () => {
    const enemy = richEnemy({ stealItem: 42, stealItemCount: 2 })
    const ctx = stealCtx(enemy, fakeRng(3))
    const r = dispatchBattleOpcode(0x6A, [5, 0, 0], ctx) // rate=5,roll=3 pass
    expect(r.consumed).toBe(true)
    expect(enemy.e.stealItemCount).toBe(1)
    expect(ctx.gs!.inventory).toEqual([{ itemId: 42, count: 1 }])
  })

  it('偷钱(wStealItem==0)→ c=nStealItem/RandomLong(2,3);nStealItem-=c;dwCash+=c', () => {
    const enemy = richEnemy({ stealItem: 0, stealItemCount: 100 })
    const ctx = stealCtx(enemy, fakeRng(3, 2), 500) // roll=3<=rate;div=2 → c=50
    dispatchBattleOpcode(0x6A, [5, 0, 0], ctx)
    expect(enemy.e.stealItemCount).toBe(50) // 100-50
    expect(ctx.gs!.dwCash).toBe(550) // 500+50
  })

  it('rate==0 → 必成(即使 roll 大)', () => {
    const enemy = richEnemy({ stealItem: 42, stealItemCount: 1 })
    const ctx = stealCtx(enemy, fakeRng(10)) // roll=10 但 rate=0 → pass
    dispatchBattleOpcode(0x6A, [0, 0, 0], ctx)
    expect(enemy.e.stealItemCount).toBe(0)
    expect(ctx.gs!.inventory).toEqual([{ itemId: 42, count: 1 }])
  })

  it('roll > rate(rate!=0)→ 失败,无变化', () => {
    const enemy = richEnemy({ stealItem: 42, stealItemCount: 2 })
    const ctx = stealCtx(enemy, fakeRng(8)) // roll=8 > rate=2
    dispatchBattleOpcode(0x6A, [2, 0, 0], ctx)
    expect(enemy.e.stealItemCount).toBe(2) // 未变
    expect(ctx.gs!.inventory).toEqual([])
  })

  it('nStealItem==0 → 无可偷,无变化', () => {
    const enemy = richEnemy({ stealItem: 42, stealItemCount: 0 })
    const ctx = stealCtx(enemy, fakeRng(0), 500)
    dispatchBattleOpcode(0x6A, [10, 0, 0], ctx)
    expect(enemy.e.stealItemCount).toBe(0)
    expect(ctx.gs!.inventory).toEqual([])
    expect(ctx.gs!.dwCash).toBe(500)
  })

  it('偷钱 c=0 边界(nStealItem<div)→ nStealItem 不变,dwCash 不变', () => {
    const enemy = richEnemy({ stealItem: 0, stealItemCount: 1 })
    const ctx = stealCtx(enemy, fakeRng(0, 3), 500) // c=trunc(1/3)=0
    dispatchBattleOpcode(0x6A, [5, 0, 0], ctx)
    expect(enemy.e.stealItemCount).toBe(1)
    expect(ctx.gs!.dwCash).toBe(500)
  })

  it('已有该物品 → count 累加(99 clamp)', () => {
    const enemy = richEnemy({ stealItem: 42, stealItemCount: 1 })
    const ctx = stealCtx(enemy, fakeRng(0), 0, [{ itemId: 42, count: 5 }])
    dispatchBattleOpcode(0x6A, [5, 0, 0], ctx)
    expect(ctx.gs!.inventory).toEqual([{ itemId: 42, count: 6 }])
  })
})

// ============================================================================
// D17b:HP-mutate opcode → emit showDamageNum(对照 sdlpal fight.c:602-716
//   PAL_BattleDisplayStatChange;sDamage=newHP-oldHP,<0=blue/掉血,>0=yellow/回血)
// ============================================================================

/** drain showDamageNum 命令(过滤其他 op)。 */
function damageNums(bus: ReturnType<typeof createCommandBus>): Array<Extract<PresentCommand, { op: 'showDamageNum' }>> {
  return bus.drain()
    .map(e => e.cmd)
    .filter((c): c is Extract<PresentCommand, { op: 'showDamageNum' }> => c.op === 'showDamageNum')
}

describe('D17b showDamageNum emit', () => {
  it('0x21 单体扣血 → emit blue,target enemy,value=钳后 delta', () => {
    const bus = createCommandBus()
    const enemies = [richEnemy({ health: 100 })]
    const ctx: BattleCtx = {
      // biome-ignore lint/suspicious/noExplicitAny: 最小 state
      state: { enemies, players: [] } as any as BattleState,
      target: { type: 'enemy', idx: 0 },
      bus,
    }
    dispatchBattleOpcode(0x21, [0, 30], ctx) // op0=0 单体,op1=30 伤害
    expect(enemies[0]!.e.health).toBe(70)
    const nums = damageNums(bus)
    expect(nums).toHaveLength(1)
    expect(nums[0]).toEqual({ op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 30, color: 'blue' })
  })

  it('0x21 致死钳到 0 → value = 钳后真实 delta(非原始伤害)', () => {
    const bus = createCommandBus()
    const enemies = [richEnemy({ health: 20 })]
    const ctx: BattleCtx = {
      // biome-ignore lint/suspicious/noExplicitAny: 最小 state
      state: { enemies, players: [] } as any as BattleState,
      target: { type: 'enemy', idx: 0 },
      bus,
    }
    dispatchBattleOpcode(0x21, [0, 100], ctx) // 伤害 100 但只剩 20
    expect(enemies[0]!.e.health).toBe(0)
    const nums = damageNums(bus)
    expect(nums[0]!.value).toBe(20) // 钳后 delta = 20,不是 100
  })

  it('0x21 全体扣血 → 每敌各 emit 一条 blue,target idx 各异', () => {
    const bus = createCommandBus()
    const enemies = [richEnemy({ health: 100 }), richEnemy({ health: 80 })]
    const ctx: BattleCtx = {
      // biome-ignore lint/suspicious/noExplicitAny: 最小 state
      state: { enemies, players: [] } as any as BattleState,
      bus,
    }
    dispatchBattleOpcode(0x21, [1, 30], ctx) // op0!=0 全体
    const nums = damageNums(bus)
    expect(nums).toHaveLength(2)
    expect(nums.map(n => n.target.idx).sort()).toEqual([0, 1])
    expect(nums.every(n => n.color === 'blue' && n.target.kind === 'enemy')).toBe(true)
  })

  it('0x21 不传 bus → 不 emit 不抛(防御)', () => {
    const enemies = [richEnemy({ health: 100 })]
    const ctx: BattleCtx = {
      // biome-ignore lint/suspicious/noExplicitAny: 最小 state(无 bus)
      state: { enemies, players: [] } as any as BattleState,
      target: { type: 'enemy', idx: 0 },
    }
    expect(() => dispatchBattleOpcode(0x21, [0, 30], ctx)).not.toThrow()
    expect(enemies[0]!.e.health).toBe(70)
  })

  it('0x42 SimulateMagic → emit blue per 命中敌人(钳后 delta)', () => {
    const bus = createCommandBus()
    const enemies = [richEnemy({ health: 200, defense: 30, level: 5 })]
    const ctx = simulateCtx(enemies, 0, [objMagic(349, 54)], [magicStat(54, 140, 0)])
    ctx.bus = bus
    dispatchBattleOpcode(0x42, [349, 0, 0], ctx)
    expect(enemies[0]!.e.health).toBe(60) // 200-140
    const nums = damageNums(bus)
    expect(nums).toHaveLength(1)
    expect(nums[0]).toEqual({ op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 140, color: 'blue' })
  })

  it('0x5B halve enemy HP → emit blue', () => {
    const bus = createCommandBus()
    const enemies = [richEnemy({ health: 100 })]
    const ctx: BattleCtx = {
      // biome-ignore lint/suspicious/noExplicitAny: 最小 state
      state: { enemies, players: [] } as any as BattleState,
      target: { type: 'enemy', idx: 0 },
      bus,
    }
    dispatchBattleOpcode(0x5B, [9999], ctx) // w=50+1=51 cap 大 → 减 51
    const nums = damageNums(bus)
    expect(nums).toHaveLength(1)
    expect(nums[0]).toMatchObject({ color: 'blue', target: { kind: 'enemy', idx: 0 }, value: 51 })
  })

  it('0x39 drain HP → enemy blue(掉血) + caster player yellow(回血)', () => {
    const bus = createCommandBus()
    const ctx = drainCtx(100, 0, 50, 200) // enemy 100, role hp 50/maxHP 200
    ctx.bus = bus
    dispatchBattleOpcode(0x39, [30], ctx) // 吸 30
    const nums = damageNums(bus)
    expect(nums).toHaveLength(2)
    const enemyNum = nums.find(n => n.target.kind === 'enemy')!
    const playerNum = nums.find(n => n.target.kind === 'player')!
    expect(enemyNum).toMatchObject({ color: 'blue', value: 30 }) // 敌掉血
    expect(playerNum).toMatchObject({ color: 'yellow', target: { kind: 'player', idx: 0 }, value: 30 }) // 队员回血
  })

  it('0x5A halve player HP → emit blue,target player', () => {
    const bus = createCommandBus()
    const ctx: BattleCtx = {
      state: {
        enemies: [],
        players: [{ roleId: 0, prevHp: 0, prevMp: 0, defending: false, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false } }],
        // biome-ignore lint/suspicious/noExplicitAny: 最小 state
      } as any as BattleState,
      target: { type: 'player', idx: 0 },
      // biome-ignore lint/suspicious/noExplicitAny: 只填 hp
      playerRoles: { roles: [{ id: 0, hp: 80 } as any] },
      bus,
    }
    dispatchBattleOpcode(0x5A, [0], ctx)
    const nums = damageNums(bus)
    expect(nums).toHaveLength(1)
    expect(nums[0]).toMatchObject({ color: 'blue', target: { kind: 'player', idx: 0 }, value: 40 }) // 80→40
  })

  it('0x5F kill player → emit blue value=full HP', () => {
    const bus = createCommandBus()
    const ctx: BattleCtx = {
      state: {
        enemies: [],
        players: [{ roleId: 0, prevHp: 0, prevMp: 0, defending: false, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false } }],
        // biome-ignore lint/suspicious/noExplicitAny: 最小 state
      } as any as BattleState,
      target: { type: 'player', idx: 0 },
      // biome-ignore lint/suspicious/noExplicitAny: 只填 hp
      playerRoles: { roles: [{ id: 0, hp: 123 } as any] },
      bus,
    }
    dispatchBattleOpcode(0x5F, [0], ctx)
    const nums = damageNums(bus)
    expect(nums).toHaveLength(1)
    expect(nums[0]).toMatchObject({ color: 'blue', target: { kind: 'player', idx: 0 }, value: 123 })
  })

  it('0x60 immediate KO → emit blue value=enemy 当前 HP', () => {
    const bus = createCommandBus()
    const enemies = [richEnemy({ health: 77 })]
    const ctx: BattleCtx = {
      // biome-ignore lint/suspicious/noExplicitAny: 最小 state
      state: { enemies, players: [] } as any as BattleState,
      caster: { type: 'enemy', idx: 0 },
      bus,
    }
    dispatchBattleOpcode(0x60, [0xFFFF], ctx)
    const nums = damageNums(bus)
    expect(nums).toHaveLength(1)
    expect(nums[0]).toMatchObject({ color: 'blue', target: { kind: 'enemy', idx: 0 }, value: 77 })
  })
})
