import { expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { runBattleToEnd } from '../__tests__/battle-workflows/core-driver.js'
import { createBattleState, stepBattle } from './battle-core.js'

const lowestRoll = () => 0

test('the factory preserves holes in a five-slot formation and rejects a sixth slot', () => {
  const enemySlots = [wfEnemy('first'), null, wfEnemy('third'), null, wfEnemy('fifth')]
  const players = [wfPlayer('hero')]
  const state = createBattleState({ players, enemySlots })

  expect(state.maxEnemyIndex).toBe(4)
  expect(state.enemies.map((enemy) => enemy?.def.id ?? null)).toEqual([
    'first',
    null,
    'third',
    null,
    'fifth',
  ])
  expect(() => createBattleState({ players, enemySlots: [...enemySlots, null] })).toThrow(
    'battle enemySlots: 槽位数 6 超上限 5',
  )
})

test('the headless driver rejects stalled selection after its step budget', () => {
  const newBattle = () =>
    createBattleState({
      players: [wfPlayer('hero', { baseDexterity: 500 })],
      enemySlots: [wfEnemy('opponent', { health: 1 })],
    })

  expect(() => runBattleToEnd(newBattle(), () => undefined, lowestRoll, 4)).toThrow(
    'runBattleToEnd: 超过 maxSteps 未终结',
  )
  expect(
    runBattleToEnd(
      newBattle(),
      (battle) => battle.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 }),
      lowestRoll,
      3,
    ),
  ).toBe('won')
})

test('enemy flight preserves rewards earned before the flight and adds none', () => {
  const defeated = wfEnemy('defeated', { health: 1, dexterity: 0, exp: 7, cash: 4 })
  const deserter = wfEnemy(
    'deserter',
    { health: 999, dexterity: 50, exp: 99, cash: 88 },
    { ai: { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'flee' } }] } },
  )
  const state = createBattleState({
    players: [wfPlayer('hero', { baseDexterity: 500 })],
    enemySlots: [defeated, deserter],
  })

  stepBattle(state, lowestRoll)
  state.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
  stepBattle(state, lowestRoll)
  stepBattle(state, lowestRoll)

  expect(state).toMatchObject({ phase: 'performAction', expGained: 7, cashGained: 4 })
  expect(state.enemies[0]?.hp).toBe(0)
  expect(state.enemies[1]?.hp).toBe(999)

  stepBattle(state, lowestRoll)
  expect(state.lastAction).toMatchObject({ side: 'enemy', idx: 1, kind: 'fleeAll' })
  expect(state).toMatchObject({ phase: 'won', enemyFled: true, expGained: 7, cashGained: 4 })
})
