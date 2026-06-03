/**
 * attack-mate.test.ts —— B1 / D8。
 *
 * kBattleActionAttackMate(混乱队员攻击随机活友军)逐行对照
 * `reference/sdlpal/fight.c:3760-3853`(PAL_CLASSIC perform 分支)+ 3448-3479(prep)。
 *
 * 真值要点:
 *  - 随机活友军目标:do RandomLong(0, wMaxPartyMemberIndex) while(self || HP==0)
 *  - str = PAL_GetPlayerAttackStrength(caster)(global.c:1757 = base+装备,**无 level 项**;role 已投影含装备)
 *  - def = PAL_GetPlayerDefense(target)(global.c:1800 = base+装备,无 level);target 防御 → def*=2
 *  - sDamage = CalcPhysicalAttackDamage(str, def, 2);target Protect>0 → /=2;<=0 → 1;clamp 到 target HP
 *  - 无其他活友军 → 不攻击(Pass,fight.c:3781 do 不进)
 *  注:fixture attackStrength=96 / defense=64 = 真实 role 攻防(新公式直接用,2026-06-02 P0 一致修去 level 项)。
 */

import type { PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { type CommandBus, createCommandBus } from '../../command-bus.js'
import { createSeedableRng, type SeedableRng } from '../../rng.js'
import { performAttackMate } from '../actions/attack-mate.js'
import type { BattlePlayer, BattleState } from '../battle-state.js'

function makeRole(opts: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id: 0, _name: 'R', avatar: 0, spriteNumInBattle: 0, spriteNum: 0, name: 0, attackAll: 0,
    level: 10, maxHP: 200, maxMP: 30, hp: 200, mp: 30,
    attackStrength: 96, magicStrength: 0, defense: 64, dexterity: 30, fleeRate: 5,
    poisonResistance: 0, elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 0, attackSound: 0, weaponSound: 0, criticalSound: 0, magicSound: 0, deathSound: 0,
    ...opts,
  }
}

function makePlayer(roleId: number, defending = false): BattlePlayer {
  return {
    roleId, prevHp: 0, prevMp: 0, defending,
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
  }
}

/** 3 队员 state + roles;rng 可注入固定 rangeInclusive 序列。 */
function makeState(roles: PlayerRole[], rngSeq?: number[]): { state: BattleState; playerRoles: PlayerRoles; bus: CommandBus } {
  let i = 0
  const rng: SeedableRng = rngSeq
    ? { ...createSeedableRng(1), rangeInclusive: () => rngSeq[i++ % rngSeq.length]! }
    : createSeedableRng(1)
  const state = {
    players: roles.map((_, idx) => makePlayer(idx)),
    enemies: [],
    rng,
  } as unknown as BattleState
  return { state, playerRoles: { roles }, bus: createCommandBus() }
}

describe('B1 AttackMate(混乱攻随机友军,fight.c:3760-3853)', () => {
  it('混乱队员攻击随机活友军 — str96/def64/res2 → 45 伤害,目标 HP 200→155;攻击者不掉血', () => {
    const roles = [makeRole({ id: 0 }), makeRole({ id: 1 }), makeRole({ id: 2 })]
    // rng 注入选中 idx 1
    const { state, playerRoles, bus } = makeState(roles, [1])
    performAttackMate(state, 0, bus, playerRoles)
    expect(playerRoles.roles[1]!.hp).toBe(155) // 200 - 45
    expect(playerRoles.roles[0]!.hp).toBe(200) // 攻击者自己不掉
    expect(playerRoles.roles[2]!.hp).toBe(200)
  })

  // M6 武器声(sdlpal fight.c:3810 AUDIO_PlaySound(rgwWeaponSound[role]),混乱打友军强制物理只播武器声)。
  it('M6 攻击者武器声 → emit playSound(weaponSound);0 不 emit', () => {
    const roles = [makeRole({ id: 0, weaponSound: 2 }), makeRole({ id: 1 })]
    const { state, playerRoles, bus } = makeState(roles, [1])
    performAttackMate(state, 0, bus, playerRoles)
    const sounds = bus.drain().filter(c => c.cmd.op === 'playSound').map(c => (c.cmd as { soundId: number }).soundId)
    expect(sounds).toEqual([2])
    // weaponSound=0 → 不 emit
    const roles0 = [makeRole({ id: 0, weaponSound: 0 }), makeRole({ id: 1 })]
    const s0 = makeState(roles0, [1])
    performAttackMate(s0.state, 0, s0.bus, s0.playerRoles)
    expect(s0.bus.drain().filter(c => c.cmd.op === 'playSound')).toHaveLength(0)
  })

  it('目标有 Protect → 伤害减半(45→22)', () => {
    const roles = [makeRole({ id: 0 }), makeRole({ id: 1 })]
    const { state, playerRoles, bus } = makeState(roles, [1])
    state.players[1]!.status.protect = 3
    performAttackMate(state, 0, bus, playerRoles)
    expect(playerRoles.roles[1]!.hp).toBe(178) // 200 - floor(45/2)=22
  })

  it('目标防御中 → def*2(64→128),伤害降低', () => {
    const roles = [makeRole({ id: 0 }), makeRole({ id: 1 })]
    const { state, playerRoles, bus } = makeState(roles, [1])
    state.players[1]!.defending = true
    // def=128:calcBaseDamage(96,128):96 > 128*0.6=76.8 → trunc(96-76.8+0.5)=19;/2=9
    performAttackMate(state, 0, bus, playerRoles)
    expect(playerRoles.roles[1]!.hp).toBe(191) // 200 - 9
  })

  it('随机跳过自己 + 死友军(rng 先吐 self/dead 再吐有效目标)', () => {
    const roles = [makeRole({ id: 0 }), makeRole({ id: 1, hp: 0 }), makeRole({ id: 2 })]
    // rng 序列:0(self,跳)→ 1(死,跳)→ 2(有效)
    const { state, playerRoles, bus } = makeState(roles, [0, 1, 2])
    performAttackMate(state, 0, bus, playerRoles)
    expect(playerRoles.roles[2]!.hp).toBe(155) // 选中 idx2,200-45
  })

  it('无其他活友军 → 不攻击(Pass),无 HP 变化', () => {
    const roles = [makeRole({ id: 0 }), makeRole({ id: 1, hp: 0 })]
    const { state, playerRoles, bus } = makeState(roles, [1])
    performAttackMate(state, 0, bus, playerRoles)
    expect(playerRoles.roles[1]!.hp).toBe(0) // 死友军不被打活/不变
    expect(playerRoles.roles[0]!.hp).toBe(200)
  })

  it('伤害 clamp 到目标 HP(目标残血不溢出负数)', () => {
    const roles = [makeRole({ id: 0 }), makeRole({ id: 1, hp: 10 })]
    const { state, playerRoles, bus } = makeState(roles, [1])
    performAttackMate(state, 0, bus, playerRoles)
    expect(playerRoles.roles[1]!.hp).toBe(0) // 45 伤害 clamp 到 10 → 0,不负
  })
})
