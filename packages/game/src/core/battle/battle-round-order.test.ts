/** Legal menu requests reach the production queue; no injected pending actions. */
import { describe, expect, it } from 'vitest'
import { recordingRng } from '../../__tests__/scripted-rng.js'
import { createInitialGameState } from '../game-state.js'
import { makeItem } from './__tests__/action.test-fixtures.js'
import {
  press,
  roundEnemy,
  roundRole,
  selectAttack,
  startRound,
} from './battle-round.test-fixtures.js'

describe('round action speed', () => {
  it('halves odd flee speed before jitter, then orders both fleeing players and the enemy', () => {
    const round = startRound({
      roles: [roundRole({ id: 0, dexterity: 21 }), roundRole({ id: 1, dexterity: 41 })],
      enemies: [roundEnemy({ level: 0, dexterity: 0 })],
    })
    round.state.rng = recordingRng([], [1, 1.05, 1]) // enemy, player0, player1
    press(round, 'Flee')
    expect([...round.state.pendingActions.values()].map((action) => action.type)).toEqual([
      'flee',
      'flee',
    ])
    expect(round.state.actionQueue.map(({ isEnemy, idx, dex }) => [isEnemy, idx, dex])).toEqual([
      [false, 1, 20],
      [true, 0, 18],
      [false, 0, 10],
    ])
  })

  it('a stocked usable item reaches the queue at triple speed through the real picker', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 7, count: 2 }]
    const round = startRound({
      gs,
      roles: [roundRole({ id: 0, dexterity: 8 }), roundRole({ id: 1, dexterity: 20 })],
      enemies: [roundEnemy({ level: 0, dexterity: 0 })],
      items: [makeItem({ id: 7 })],
    })
    press(round, 'UseItem')
    expect(round.state.itemSelect?.items.map((item) => item.id)).toEqual([7])
    press(round, 'Confirm')
    press(round, 'Confirm') // target player0 in a two-player party
    expect(round.state.pendingActions.get(0)).toMatchObject({
      type: 'item',
      actionId: 7,
      target: 0,
    })
    selectAttack(round, 1)
    expect(round.state.phase).toBe('performAction')
    expect(round.state.actionQueue.map(({ isEnemy, idx, dex }) => [isEnemy, idx, dex])).toEqual([
      [false, 0, 24],
      [false, 1, 20],
      [true, 0, 18],
    ])
    expect(gs.inventory).toEqual([{ itemId: 7, count: 2 }]) // selection does not consume
  })

  it('a dying attacker enters behind the healthy player and enemy with halved speed', () => {
    const round = startRound({
      roles: [roundRole({ id: 0, dexterity: 30, hp: 10 }), roundRole({ id: 1, dexterity: 20 })],
      enemies: [roundEnemy({ level: 0, dexterity: 0 })],
    })
    selectAttack(round, 0)
    selectAttack(round, 1)
    expect(round.state.actionQueue.map(({ isEnemy, idx, dex }) => [isEnemy, idx, dex])).toEqual([
      [false, 1, 20],
      [true, 0, 18],
      [false, 0, 15],
    ])
  })
})
