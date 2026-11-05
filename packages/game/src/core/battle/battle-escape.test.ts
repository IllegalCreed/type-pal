/** Escape selection, movement ownership and queue cancellation through real controller calls. */
import { describe, expect, it } from 'vitest'
import { recordingRng } from '../../__tests__/scripted-rng.js'
import { dispatchBattleOpcode } from './battle-opcodes.js'
import {
  advanceUntil,
  press,
  roundEnemy,
  roundRole,
  startRound,
} from './battle-round.test-fixtures.js'

describe('battle escape ownership', () => {
  it('the first successful flee freezes the remaining queue and emits only one escape sound', () => {
    const round = startRound({
      roles: [roundRole({ id: 0, dexterity: 50 }), roundRole({ id: 1, dexterity: 10 })],
      enemies: [roundEnemy({ level: 0, dexterity: 0, attackStrength: 0 })],
    })
    round.state.enemies[0]!.status.sleep = 999
    const rng = recordingRng([0])
    round.state.rng = rng
    press(round, 'Flee')
    expect([...round.state.pendingActions.keys()]).toEqual([0, 1])
    advanceUntil(round, () => round.state.fleeAnim !== undefined)
    expect(round.state.actionQueue[0]).toMatchObject({ isEnemy: false, idx: 0 })
    expect(round.playerRoles.roles[0]!.hp).toBe(200)
    const stoppedAt = round.state.currentActionIndex
    for (let tick = 0; tick < 8; tick++) {
      press(round)
      expect(round.state.currentActionIndex).toBe(stoppedAt)
    }
    advanceUntil(round, () => round.gs.mode === 'explore')
    // One level-0 enemy with fleeRate 0 gives resistance (0 + 6) * 4 = 24.
    expect(rng.calls.filter((call) => call === 'rangeInclusive(0,24)')).toHaveLength(1)
    expect(round.gs.pendingSounds).toEqual([45])
  })

  it('stepwise player escape moves the living slot while leaving a battle casualty in place', () => {
    const round = startRound({
      roles: [roundRole({ id: 0 }), roundRole({ id: 1 })],
      enemies: [roundEnemy({ level: 0, dexterity: 0, attackStrength: 0 })],
    })
    round.state.enemies[0]!.status.sleep = 999
    dispatchBattleOpcode(0x1b, [0, 0xff38, 0], {
      // -200 HP after startBattle, not a dead pre-entry role
      state: round.state,
      playerRoles: round.playerRoles,
      gs: round.gs,
      target: { type: 'player', idx: 1 },
    })
    expect(round.playerRoles.roles[1]!.hp).toBe(0)
    round.state.rng = recordingRng([0])
    press(round, 'Flee')
    advanceUntil(round, () => round.state.fleeAnim?.step === 1)
    expect(round.state.players[0]!.pos).toEqual({ x: 205, y: 180 })
    expect(round.state.players[1]!.pos).toEqual({ x: 256, y: 152 })
  })

  it('the enemy escape opcode moves only the occupied enemy slot', () => {
    const round = startRound({
      enemies: [roundEnemy({ id: 100, health: 50 })],
      teamSlots: [0, 100, 0xffff, 0xffff, 0xffff],
    })
    const empty = round.state.enemies[0]!
    expect(empty.defeated).toBe(true)
    empty.pos = { x: 100, y: 80 } // remembered position of an empty slot must not be changed
    round.state.enemies[1]!.pos = { x: 200, y: 80 }
    dispatchBattleOpcode(0x69, [0, 0, 0], { state: round.state, gs: round.gs })
    expect(round.state.enemyEscapeAnim?.step).toBe(0)
    press(round)
    expect(round.state.enemies[1]!.pos).toEqual({ x: 180, y: 80 })
    expect(empty.pos).toEqual({ x: 100, y: 80 })
  })
})
