import { validateEnemies, validateItems, validatePoisons } from '@type-pal/content'
import { expect, test } from 'vitest'
import palEnemies from '../../../../projects/pal/content/enemies.json' with { type: 'json' }
import palItems from '../../../../projects/pal/content/items.json' with { type: 'json' }
import palPoisons from '../../../../projects/pal/content/poisons.json' with { type: 'json' }
import { wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { fixedDraws } from '../__tests__/battle-workflows/controlled-io.js'
import { expectDefined } from '../defined.js'
import { applyEnemyEquivItem, createBattleState, stepBattle } from './battle-core.js'

function bloodWormBattle() {
  const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-406'))
  const items = validateItems(palItems.filter(({ id }) => id === '117' || id === '87'))
  const redPoison = expectDefined(validatePoisons(palPoisons).find(({ id }) => id === 551))
  return {
    players: [
      wfPlayer('li-xiaoyao', {
        hp: 150,
        maxHp: 150,
        attackStrength: 452,
        defense: 259,
        baseDexterity: 903,
      }),
    ],
    enemySlots: [enemy],
    items: Object.fromEntries(items.map((item) => [item.id, item])),
    poisonDefs: { [redPoison.id]: redPoison },
    inventory: [{ itemId: '87', count: 2 }],
  }
}

test.each([
  { resistance: 30, hp: 150, poisons: [] },
  { resistance: 29, hp: 143, poisons: [{ poisonId: 551, tickIndex: 0 }] },
])('using a snake egg with resistance $resistance applies the entry tick only if the roll passes', ({
  resistance,
  hp,
  poisons,
}) => {
  const input = bloodWormBattle()
  const player = expectDefined(input.players[0])
  const state = createBattleState({
    ...input,
    players: [{ ...player, poisonRes: resistance }],
    inventory: [{ itemId: '117', count: 1 }],
  })
  // One initiative draw per side, then the 0x29 roll of 30.
  const nextDraw = 0.83
  const rng = fixedDraws([0.5, 0.5, 0.296875, nextDraw])
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'item', itemId: '117', targetAllyIdx: 0 })
  stepBattle(state, rng)
  stepBattle(state, rng)

  expect(state.lastAction).toMatchObject({ kind: 'item', itemId: '117' })
  expect(state.players[0]).toMatchObject({ hp, poisons })
  expect(state.inventory).toEqual([{ itemId: '117', count: 0 }])
  expect(rng()).toBe(nextDraw)
})

test('the blood worm starts red poison on hit, ticks again at turn end, and red sulfur cures it', () => {
  const rng = fixedDraws([
    // Mulberry32 seed 72. Round 1 queue, physical block/bonuses, equiv rate and both resistance rolls.
    0.20860595,
    0.15407627, 0.27076954, 0.1212119, 0.07027551, 0.33176822, 0.82964625, 0.9120957,
    // Round 2 queue and enemy hit. Equiv rate roll 7 fails, so cured poison stays gone.
    0.82732467, 0.32723454, 0.56938923, 0.21580437, 0.07883221, 0.66864745,
    // Round 3 queue and the lethal player hit.
    0.1257016, 0.48066431, 0.48407086, 0.72779004, 0.64045726, 0.42850434, 0.17432523,
  ])
  const state = createBattleState(bloodWormBattle())
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'defend' })
  stepBattle(state, rng)
  stepBattle(state, rng)
  stepBattle(state, rng)
  expect(state.players[0]).toMatchObject({ hp: 142, poisons: [{ poisonId: 551, tickIndex: 0 }] })
  expect(state.lastAction).toMatchObject({ kind: 'attack', damage: 1, targetPlayerIdx: 0 })
  stepBattle(state, rng)
  expect(state.players[0]?.hp).toBe(135)

  state.pendingActions.set(0, { kind: 'item', itemId: '87', targetAllyIdx: 0 })
  stepBattle(state, rng)
  stepBattle(state, rng)
  expect(state.players[0]?.poisons).toEqual([])
  expect(state.inventory).toEqual([{ itemId: '87', count: 1 }])
  stepBattle(state, rng)
  stepBattle(state, rng)
  expect(state.players[0]).toMatchObject({ hp: 134, poisons: [] })

  state.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
  stepBattle(state, rng)
  stepBattle(state, rng)
  expect(state.lastAction).toMatchObject({ kind: 'attack', firstDamage: 407 })
  expect(state).toMatchObject({ phase: 'won', expGained: 14, cashGained: 9 })
})

test('a lethal enemy hit still rolls the equivalent poison and runs its entry without reviving', () => {
  const input = bloodWormBattle()
  const player = expectDefined(input.players[0])
  const redPoison = expectDefined(input.poisonDefs[551])
  const poison = expectDefined(
    validatePoisons([
      { ...redPoison, playerTicks: [{ hpDelta: 5, mpDelta: 4 }, { hpDelta: -7 }] },
    ])[0],
  )
  const state = createBattleState({
    ...input,
    players: [{ ...player, hp: 1, mp: 10 }],
    poisonDefs: { [poison.id]: poison },
  })
  // Seed 72: queue, block, physical bonuses, rate, both resistances, then an unused draw.
  const rng = fixedDraws([
    0.20860595, 0.15407627, 0.27076954, 0.1212119, 0.07027551, 0.33176822, 0.82964625, 0.9120957,
    0.82732467,
  ])
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'defend' })
  stepBattle(state, rng)
  stepBattle(state, rng)
  stepBattle(state, rng)

  // CLASSIC 0x29 adds the poison and enters the tick at HP 0, where 0x1B/0x1C cannot change HP/MP.
  expect(state.lastAction).toMatchObject({ kind: 'attack', damage: 1, targetPlayerIdx: 0 })
  expect(state.players[0]).toMatchObject({
    hp: 0,
    mp: 10,
    poisons: [{ poisonId: 551, tickIndex: 1 }],
  })
  expect(state.phase).toBe('lost')
  expect(rng()).toBe(0.82732467)
})

test('the attached poison script can fail resistance after the equivalent item gate passes', () => {
  const input = bloodWormBattle()
  const playerInput = expectDefined(input.players[0])
  const state = createBattleState({ ...input, players: [{ ...playerInput, poisonRes: 50 }] })
  const player = expectDefined(state.players[0])
  const enemy = expectDefined(state.enemies[0])

  // Rate 4 >= 1 and outer roll 61 > 50, but the 0x29 script roll is 11.
  applyEnemyEquivItem(player, enemy, state, fixedDraws([0, 0.6, 0.1]))
  expect(player.poisons).toEqual([])
  expect(player.hp).toBe(150)
})

test('the immediate equivalent-item tick only runs when a new poison entry is added', () => {
  const state = createBattleState(bloodWormBattle())
  const player = expectDefined(state.players[0])
  const enemy = expectDefined(state.enemies[0])
  const successfulRolls = fixedDraws([0, 0, 0, 0, 0, 0])

  applyEnemyEquivItem(player, enemy, state, successfulRolls)
  applyEnemyEquivItem(player, enemy, state, successfulRolls)
  expect(player.poisons).toEqual([{ poisonId: 551, tickIndex: 0 }])
  expect(player.hp).toBe(143)
})
