/** Real status opcodes feed direct actions and the production action/round controller. */

import { describe, expect, it, onTestFinished } from 'vitest'
import { makeEnemyRecord, makeRoleRecord } from '../../../__tests__/battle-records.js'
import { recordingRng } from '../../../__tests__/scripted-rng.js'
import type { BattleCtx } from '../../event-system.js'
import { performAttack } from '../actions/attack.js'
import { dispatchBattleOpcode } from '../battle-opcodes.js'
import { clearBattleRuntimeContext } from '../battle-runtime-context.js'
import { battleInput, startTestBattle } from '../battle-start.test-fixtures.js'
import { tickBattle } from '../battle-system.js'
import { enemyActor, makeActionFixture, playerActor } from './action.test-fixtures.js'

function statusContext(fixture: ReturnType<typeof makeActionFixture>): BattleCtx {
  return {
    state: fixture.state,
    playerRoles: fixture.playerRoles,
    gs: fixture.gs,
    caster: { type: 'player', idx: 0 },
    target: { type: 'player', idx: 0 },
  }
}

/** StartBattle installs real resources; the test enters at action selection, after the entry fade. */
function prepareRound() {
  const fixture = startTestBattle({
    roles: [makeRoleRecord(0, { hp: 500, maxHP: 500, attackStrength: 200, dexterity: 30 })],
    enemies: [makeEnemyRecord({ health: 30000, level: 0, dexterity: 30, attackStrength: 0 })],
  })
  onTestFinished(() => clearBattleRuntimeContext(fixture.gs))
  const state = fixture.gs.battleState!
  state.phase = 'selectAction'
  state.rng = recordingRng()
  return { ...fixture, state }
}

function selectAttack(fixture: ReturnType<typeof prepareRound>): void {
  for (let ticks = 0; fixture.state.phase === 'selectAction' && ticks < 8; ticks++) {
    tickBattle(fixture.gs, battleInput(['Confirm']), fixture.bus)
  }
  expect(fixture.state.phase).toBe('performAction')
}

describe('status effects through battle callers', () => {
  it('天罡战气: the real status opcode makes the next physical attack deal 945 instead of 315', () => {
    const options = {
      role: { attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 30000 }],
    }
    const plain = makeActionFixture(options)
    performAttack(plain.state, playerActor, 0, plain.bus, plain.playerRoles)
    expect(plain.state.enemies[0]!.e.health).toBe(29685)

    const boosted = makeActionFixture(options)
    expect(dispatchBattleOpcode(0x2d, [5, 3, 0], statusContext(boosted)).consumed).toBe(true)
    expect(boosted.state.players[0]!.status.bravery).toBe(3)
    performAttack(boosted.state, playerActor, 0, boosted.bus, boosted.playerRoles)
    expect(boosted.state.enemies[0]!.e.health).toBe(29055)
  })

  it('金刚咒: the real status opcode reduces physical damage from 160 to 80', () => {
    const options = {
      role: { hp: 500, maxHP: 500, defense: 10 },
      enemies: [{ level: 5, attackStrength: 100 }],
    }
    const plain = makeActionFixture(options)
    performAttack(plain.state, enemyActor, 0, plain.bus, plain.playerRoles)
    expect(plain.playerRoles.roles[0]!.hp).toBe(340)
    const protectedParty = makeActionFixture(options)
    dispatchBattleOpcode(0x2d, [6, 3, 0], statusContext(protectedParty))
    expect(protectedParty.state.players[0]!.status.protect).toBe(3)
    performAttack(
      protectedParty.state,
      enemyActor,
      0,
      protectedParty.bus,
      protectedParty.playerRoles,
    )
    expect(protectedParty.playerRoles.roles[0]!.hp).toBe(420)
  })

  it('仙风云体术: a selected attack enters the real queue at speed 90, ahead of speed 48', () => {
    const plain = prepareRound()
    selectAttack(plain)
    expect(plain.state.actionQueue.map(({ isEnemy, dex }) => ({ isEnemy, dex }))).toEqual([
      { isEnemy: true, dex: 48 },
      { isEnemy: false, dex: 30 },
    ])
    const hasted = prepareRound()
    dispatchBattleOpcode(0x2d, [7, 3, 0], {
      state: hasted.state,
      playerRoles: hasted.playerRoles,
      gs: hasted.gs,
      caster: { type: 'player', idx: 0 },
      target: { type: 'player', idx: 0 },
    })
    expect(hasted.state.players[0]!.status.haste).toBe(3)
    selectAttack(hasted)
    expect(hasted.state.actionQueue.map(({ isEnemy, dex }) => ({ isEnemy, dex }))).toEqual([
      { isEnemy: false, dex: 90 },
      { isEnemy: true, dex: 48 },
    ])
  })

  it('the controller consumes bravery during the action and decrements it only at round end', () => {
    const fixture = prepareRound()
    dispatchBattleOpcode(0x2d, [5, 3, 0], {
      state: fixture.state,
      playerRoles: fixture.playerRoles,
      gs: fixture.gs,
      caster: { type: 'player', idx: 0 },
      target: { type: 'player', idx: 0 },
    })
    selectAttack(fixture)
    for (let ticks = 0; fixture.state.phase === 'performAction' && ticks < 500; ticks++) {
      expect(fixture.state.players[0]!.status.bravery).toBe(3)
      tickBattle(fixture.gs, battleInput(), fixture.bus)
    }
    expect(fixture.state.phase).toBe('postAction')
    expect(fixture.state.enemies[0]!.e.health).toBe(28959) // 347 × 3, with legal unit random factors.
    expect(fixture.state.players[0]!.status.bravery).toBe(3)
    tickBattle(fixture.gs, battleInput(), fixture.bus)
    expect(fixture.state.players[0]!.status.bravery).toBe(2)
  })
})
