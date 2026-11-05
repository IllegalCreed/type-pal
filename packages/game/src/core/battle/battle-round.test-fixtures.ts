/** Hydrated startBattle resources and real controller input for round-boundary tests. */
import type { AbstractKey, Enemy, PlayerRole } from '@type-pal/shared'
import { expect, onTestFinished } from 'vitest'
import { makeEnemyRecord, makeRoleRecord } from '../../__tests__/battle-records.js'
import { recordingRng } from '../../__tests__/scripted-rng.js'
import { clearBattleRuntimeContext } from './battle-runtime-context.js'
import { battleInput, startTestBattle } from './battle-start.test-fixtures.js'
import { tickBattle } from './battle-system.js'

export function roundRole(options: Partial<PlayerRole> = {}): PlayerRole {
  return makeRoleRecord(options.id ?? 0, {
    hp: 200,
    maxHP: 200,
    mp: 30,
    maxMP: 30,
    attackStrength: 100,
    magicStrength: 0,
    defense: 50,
    dexterity: 50,
    fleeRate: 50,
    ...options,
  })
}

export function roundEnemy(options: Partial<Enemy> = {}): Enemy {
  return makeEnemyRecord({
    health: 100,
    exp: 50,
    cash: 30,
    attackStrength: 10,
    magicStrength: 0,
    defense: 10,
    fleeRate: 0,
    ...options,
  })
}

export function startRound(options: Parameters<typeof startTestBattle>[0] = {}) {
  const fixture = startTestBattle({ roles: [roundRole()], enemies: [roundEnemy()], ...options })
  onTestFinished(() => clearBattleRuntimeContext(fixture.gs))
  const state = fixture.gs.battleState!
  state.rng = recordingRng()
  tickBattle(fixture.gs, battleInput(), fixture.bus)
  expect(fixture.gs.mode).toBe('battle')
  expect(state.phase).toBe('selectAction')
  return { ...fixture, state }
}

export type BattleRoundFixture = ReturnType<typeof startRound>

export function press(round: BattleRoundFixture, ...keys: AbstractKey[]): void {
  tickBattle(round.gs, battleInput(keys), round.bus)
}

export function advanceUntil(round: BattleRoundFixture, ready: () => boolean): void {
  for (let ticks = 0; !ready() && ticks < 500; ticks++) press(round)
  expect(ready()).toBe(true)
}

export function selectAttack(round: BattleRoundFixture, slot: number): void {
  press(round, 'Up', 'Confirm')
  if (!round.state.pendingActions.has(slot)) press(round, 'Confirm')
  expect(round.state.pendingActions.get(slot)?.type).toBe('attack')
}
