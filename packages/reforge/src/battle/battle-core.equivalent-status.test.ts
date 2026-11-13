import { validateEnemies, validateItems } from '@type-pal/content'
import { expect, test } from 'vitest'
import palEnemies from '../../../../projects/pal/content/enemies.json' with { type: 'json' }
import palItems from '../../../../projects/pal/content/items.json' with { type: 'json' }
import { wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { expectDefined } from '../defined.js'
import { createBattleState, stepBattle } from './battle-core.js'

const spider = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-514'))
const items = Object.fromEntries(
  validateItems(palItems.filter(({ id }) => id === '84' || id === '127')).map((item) => [
    item.id,
    item,
  ]),
)

test.each([
  { garlic: false, hp: 218, sleep: 3 },
  { garlic: true, hp: 219, sleep: 0 },
])('the spider attachment follows the same resistance roll with garlic=$garlic', ({
  garlic,
  hp,
  sleep,
}) => {
  const state = createBattleState({
    players: [
      wfPlayer('zhao-linger', {
        hp: 220,
        maxHp: 240,
        mp: 100,
        maxMp: 100,
        attackStrength: 308,
        defense: 413,
        magicStrength: 58,
        baseDexterity: 7,
        fleeRate: 39,
        poisonRes: 20,
        grantedStatuses: ['dualAttack'],
      }),
    ],
    enemySlots: [spider],
    items,
    inventory: garlic ? [{ itemId: '84', count: 1 }] : [],
  })
  // Seed 24 from the paired native runs: initiative, block, damage, rate 2, resistance roll 28.
  const unused = 0.45944890519604087
  const draws = [
    0.33202015655115247,
    0.9638483456801623,
    0.29391058976761997,
    0.08772711432538927,
    0.5251554888673127,
    0.11693711811676621,
    0.2707359988708049,
    unused,
  ].values()
  const rng = () => expectDefined(draws.next().value)
  stepBattle(state, rng)
  state.pendingActions.set(
    0,
    garlic ? { kind: 'item', itemId: '84', targetAllyIdx: 0 } : { kind: 'defend' },
  )
  stepBattle(state, rng)
  stepBattle(state, rng)
  expect(state.players[0]?.poisonRes).toBe(garlic ? 50 : 20)
  stepBattle(state, rng)

  expect(state.lastAction).toMatchObject({
    side: 'enemy',
    kind: 'attack',
    damage: 1,
    targetPlayerIdx: 0,
  })
  expect(draws.next().value).toBe(unused)
  // PAL SSS 39391–39392: apply sleep for 3 turns and subtract 1 HP after the physical hit.
  expect(state.players[0]).toMatchObject({ hp, status: { sleep }, poisons: [] })
})
