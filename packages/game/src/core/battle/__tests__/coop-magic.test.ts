import { describe, expect, it } from 'vitest'
import { recordingRng } from '../../../__tests__/scripted-rng.js'
import { createCommandBus } from '../../command-bus.js'
import { performCoopMagic } from '../actions/coop-magic.js'
import {
  COOP_MAGIC,
  makeCoopState,
  makeRole,
  OBJ_MAGICS,
  TEST_COOP_OBJ_ID,
} from './coop-magic.test-fixtures.js'

describe('cooperative magic damage and contributors', () => {
  it('HP 代价(非 MP):每个 healthy contributor hp -= magic.costMP(30),MP 不动', () => {
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1, { attackStrength: 20, magicStrength: 40 }),
    ]
    const { state, playerRoles, gs } = makeCoopState(roles)
    performCoopMagic({
      state,
      gs,
      actor: { isEnemy: false, idx: 0, dex: 30, fIsSecond: false },
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 'all',
      playerRoles,
      magics: [COOP_MAGIC],
      objectMagics: OBJ_MAGICS,
      bus: createCommandBus(),
    })
    expect(roles[0]!.hp).toBe(470) // 500 - 30
    expect(roles[1]!.hp).toBe(470)
    expect(roles.map((role) => role.mp)).toEqual([30, 30])
    for (const roleId of [0, 1]) {
      expect(gs.Exp.rgAttackExp[roleId]!.wCount).toBe(0)
      expect(gs.Exp.rgHealthExp[roleId]!.wCount).toBe(0)
    }
  })

  it('HP 代价 <=0 钳 1(healthy 但低血 contributor 不死)', () => {
    // role0 maxHP100 hp25(healthy:25>=maxHP/5=20)→ 25-30 钳 1。需 2 healthy contributor。
    const roles = [
      makeRole(0, { maxHP: 100, hp: 25, attackStrength: 40, magicStrength: 60 }),
      makeRole(1, { hp: 500, attackStrength: 20, magicStrength: 40 }),
    ]
    const { state, playerRoles } = makeCoopState(roles)
    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 'all',
      playerRoles,
      magics: [COOP_MAGIC],
      objectMagics: OBJ_MAGICS,
      bus: createCommandBus(),
    })
    expect(roles[0]!.hp).toBe(1) // 25-30 → 钳 1
    expect(roles[1]!.hp).toBe(470)
  })

  it('excludes a dying member from both the HP cost and strength sum', () => {
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1, { hp: 20, attackStrength: 999, magicStrength: 999 }),
      makeRole(2, { attackStrength: 20, magicStrength: 40 }),
    ]
    const { state, playerRoles, bus } = makeCoopState(roles)
    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 'all',
      playerRoles,
      magics: [COOP_MAGIC],
      objectMagics: OBJ_MAGICS,
      bus,
    })
    expect(roles.map((role) => role.hp)).toEqual([470, 20, 470])
    expect(state.enemies[0]!.e.health).toBe(9000 - 166)
  })

  it('高 maxHP 队员按 min(100,maxHP/5) 判濒死:hp>=100 仍可参与协力', () => {
    const roles = [
      makeRole(0, { maxHP: 9999, hp: 150, attackStrength: 40, magicStrength: 60 }),
      makeRole(1, { maxHP: 9999, hp: 150, attackStrength: 20, magicStrength: 40 }),
    ]
    const { state, playerRoles } = makeCoopState(roles)
    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 'all',
      playerRoles,
      magics: [COOP_MAGIC],
      objectMagics: OBJ_MAGICS,
      bus: createCommandBus(),
    })
    expect(roles[0]!.hp).toBe(120)
    expect(roles[1]!.hp).toBe(120)
  })

  it('uses only healthy attack/magic strength: (40+60+20+40)/4 yields 166 damage', () => {
    // role0 atk40 mag60 + role1 atk20 mag40 = 160 → str = 40
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1, { attackStrength: 20, magicStrength: 40 }),
    ]
    const { state, playerRoles } = makeCoopState(roles)
    const before = state.enemies[0]!.e.health
    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 'all',
      playerRoles,
      magics: [COOP_MAGIC],
      objectMagics: OBJ_MAGICS,
      bus: createCommandBus(),
    })
    expect(state.enemies[0]!.e.health).toBe(before - 166) // str=40 命中
  })

  it('超杀:协法术击杀敌显示完整伤害而非剩余血(player→enemy,fight.c:638)', () => {
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1, { attackStrength: 20, magicStrength: 40 }),
    ]
    const { state, playerRoles } = makeCoopState(roles)
    state.enemies[0]!.e.health = 5 // Less than the fixed 166 damage vector.
    const bus = createCommandBus()
    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 'all',
      playerRoles,
      magics: [COOP_MAGIC],
      objectMagics: OBJ_MAGICS,
      bus,
    })
    expect(state.enemies[0]!.e.health).toBe(0)
    const damageCommands = bus
      .drain()
      .map((entry) => entry.cmd)
      .filter((command) => command.op === 'showDamageNum')
    expect(damageCommands).toEqual([
      { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 166, color: 'blue' },
    ]) // 完整伤害,非剩余血 5
  })

  it('仅 healthy 参与:sleeping 队员不付 HP、不计入 str(需 2 healthy)', () => {
    // role0+role1 healthy contributor;role2 sleep → 排除。str = (40+60 + 20+40)/4 = 40。
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1, { attackStrength: 20, magicStrength: 40 }),
      makeRole(2, { attackStrength: 999, magicStrength: 999 }),
    ]
    const { state, playerRoles } = makeCoopState(roles, [{}, {}, { sleep: 3 }])
    const before = state.enemies[0]!.e.health
    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 'all',
      playerRoles,
      magics: [COOP_MAGIC],
      objectMagics: OBJ_MAGICS,
      bus: createCommandBus(),
    })
    expect(roles[2]!.hp).toBe(500) // sleeping 队员未付 HP
    expect(state.enemies[0]!.e.health).toBe(before - 166) // str=40(role2 999 未计入)
  })
  it.each([
    2, 3,
  ])('falls back to an animated attack; grants attack EXP and health EXP %i after damage draws', (healthExp) => {
    const roles = [makeRole(0, { attackStrength: 40, magicStrength: 60 }), makeRole(1, { hp: 0 })]
    const { state, playerRoles, gs, bus } = makeCoopState(roles)
    const rng = recordingRng([1, 1, 1, healthExp], [1])
    state.rng = rng
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performCoopMagic({
      state,
      gs,
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 0,
      playerRoles,
      magics: [COOP_MAGIC],
      objectMagics: OBJ_MAGICS,
      bus,
      actor: { isEnemy: false, idx: 0, dex: 30, fIsSecond: false },
    })
    // C physical damage: trunc(40 - 44*0.6 + 0.5) + jitter(1), no critical, factor 1.
    expect(state.enemies[0]!.e.health).toBe(9000 - 15)
    expect(state.battleAnim).toBeDefined()
    expect(roles.map((role) => role.hp)).toEqual([500, 0])
    expect(roles.map((role) => role.mp)).toEqual([30, 30])
    expect(gs.Exp.rgAttackExp[0]!.wCount).toBe(1)
    expect(gs.Exp.rgHealthExp[0]!.wCount).toBe(healthExp)
    expect(rng.calls).toEqual([
      'rangeInclusive(1,2)',
      'rangeInclusive(0,5)',
      'rangeInclusive(0,11)',
      'rangeFloat(1,1.125)',
      'rangeInclusive(2,3)',
    ])
  })
})
