import assert from 'node:assert/strict'
import test from 'node:test'
import { battleFoundationScenario, battleLaunchSpec } from './battle-foundation-scenarios.mjs'
import { nextReforgeBattleKey } from './battle-reforge-input.mjs'

test('public setup carries no oracle and returned scenarios cannot alter later runs', () => {
  const scenario = battleFoundationScenario('herb-settlement')
  const launch = battleLaunchSpec(scenario)
  assert(!Object.hasOwn(launch, 'expected'))
  assert.equal(launch.game.fixture.inventory[0].count, 2)
  launch.game.fixture.inventory[0].count = 99
  scenario.expected.actions[0].after.players[0].hp = 999
  const fresh = battleFoundationScenario('herb-settlement')
  assert.equal(fresh.game.fixture.inventory[0].count, 2)
  assert.equal(fresh.expected.actions[0].after.players[0].hp, 100)
  assert.equal(fresh.expected.terminal.after.players[0].hp, 125)
  assert.throws(() => battleFoundationScenario('missing'), /unknown/)
})

test('Reforge target navigation preserves a living instance after a dead slot and uses the real ally cursor', () => {
  const scenario = battleFoundationScenario('party-lanterns')
  const state = {
    busy: false,
    phase: 'selectAction',
    selectingPlayerId: 'anu',
    selection: { phase: 'target', targetSide: 'enemy', targetIndex: 0 },
    snapshot: structuredClone(scenario.expected.start),
  }
  state.snapshot.enemies[0].alive = false
  const command = { kind: 'attack', actorId: 'anu', targetId: 'lantern-c' }
  assert.equal(nextReforgeBattleKey(state, command), 'ArrowRight')
  state.selection.targetIndex = 1
  assert.equal(nextReforgeBattleKey(state, command), 'Enter')
  state.selection = { phase: 'target', targetSide: 'ally', targetIndex: 0 }
  assert.equal(
    nextReforgeBattleKey(state, { kind: 'item', actorId: 'anu', targetId: 'li-xiaoyao' }),
    'Enter',
  )
  assert.throws(() => nextReforgeBattleKey(state, { ...command, targetId: 'absent' }), /absent/)
  assert.throws(() => nextReforgeBattleKey(state, { ...command, kind: 'unknown' }), /unsupported/)
  assert.equal(nextReforgeBattleKey({ canConfirmSettlement: true }), 'Enter')
  assert.equal(nextReforgeBattleKey({ busy: true }, command), null)
})
