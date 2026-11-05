/** Real tick wiring for selected actions, queue ordering, and experience. */
import type { Magic, PlayerRole, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeEnemyRecord, makeRoleRecord } from '../../__tests__/battle-records.js'
import { recordingRng } from '../../__tests__/scripted-rng.js'
import type { GameState } from '../game-state.js'
import { battleInput, startTestBattle } from './battle-start.test-fixtures.js'
import { tickBattle } from './battle-system.js'

function makeRole(options: Partial<PlayerRole> = {}): PlayerRole {
  return makeRoleRecord(options.id ?? 0, {
    maxHP: 200,
    hp: 200,
    maxMP: 30,
    mp: 30,
    attackStrength: 100,
    magicStrength: 0,
    defense: 50,
    dexterity: 50,
    fleeRate: 50,
    ...options,
  })
}
function mkSpell(id: number, flags: Partial<Spell['flags']> = {}): Spell {
  return {
    id,
    _name: `spell${id}`,
    magicNumber: id,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
      ...flags,
    },
  }
}

function mkMagic(id: number, opts: Partial<Magic> = {}): Magic {
  return {
    id,
    effect: 0,
    type: 'normal',
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 0,
    keepEffect: 0,
    fireDelay: 0,
    effectTimes: 0,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP: 5,
    baseDamage: 30,
    elemental: 0,
    sound: 0,
    ...opts,
  }
}

function boot(options: Parameters<typeof startTestBattle>[0] = {}) {
  const { gs, bus, playerRoles } = startTestBattle({
    roles: [makeRole()],
    enemies: [makeEnemyRecord({ health: 9000, attackStrength: 10, magicStrength: 0, fleeRate: 0 })],
    ...options,
  })
  return { gs, bus, playerRoles, emptyInput: battleInput() }
}

/** An explicitly isolated selected queue entry; production tick still owns validation and execution. */
function queueSingleActor(gs: GameState, item: { isEnemy: boolean; idx: number }): void {
  const state = gs.battleState!
  state.phase = 'performAction'
  state.actionQueue = [{ ...item, dex: 100, fIsSecond: false }]
  state.currentActionIndex = 0
}
describe('selected action validation and queue wiring', () => {
  it('haste changes the selected player queue order at the real construction boundary', () => {
    const { gs, bus, emptyInput } = boot({
      partyMembers: [0, 1],
      roles: [makeRole({ id: 0, dexterity: 50 }), makeRole({ id: 1, dexterity: 50 })],
      enemies: [makeEnemyRecord({ id: 100, level: 0, dexterity: 0 })], // 敌 dex=(0+6)*3=18
    })
    const st = gs.battleState!
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction(turnStart 无脚本)
    st.players[0]!.status.haste = 3 // 仙风云体术式加成(PAL_CLASSIC ×3)
    st.pendingActions.set(0, { type: 'attack', target: 0, targetSide: 'enemy' })
    st.pendingActions.set(1, { type: 'attack', target: 0, targetSide: 'enemy' })
    tickBattle(gs, emptyInput, bus) // 全员已填 → buildActionQueue → performAction
    expect(st.phase).toBe('performAction')
    // p0: 50×3=150 jitter[135,165] > p1: 50 jitter[45,55] > 敌: 18 jitter[16,19](间隔充分,掷骰不换序)
    expect(st.actionQueue.map((q) => (q.isEnemy ? `e${q.idx}` : `p${q.idx}`))).toEqual([
      'p0',
      'p1',
      'e0',
    ])
  })

  it.each([
    true,
    false,
  ])('an unlearned spell with enemy targeting=%s falls back without charging MP', (toEnemy) => {
    const { gs, bus, playerRoles, emptyInput } = boot({
      spells: [mkSpell(296, { usableToEnemy: toEnemy }), mkSpell(297)],
      magics: [mkMagic(296), mkMagic(297)],
    })
    gs.PlayerRolesRuntime.rgwMagic[0]![0] = 297
    queueSingleActor(gs, { isEnemy: false, idx: 0 })
    const state = gs.battleState!
    state.pendingActions.set(0, {
      type: 'magic',
      actionId: 296,
      target: 0,
      targetSide: toEnemy ? 'enemy' : 'player',
    })
    const before = state.enemies[0]!.e.health
    for (let i = 0; i < 200 && state.currentActionIndex === 0; i++) tickBattle(gs, emptyInput, bus)
    expect(state.currentActionIndex).toBe(1)
    expect(playerRoles.roles[0]!.mp).toBe(30)
    if (toEnemy) expect(state.enemies[0]!.e.health).toBeLessThan(before)
    else {
      expect(state.players[0]!.defending).toBe(true)
      expect(state.enemies[0]!.e.health).toBe(before)
    }
  })
})

describe('executed action experience ownership', () => {
  it('defending grants exactly two defense experience points', () => {
    const { gs, bus, emptyInput } = boot()
    const st = gs.battleState!
    queueSingleActor(gs, { isEnemy: false, idx: 0 })
    st.pendingActions.set(0, { type: 'defend', target: -1 })
    expect(gs.Exp.rgDefenseExp[0]?.wCount ?? 0).toBe(0) // startBattle 已清池
    for (let i = 0; i < 50 && st.currentActionIndex === 0; i++) tickBattle(gs, emptyInput, bus)
    expect(gs.Exp.rgDefenseExp[0]!.wCount).toBe(2)
  })

  it('a learned spell consumes MP and grants one magic-power point plus the drawn magic experience', () => {
    const { gs, bus, playerRoles, emptyInput } = boot({
      roles: [makeRole({ id: 0, mp: 30 })],
      spells: [mkSpell(296)],
      magics: [mkMagic(296, { costMP: 5 })],
    })
    const st = gs.battleState!
    gs.PlayerRolesRuntime.rgwMagic[0]![0] = 296
    const rng = recordingRng([3], [0])
    st.rng = rng
    queueSingleActor(gs, { isEnemy: false, idx: 0 })
    st.pendingActions.set(0, { type: 'magic', actionId: 296, target: 0, targetSide: 'enemy' })
    for (let i = 0; i < 50 && st.currentActionIndex === 0; i++) tickBattle(gs, emptyInput, bus)
    expect(playerRoles.roles[0]!.mp).toBe(25) // 施法真执行(非降级)
    expect(gs.Exp.rgMagicExp[0]!.wCount).toBe(3)
    expect(rng.calls.filter((call) => call === 'rangeInclusive(2,3)')).toEqual([
      'rangeInclusive(2,3)',
    ])
    expect(gs.Exp.rgMagicPowerExp[0]!.wCount).toBe(1)
  })
})
