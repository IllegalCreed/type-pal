/**
 * coop-magic.test.ts —— 协力合击执行(performCoopMagic),对照 sdlpal fight.c:3856-4043(CLASSIC)。
 *
 * 验:HP 代价(非 MP,user 强调)/ str=Σ(atk+mag)/4 over healthy contributors / 仅 healthy 参与 /
 *     伤害经 applyMagicDamage(minDamage=1)/ 装备 override 的 coopId 解析。
 */

import type { Enemy, Magic, ObjectMagicView, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from '../../command-bus.js'
import { createSeedableRng } from '../../rng.js'
import { performCoopMagic } from '../actions/coop-magic.js'
import { applyMagicDamage } from '../magic-damage.js'
import type { BattleState } from '../battle-state.js'

function makeRole(id: number, opts: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id, _name: `R${id}`, avatar: 0, spriteNumInBattle: 0, spriteNum: 0, name: 0, attackAll: 0,
    level: 10, maxHP: 500, maxMP: 30, hp: 500, mp: 30,
    attackStrength: 0, magicStrength: 0, defense: 0, dexterity: 30, fleeRate: 5, poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 0, attackSound: 0, weaponSound: 0, criticalSound: 0, magicSound: 0, deathSound: 0,
    ...opts,
  } as PlayerRole
}

function makeEnemy(opts: Partial<Enemy> = {}): Enemy {
  return {
    id: 100, _name: 'E', idleFrames: 0, magicFrames: 0, attackFrames: 0, idleAnimSpeed: 0, actWaitFrames: 0,
    yPosOffset: 0, attackSound: 0, actionSound: 0, magicSound: 0, deathSound: 0, callSound: 0,
    health: 9000, exp: 10, cash: 30, level: 5, magic: 0, magicRate: 0, attackEquivItem: 0, attackEquivItemRate: 0,
    stealItem: 0, stealItemCount: 0, attackStrength: 0, magicStrength: 0, defense: 0, dexterity: 20, fleeRate: 5,
    poisonResistance: 0, elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1, dualMove: 0, collectValue: 0, ...opts,
  } as Enemy
}

const COOP_MAGIC: Magic = {
  id: 50, effect: 0, type: 'attackAll', xOffset: 0, yOffset: 0, special: 0, speed: 0, keepEffect: 0,
  fireDelay: 0, effectTimes: 0, shake: 0, wave: 0, unknown: 0, costMP: 30, baseDamage: 80, elemental: 1, sound: 0,
} as Magic
// object 351(圣灵珠合击)→ magicNumber 50;applyToAll(attackAll)。
const OBJ_MAGICS: ObjectMagicView[] = [{ id: 351, magicNumber: 50, scriptOnSuccess: 0, scriptOnUse: 0, flags: { applyToAll: true } } as unknown as ObjectMagicView]

function makeCoopState(roles: PlayerRole[], statuses: Array<Partial<{ sleep: number }>> = []): {
  state: BattleState
  playerRoles: PlayerRoles
} {
  const playerRoles: PlayerRoles = { roles }
  const rng = { ...createSeedableRng(1), next: () => 0 } // rngFactor=1.0
  const state = {
    players: roles.map((r, i) => ({
      roleId: r.id, prevHp: r.hp, prevMp: r.mp, defending: false,
      status: { sleep: statuses[i]?.sleep ?? 0, paralyzed: 0, confused: 0, haste: 0, slow: 0, silence: 0, puppet: 0 },
    })),
    enemies: [{ e: makeEnemy(), status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 }, prevHp: 9000, scriptOnTurnStart: 0, scriptOnBattleEnd: 0, scriptOnReady: 0 }],
    field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
    isBoss: false, rng,
    // biome-ignore lint/suspicious/noExplicitAny: 最小 BattleState
  } as any as BattleState
  return { state, playerRoles }
}

describe('performCoopMagic(协力合击,fight.c:3856-4043 CLASSIC)', () => {
  it('HP 代价(非 MP):每个 healthy contributor hp -= magic.costMP(30),MP 不动', () => {
    const roles = [makeRole(0, { attackStrength: 40, magicStrength: 60 }), makeRole(1, { attackStrength: 20, magicStrength: 40 })]
    const { state, playerRoles } = makeCoopState(roles)
    performCoopMagic({ state, casterIdx: 0, coopObjId: 351, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus: createCommandBus() })
    expect(roles[0]!.hp).toBe(470) // 500 - 30
    expect(roles[1]!.hp).toBe(470)
    expect(roles[0]!.mp).toBe(30)  // MP 不动
  })

  it('HP 代价 <=0 钳 1(healthy 但低血 contributor 不死)', () => {
    // role0 maxHP100 hp25(healthy:25>=maxHP/5=20)→ 25-30 钳 1。需 2 healthy contributor。
    const roles = [makeRole(0, { maxHP: 100, hp: 25, attackStrength: 40, magicStrength: 60 }), makeRole(1, { hp: 500, attackStrength: 20, magicStrength: 40 })]
    const { state, playerRoles } = makeCoopState(roles)
    performCoopMagic({ state, casterIdx: 0, coopObjId: 351, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus: createCommandBus() })
    expect(roles[0]!.hp).toBe(1) // 25-30 → 钳 1
    expect(roles[1]!.hp).toBe(470)
  })

  it('濒死队员(hp<maxHP/5)非 healthy → 不参与(sdlpal PAL_IsPlayerHealthy)', () => {
    // role0 maxHP500 hp20(濒死:20<100)→ 排除;只剩 role1 healthy → <=1 → no-op。
    const roles = [makeRole(0, { hp: 20 }), makeRole(1, { hp: 500 })]
    const { state, playerRoles } = makeCoopState(roles)
    const before = state.enemies[0]!.e.health
    performCoopMagic({ state, casterIdx: 0, coopObjId: 351, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus: createCommandBus() })
    expect(state.enemies[0]!.e.health).toBe(before) // 濒死排除 → healthy<=1 → no-op
    expect(roles[1]!.hp).toBe(500)
  })

  it('str = Σ(atk+mag)/4 over contributors → 伤害匹配 applyMagicDamage(str)', () => {
    // role0 atk40 mag60 + role1 atk20 mag40 = 160 → str = 40
    const roles = [makeRole(0, { attackStrength: 40, magicStrength: 60 }), makeRole(1, { attackStrength: 20, magicStrength: 40 })]
    const { state, playerRoles } = makeCoopState(roles)
    // 参照伤害:str=40 直接打 applyMagicDamage(独立 clone state)
    const ref = makeCoopState([makeRole(0), makeRole(1)])
    const refDmg = applyMagicDamage({ state: ref.state, target: 0, magStr: 40, magicData: { baseDamage: 80, elemental: 1 }, rngFactor: 1.0, minDamage: 1 })[0]!.damage
    const before = state.enemies[0]!.e.health
    performCoopMagic({ state, casterIdx: 0, coopObjId: 351, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus: createCommandBus() })
    expect(refDmg).toBeGreaterThan(0)
    expect(state.enemies[0]!.e.health).toBe(before - refDmg) // str=40 命中
  })

  it('仅 healthy 参与:sleeping 队员不付 HP、不计入 str(需 2 healthy)', () => {
    // role0+role1 healthy contributor;role2 sleep → 排除。str = (40+60 + 20+40)/4 = 40。
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1, { attackStrength: 20, magicStrength: 40 }),
      makeRole(2, { attackStrength: 999, magicStrength: 999 }),
    ]
    const { state, playerRoles } = makeCoopState(roles, [{}, {}, { sleep: 3 }])
    const ref = makeCoopState([makeRole(0), makeRole(1)])
    const refDmg = applyMagicDamage({ state: ref.state, target: 0, magStr: 40, magicData: { baseDamage: 80, elemental: 1 }, rngFactor: 1.0, minDamage: 1 })[0]!.damage
    const before = state.enemies[0]!.e.health
    performCoopMagic({ state, casterIdx: 0, coopObjId: 351, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus: createCommandBus() })
    expect(roles[2]!.hp).toBe(500) // sleeping 队员未付 HP
    expect(state.enemies[0]!.e.health).toBe(before - refDmg) // str=40(role2 999 未计入)
  })

  it('healthy 人数 <= 1 → no-op(选单 validity 已门控,执行端防御)', () => {
    const roles = [makeRole(0, { attackStrength: 40, magicStrength: 60 }), makeRole(1, { hp: 0 })]
    const { state, playerRoles } = makeCoopState(roles)
    const before = state.enemies[0]!.e.health
    performCoopMagic({ state, casterIdx: 0, coopObjId: 351, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus: createCommandBus() })
    expect(state.enemies[0]!.e.health).toBe(before) // 不结算
    expect(roles[0]!.hp).toBe(500) // 不付 HP
  })
})
