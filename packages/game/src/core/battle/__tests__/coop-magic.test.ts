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
// 虚构测试 object 9001 → magicNumber 50;避免占用真实 object 351(武神 summon)。
const TEST_COOP_OBJ_ID = 9001
const OBJ_MAGICS: ObjectMagicView[] = [{ id: TEST_COOP_OBJ_ID, magicNumber: 50, scriptOnSuccess: 0, scriptOnUse: 0, flags: { applyToAll: true } } as unknown as ObjectMagicView]

function makeCoopState(
  roles: PlayerRole[],
  statuses: Array<Partial<{ sleep: number }>> = [],
  partyRoleIds: number[] = roles.map(r => r.id),
): {
  state: BattleState
  playerRoles: PlayerRoles
} {
  const playerRoles: PlayerRoles = { roles }
  const rng = { ...createSeedableRng(1), next: () => 0 } // rngFactor=1.0
  const state = {
    players: partyRoleIds.map((roleId, i) => {
      const role = roles[roleId] ?? roles.find(r => r.id === roleId)!
      return {
        roleId,
        prevHp: role.hp,
        prevMp: role.mp,
        defending: false,
        status: { sleep: statuses[i]?.sleep ?? 0, paralyzed: 0, confused: 0, haste: 0, slow: 0, silence: 0, puppet: 0 },
      }
    }),
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
    performCoopMagic({ state, casterIdx: 0, coopObjId: TEST_COOP_OBJ_ID, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus: createCommandBus() })
    expect(roles[0]!.hp).toBe(470) // 500 - 30
    expect(roles[1]!.hp).toBe(470)
    expect(roles[0]!.mp).toBe(30)  // MP 不动
  })

  // M6 合击音:sdlpal kBattleActionCoopMagic(fight.c:3856-3875)—— 非 summon 合击 AUDIO_PlaySound(29 fixed);
  //   summon 经 PAL_BattleShowPlayerPreMagicAnim → CLASSIC 播 rgwMagicSound[caster](fight.c:2377);
  //   无动画资源时效果音即时回落;有动画链时 frame.sound 帧同步(见武神回归)。
  it('M6 合击音:非 summon → 29 + 效果音;summon 无动画资源 → 施法者 magicSound + 效果音', () => {
    const drainSounds = (bus: ReturnType<typeof createCommandBus>): number[] =>
      bus.drain().filter(c => c.cmd.op === 'playSound').map(c => (c.cmd as { soundId: number }).soundId)
    const roles = [makeRole(0, { attackStrength: 40, magicStrength: 60, magicSound: 9 }), makeRole(1, { attackStrength: 20, magicStrength: 40 })]
    // 非 summon(attackAll)→ 29 + 效果音 77
    {
      const { state, playerRoles } = makeCoopState(roles.map(r => ({ ...r })))
      const bus = createCommandBus()
      performCoopMagic({ state, casterIdx: 0, coopObjId: TEST_COOP_OBJ_ID, targetIdx: 'all', playerRoles, magics: [{ ...COOP_MAGIC, sound: 77 }], objectMagics: OBJ_MAGICS, bus })
      expect(drainSounds(bus)).toEqual([29, 77])
    }
    // summon 类合击缺 summonSpriteFrameCounts → 回落即时音:施法者(role 0)magicSound=9 + magic.sound=77
    {
      const { state, playerRoles } = makeCoopState(roles.map(r => ({ ...r })))
      const bus = createCommandBus()
      performCoopMagic({ state, casterIdx: 0, coopObjId: TEST_COOP_OBJ_ID, targetIdx: 'all', playerRoles, magics: [{ ...COOP_MAGIC, type: 'summon' as Magic['type'], sound: 77 }], objectMagics: OBJ_MAGICS, bus })
      expect(drainSounds(bus)).toEqual([9, 77])
    }
  })

  it('HP 代价 <=0 钳 1(healthy 但低血 contributor 不死)', () => {
    // role0 maxHP100 hp25(healthy:25>=maxHP/5=20)→ 25-30 钳 1。需 2 healthy contributor。
    const roles = [makeRole(0, { maxHP: 100, hp: 25, attackStrength: 40, magicStrength: 60 }), makeRole(1, { hp: 500, attackStrength: 20, magicStrength: 40 })]
    const { state, playerRoles } = makeCoopState(roles)
    performCoopMagic({ state, casterIdx: 0, coopObjId: TEST_COOP_OBJ_ID, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus: createCommandBus() })
    expect(roles[0]!.hp).toBe(1) // 25-30 → 钳 1
    expect(roles[1]!.hp).toBe(470)
  })

  it('濒死队员(hp<min(100,maxHP/5))非 healthy → 不参与(sdlpal PAL_IsPlayerHealthy)', () => {
    // role0 maxHP500 hp20(濒死:20<100)→ 排除;只剩 role1 healthy。direct helper 未传 actor → 不做退化普攻。
    const roles = [makeRole(0, { hp: 20 }), makeRole(1, { hp: 500 })]
    const { state, playerRoles } = makeCoopState(roles)
    const before = state.enemies[0]!.e.health
    performCoopMagic({ state, casterIdx: 0, coopObjId: TEST_COOP_OBJ_ID, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus: createCommandBus() })
    expect(state.enemies[0]!.e.health).toBe(before) // 濒死排除 → healthy<=1,无 actor 时 no-op 兼容 direct caller
    expect(roles[1]!.hp).toBe(500)
  })

  it('高 maxHP 队员按 min(100,maxHP/5) 判濒死:hp>=100 仍可参与协力', () => {
    const roles = [
      makeRole(0, { maxHP: 9999, hp: 150, attackStrength: 40, magicStrength: 60 }),
      makeRole(1, { maxHP: 9999, hp: 150, attackStrength: 20, magicStrength: 40 }),
    ]
    const { state, playerRoles } = makeCoopState(roles)
    performCoopMagic({ state, casterIdx: 0, coopObjId: TEST_COOP_OBJ_ID, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus: createCommandBus() })
    expect(roles[0]!.hp).toBe(120)
    expect(roles[1]!.hp).toBe(120)
  })

  it('str = Σ(atk+mag)/4 over contributors → 伤害匹配 applyMagicDamage(str)', () => {
    // role0 atk40 mag60 + role1 atk20 mag40 = 160 → str = 40
    const roles = [makeRole(0, { attackStrength: 40, magicStrength: 60 }), makeRole(1, { attackStrength: 20, magicStrength: 40 })]
    const { state, playerRoles } = makeCoopState(roles)
    // 参照伤害:str=40 直接打 applyMagicDamage(独立 clone state)
    const ref = makeCoopState([makeRole(0), makeRole(1)])
    const refDmg = applyMagicDamage({ state: ref.state, target: 0, magStr: 40, magicData: { baseDamage: 80, elemental: 1 }, minDamage: 1 })[0]!.damage
    const before = state.enemies[0]!.e.health
    performCoopMagic({ state, casterIdx: 0, coopObjId: TEST_COOP_OBJ_ID, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus: createCommandBus() })
    expect(refDmg).toBeGreaterThan(0)
    expect(state.enemies[0]!.e.health).toBe(before - refDmg) // str=40 命中
  })

  // 协法术合击敌人同玩家法术:wHealth WORD 下溢不钳(fight.c:638),超杀显示完整伤害,非剩余血。
  it('超杀:协法术击杀敌显示完整伤害而非剩余血(player→enemy,fight.c:638)', () => {
    const roles = [makeRole(0, { attackStrength: 40, magicStrength: 60 }), makeRole(1, { attackStrength: 20, magicStrength: 40 })]
    const { state, playerRoles } = makeCoopState(roles)
    const ref = makeCoopState([makeRole(0), makeRole(1)])
    const refDmg = applyMagicDamage({ state: ref.state, target: 0, magStr: 40, magicData: { baseDamage: 80, elemental: 1 }, minDamage: 1 })[0]!.damage
    state.enemies[0]!.e.health = 5 // < refDmg → 超杀
    const bus = createCommandBus()
    performCoopMagic({ state, casterIdx: 0, coopObjId: TEST_COOP_OBJ_ID, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus })
    expect(state.enemies[0]!.e.health).toBe(0)
    const dmgCmd = bus.drain().find(c => c.cmd.op === 'showDamageNum')!.cmd as { value: number }
    expect(dmgCmd.value).toBe(refDmg) // 完整伤害,非剩余血 5
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
    const refDmg = applyMagicDamage({ state: ref.state, target: 0, magStr: 40, magicData: { baseDamage: 80, elemental: 1 }, minDamage: 1 })[0]!.damage
    const before = state.enemies[0]!.e.health
    performCoopMagic({ state, casterIdx: 0, coopObjId: TEST_COOP_OBJ_ID, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus: createCommandBus() })
    expect(roles[2]!.hp).toBe(500) // sleeping 队员未付 HP
    expect(state.enemies[0]!.e.health).toBe(before - refDmg) // str=40(role2 999 未计入)
  })

  it('healthy 人数 <= 1 → 退化普通攻击(fight.c:3374-3378),不是静默 no-op', () => {
    const roles = [makeRole(0, { attackStrength: 40, magicStrength: 60 }), makeRole(1, { hp: 0 })]
    const { state, playerRoles } = makeCoopState(roles)
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    const before = state.enemies[0]!.e.health
    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 0,
      playerRoles,
      magics: [COOP_MAGIC],
      objectMagics: OBJ_MAGICS,
      bus: createCommandBus(),
      actor: { isEnemy: false, idx: 0, dex: 0, fIsSecond: false },
    })
    expect(state.enemies[0]!.e.health).toBeLessThan(before)
    expect(state.battleAnim).toBeDefined()
    expect(roles[0]!.hp).toBe(500) // 普攻退化不付协力 HP 代价
  })

  it('M9:有动画时效果音随 OffMagic 帧同步(派发只起手 29,效果音挂帧不即播)', () => {
    const roles = [makeRole(0, { attackStrength: 40, magicStrength: 60 }), makeRole(1, { attackStrength: 20, magicStrength: 40 })]
    const { state, playerRoles } = makeCoopState(roles)
    state.players.forEach((p, i) => { (p as unknown as { posOriginal: { x: number, y: number } }).posOriginal = { x: 240 - i * 20, y: 170 } })
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    const bus = createCommandBus()
    performCoopMagic({ state, casterIdx: 0, coopObjId: TEST_COOP_OBJ_ID, targetIdx: 'all', playerRoles, magics: [{ ...COOP_MAGIC, sound: 77 }], objectMagics: OBJ_MAGICS, bus, magicSpriteFrameCounts: new Map([[0, 8]]) })
    const sounds = bus.drain().filter(c => c.cmd.op === 'playSound').map(c => (c.cmd as { soundId: number }).soundId)
    expect(sounds).toEqual([29]) // 派发即时只起手音 29,效果音 77 不即播
    expect(state.battleAnim!.frames.some(f => f.sound === 77)).toBe(true) // 77 挂 OffMagic 起手帧,随动画同步
  })

  it('有 magicSpriteFrameCounts + 底锚 → 建合击动画链(聚拢/施法/法术效果/滑回),伤害数字延迟到特效后', () => {
    const roles = [makeRole(0, { attackStrength: 40, magicStrength: 60 }), makeRole(1, { attackStrength: 20, magicStrength: 40 })]
    const { state, playerRoles } = makeCoopState(roles)
    // 补 posOriginal(动画前置:发起者 + 贡献者底锚)
    state.players.forEach((p, i) => { (p as unknown as { posOriginal: { x: number, y: number } }).posOriginal = { x: 240 - i * 20, y: 170 } })
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performCoopMagic({ state, casterIdx: 0, coopObjId: TEST_COOP_OBJ_ID, targetIdx: 'all', playerRoles, magics: [COOP_MAGIC], objectMagics: OBJ_MAGICS, bus: createCommandBus(), magicSpriteFrameCounts: new Map([[0, 8]]) })
    // 建链:Phase1 聚拢 6 帧 + Phase2/3/4 + OffMagic(14 帧)+ PostMagic + 滑回 6 帧 → 远超 6。
    expect(state.battleAnim).toBeDefined()
    expect(state.battleAnim!.frames.length).toBeGreaterThan(6)
    // 第 6 帧发起者已插值移向 COOP_POS[0]=(208,157)(队形聚拢,验"站成一列"动起来)。
    const f6Caster = state.battleAnim!.frames[5]!.fighters!.find(d => d.side === 'player' && d.idx === 0)!
    expect(f6Caster.pos).toEqual({ x: 208, y: 157 })
    // 伤害数字挂 PostMagic 第一帧 —— sdlpal PAL_BattleDisplayStatChange 在 OffMagic 后、滑回前。
    expect(state.battleAnim!.pendingDamageNums ?? []).toHaveLength(0)
    const numIdx = state.battleAnim!.frames.findIndex(f => (f.damageNums?.length ?? 0) > 0)
    const firstPostIdx = state.battleAnim!.frames.findIndex(f => f.fighters?.some(d => d.side === 'enemy' && d.idx === 0))
    expect(numIdx).toBe(firstPostIdx)
  })

  it('巫后协力 355(天女散花)→ attackField effect18 建法术 overlay 动画', () => {
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1),
      makeRole(2),
      makeRole(3),
      makeRole(4, { _name: '巫后', attackStrength: 168, magicStrength: 220, cooperativeMagic: 355 }),
    ]
    const { state, playerRoles } = makeCoopState(roles, [], [0, 4])
    state.players.forEach((p, i) => {
      p.posOriginal = { x: 240 - i * 20, y: 170 }
    })
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    const tianNvSanHua: Magic = {
      id: 27,
      effect: 18,
      type: 'attackField',
      xOffset: 0,
      yOffset: 0,
      special: 99,
      speed: 0,
      keepEffect: 0,
      fireDelay: 0,
      effectTimes: 3,
      shake: 0,
      wave: 0,
      unknown: 0,
      costMP: 22,
      baseDamage: 109,
      elemental: 0,
      sound: 274,
    } as Magic
    const objectMagics: ObjectMagicView[] = [
      { id: 355, magicNumber: 27, scriptOnSuccess: 0, scriptOnUse: 0, flags: { applyToAll: true, usableToEnemy: true, usableInBattle: true, usableOutsideBattle: false } },
    ] as unknown as ObjectMagicView[]
    performCoopMagic({
      state,
      casterIdx: 1,
      coopObjId: 355,
      targetIdx: 'all',
      playerRoles,
      magics: [tianNvSanHua],
      objectMagics,
      bus: createCommandBus(),
      magicSpriteFrameCounts: new Map([[18, 12]]),
    })

    expect(state.battleAnim).toBeDefined()
    expect(state.battleAnim!.frames.some(f => f.overlays?.some(o => o.kind === 'magic' && o.spriteChunk === 18))).toBe(true)
    const offFrame = state.battleAnim!.frames.find(f => f.overlays?.some(o => o.spriteChunk === 18))!
    expect(offFrame.overlays).toEqual([{ kind: 'magic', spriteChunk: 18, frameIdx: 0, x: 160, y: 200 }])
    expect(state.battleAnim!.pendingDamageNums ?? []).toHaveLength(0)
    expect(state.battleAnim!.frames.some(f => (f.damageNums?.length ?? 0) > 0)).toBe(true)
  })

  it('装备覆盖协力 351(武神 summon)→ 建召唤神 player-10 + 二次 FIRE13 动画,声音挂帧而非只即时播放', () => {
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1),
      makeRole(2),
      makeRole(3),
      makeRole(4, { _name: '巫后', attackStrength: 168, magicStrength: 220, magicSound: 12, cooperativeMagic: 351 }),
    ]
    const { state, playerRoles } = makeCoopState(roles, [], [0, 4])
    state.players.forEach((p, i) => {
      p.posOriginal = { x: 240 - i * 20, y: 170 }
    })
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    const wuShen: Magic = {
      id: 19,
      effect: 18,
      type: 'summon',
      xOffset: 65528, // SHORT -8
      yOffset: 22,
      special: 0, // F.MKF chunk 10
      speed: 2,
      keepEffect: 1,
      fireDelay: 1,
      effectTimes: 65534, // SHORT -2 背景染色
      shake: 0,
      wave: 0,
      unknown: 0,
      costMP: 88,
      baseDamage: 666,
      elemental: 0,
      sound: 303,
    } as Magic
    const wuShenSecondary: Magic = {
      id: 18,
      effect: 13,
      type: 'attackWhole',
      xOffset: 0,
      yOffset: 46,
      special: 10,
      speed: 0,
      keepEffect: 0,
      fireDelay: 0,
      effectTimes: 0,
      shake: 0,
      wave: 0,
      unknown: 0,
      costMP: 0,
      baseDamage: 0,
      elemental: 0,
      sound: 0,
    } as Magic
    const objectMagics: ObjectMagicView[] = [
      { id: 351, magicNumber: 19, scriptOnSuccess: 0, scriptOnUse: 0, flags: { applyToAll: true, usableToEnemy: true, usableInBattle: true, usableOutsideBattle: false } },
    ] as unknown as ObjectMagicView[]
    const bus = createCommandBus()
    performCoopMagic({
      state,
      casterIdx: 1,
      coopObjId: 351,
      targetIdx: 'all',
      playerRoles,
      magics: [wuShen, wuShenSecondary],
      objectMagics,
      bus,
      magicSpriteFrameCounts: new Map([[13, 8]]),
      summonSpriteFrameCounts: new Map([[10, 4]]),
    })

    expect(bus.drain().filter(c => c.cmd.op === 'playSound')).toEqual([])
    expect(state.battleAnim).toBeDefined()
    expect(state.battleAnim!.hasSummonFade).toBe(true)
    expect(state.battleAnim!.frames.some(f => f.summon?.spriteKey === 'player-10')).toBe(true)
    const godFrame = state.battleAnim!.frames.find(f => f.summon?.spriteKey === 'player-10')!
    expect(godFrame.summon).toMatchObject({ pos: { x: 232, y: 187 }, bgColorShift: -2 })
    expect(state.battleAnim!.frames.some(f => f.overlays?.some(o => o.kind === 'magic' && o.spriteChunk === 13))).toBe(true)
    expect(state.battleAnim!.frames.find(f => f.sound === 12)).toBeDefined()
    expect(state.battleAnim!.frames.find(f => f.sound === 303)).toBeDefined()
    expect(roles[0]!.hp).toBe(412)
    expect(roles[4]!.hp).toBe(412)
    expect(state.enemies[0]!.e.health).toBeLessThan(9000)
    expect(state.battleAnim!.pendingDamageNums ?? []).toHaveLength(0)
    const numIdx = state.battleAnim!.frames.findIndex(f => (f.damageNums?.length ?? 0) > 0)
    const firstFadeOutIdx = state.battleAnim!.frames.findIndex(f => f.summon?.fadeDir === 'out')
    expect(numIdx).toBeGreaterThan(0)
    expect(firstFadeOutIdx).toBeGreaterThan(numIdx)
    expect(state.battleAnim!.frames[numIdx]!.summon?.spriteKey).toBe('player-10')
    expect(state.battleAnim!.frames[numIdx]!.fighters?.some(d => d.side === 'enemy' && d.idx === 0)).toBe(true)
  })
})
