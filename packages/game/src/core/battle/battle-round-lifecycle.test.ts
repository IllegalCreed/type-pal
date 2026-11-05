/** Real predecessors, poison continuations and round ownership through tickBattle. */
import type { Command, ObjectMagicView, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeBattleSpellRecord } from '../../__tests__/battle-records.js'
import { recordingRng } from '../../__tests__/scripted-rng.js'
import { makeMagic } from './__tests__/magic-action.test-fixtures.js'
import { dispatchBattleOpcode } from './battle-opcodes.js'
import {
  advanceUntil,
  press,
  roundEnemy,
  roundRole,
  selectAttack,
  startRound,
} from './battle-round.test-fixtures.js'

const poisonCommands: Command[] = [
  { op: 'end' },
  { op: 'raw', opcode: 0x1b, operands: [0, 0xfff6, 0] }, // WORD encoding of SHORT -10.
  { op: 'end', advance: true },
  { op: 'end' }, // the saved continuation 3 remains inside the actual catalog
]

describe('round lifecycle', () => {
  it('a killed enemy cannot execute its queued attack while another sleeping enemy keeps the round alive', () => {
    const round = startRound({
      roles: [roundRole({ hp: 9999, maxHP: 9999, attackStrength: 500, dexterity: 50 })],
      enemies: [
        roundEnemy({ id: 100, level: 0, dexterity: 0, health: 1, attackStrength: 999 }),
        roundEnemy({ id: 200, level: 0, dexterity: 0, health: 30000, attackStrength: 999 }),
      ],
      teamSlots: [100, 200, 0xffff, 0xffff, 0xffff],
    })
    round.state.enemies[1]!.status.sleep = 999
    selectAttack(round, 0)
    expect(round.state.actionQueue.some((item) => item.isEnemy && item.idx === 0)).toBe(true)
    advanceUntil(round, () => round.state.phase === 'selectAction' && round.state.turn === 1)
    expect(round.state.enemies[0]!.defeated).toBe(true)
    expect(round.playerRoles.roles[0]!.hp).toBe(9999)
    expect(round.state.enemies[1]!.e.health).toBe(30000)
  })

  it('poison runs its saved continuation, writes the next entry, and holds input for eight ticks', () => {
    const round = startRound({
      roles: [roundRole({ hp: 100 })],
      enemies: [roundEnemy({ health: 30000, level: 0, dexterity: 0, attackStrength: 0 })],
      commands: poisonCommands,
      objectPoisons: [{ id: 551, level: 0, color: 16, playerScript: 1, enemyScript: 0 }],
    })
    round.state.enemies[0]!.status.sleep = 999
    round.gs.rgPoisonStatus['0_0'] = { wPoisonID: 551, wPoisonScript: 1 }
    press(round, 'Defend')
    advanceUntil(round, () => round.state.phase === 'postAction')
    press(round)
    expect(round.playerRoles.roles[0]!.hp).toBe(90)
    expect(round.gs.rgPoisonStatus['0_0']?.wPoisonScript).toBe(3)
    expect(round.state.phase).toBe('selectAction')
    for (let remaining = 8; remaining > 0; remaining--) {
      expect(round.state.roundEndDelayTicks).toBe(remaining)
      press(round, 'Confirm')
      expect(round.state.pendingActions.size).toBe(0)
      expect(round.state.uiState).toBe('wait')
    }
    expect(round.state.roundEndDelayTicks).toBe(0)
    press(round)
    expect(round.state.uiState).toBe('selectMove')
  })

  it('a combat victory leaves the pending poison continuation unconsumed', () => {
    const round = startRound({
      roles: [roundRole({ hp: 100, attackStrength: 500, dexterity: 50 })],
      enemies: [roundEnemy({ health: 1, level: 0, dexterity: 0, attackStrength: 0 })],
      commands: poisonCommands,
      objectPoisons: [{ id: 551, level: 0, color: 16, playerScript: 1, enemyScript: 0 }],
    })
    round.gs.rgPoisonStatus['0_0'] = { wPoisonID: 551, wPoisonScript: 1 }
    selectAttack(round, 0)
    advanceUntil(round, () => round.state.phase === 'won')
    expect(round.playerRoles.roles[0]!.hp).toBe(100)
    expect(round.gs.rgPoisonStatus['0_0']?.wPoisonScript).toBe(1)
  })

  it('a real co-op action consumes the later confused player action in the same round', () => {
    const spell: Spell = {
      ...makeBattleSpellRecord(7),
      magicNumber: 3,
      flags: {
        usableOutsideBattle: false,
        usableInBattle: true,
        usableToEnemy: true,
        applyToAll: false,
      },
    }
    const object: ObjectMagicView = {
      id: 7,
      magicNumber: 3,
      scriptOnUse: 0,
      scriptOnSuccess: 0,
      flags: spell.flags,
    }
    const round = startRound({
      roles: [
        roundRole({ id: 0, hp: 500, maxHP: 500, cooperativeMagic: 7, dexterity: 50 }),
        roundRole({ id: 1, hp: 500, maxHP: 500, dexterity: 20 }),
        roundRole({ id: 2, hp: 500, maxHP: 500, dexterity: 10 }),
      ],
      enemies: [roundEnemy({ health: 30000, level: 0, dexterity: 0 })],
      spells: [spell],
      objectMagics: [object],
      magics: [makeMagic({ id: 3, type: 'normal', costMP: 1, baseDamage: 100, elemental: 0 })],
    })
    round.state.enemies[0]!.status.sleep = 999
    dispatchBattleOpcode(0x2d, [0, 3, 0], {
      state: round.state,
      playerRoles: round.playerRoles,
      gs: round.gs,
      caster: { type: 'player', idx: 2 },
      target: { type: 'player', idx: 2 },
    })
    const rng = recordingRng()
    round.state.rng = rng
    press(round, 'Right', 'Confirm')
    expect(round.state.pendingActions.get(0)?.type).toBe('coop-magic')
    expect(round.state.pendingActions.get(2)?.type).toBe('attack')
    advanceUntil(round, () => round.state.currentActionIndex >= 1)
    expect(round.playerRoles.roles.slice(0, 3).map((role) => role.hp)).toEqual([499, 499, 500])
    const callsAfterCoop = rng.calls.length
    advanceUntil(round, () => round.state.phase === 'postAction')
    expect(round.state.enemies[0]!.e.health).toBe(29889) // one co-op hit of 111, no later confused hit
    expect(round.gs.Exp.rgAttackExp[2]!.wCount).toBe(0)
    expect(round.state.fThisTurnCoop).toBe(true)
    // The sleeping enemy still selects one player before its status gate. Neither later
    // player may consume a confused-target or attack draw after the co-op action.
    expect(rng.calls.slice(callsAfterCoop)).toEqual(['rangeInclusive(0,2)'])
  })

  it('a real auto-attack predecessor turns the later manual defend into an attack', () => {
    const round = startRound({
      roles: [
        roundRole({ id: 0, attackStrength: 200, dexterity: 201 }),
        roundRole({ id: 1, attackStrength: 200, dexterity: 20 }),
      ],
      enemies: [roundEnemy({ health: 30000, dexterity: 0 })],
    })
    round.state.enemies[0]!.status.sleep = 999
    press(round, 'Auto')
    press(round) // production commitAutoAttack commits only the first player
    expect(round.state.pendingActions.get(0)?.autoAttack).toBe(true)
    expect(round.state.selectingPlayerIdx).toBe(1)
    press(round, 'Menu', 'Defend') // real Escape+D chord: cancel auto, then choose defend
    expect(round.state.fAutoAttack).toBe(false)
    expect(round.state.pendingActions.get(1)?.type).toBe('defend')
    advanceUntil(round, () => round.state.currentActionIndex >= 1)
    expect(round.state.enemies[0]!.e.health).toBe(29685)
    advanceUntil(round, () => round.state.phase === 'postAction')
    expect(round.state.enemies[0]!.e.health).toBe(29370)
    expect(round.gs.Exp.rgDefenseExp[1]!.wCount).toBe(0)
    expect(round.gs.Exp.rgAttackExp[1]!.wCount).toBe(1)
  })

  it('an already hidden party skips the enemy turn-start script but marks the round processed', () => {
    const round = startRound({
      enemies: [roundEnemy({ health: 30000, level: 0 })],
      commands: [{ op: 'end' }, { op: 'showDialog', messageIndex: 0, text: '退下' }, { op: 'end' }],
    })
    round.state.enemies[0]!.scriptOnTurnStart = 1
    round.state.iHidingTime = 5 // an existing positive-duration hidden state
    press(round)
    expect(round.state.battleDialogQueue ?? []).toEqual([])
    expect(round.state.turnStartDoneForTurn).toBe(0)
  })
})
