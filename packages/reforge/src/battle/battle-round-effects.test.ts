import type { PoisonDef } from '@type-pal/content'
import { expect, test } from 'vitest'
import { wfEnemy, wfHealItem, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { expectDefined } from '../defined.js'
import { type BattleState, createBattleState, stepBattle } from './battle-core.js'

const lowestRoll = () => 0

function idleEnemy(health: number) {
  return wfEnemy(
    'opponent',
    { health },
    { ai: { resistanceToSorcery: 0, rules: [{ at: 'act', do: { kind: 'pass' } }] } },
  )
}

function finishFirstRound(state: BattleState): void {
  stepBattle(state, lowestRoll)
  state.pendingActions.set(0, { kind: 'defend' })
  stepBattle(state, lowestRoll)
  stepBattle(state, lowestRoll)
  stepBattle(state, lowestRoll)
  stepBattle(state, lowestRoll)
  expect(state).toMatchObject({ phase: 'selectAction', turn: 2 })
}

test('a poison tick changes party MP and applies enemy HP damage without an enemy MP pool', () => {
  const poison: PoisonDef = {
    id: 1,
    name: '赤毒',
    curability: 'common',
    color: 0,
    playerTicks: [{ mpDelta: -4 }],
    enemyTicks: [{ mpDelta: -7, hpDelta: -1 }],
  }
  const state = createBattleState({
    players: [wfPlayer('hero', { mp: 30, poisons: [{ poisonId: 1, tickIndex: 0 }] })],
    enemySlots: [idleEnemy(50)],
    poisonDefs: { 1: poison },
  })
  const enemy = expectDefined(state.enemies[0])
  enemy.poisons = [{ poisonId: 1, tickIndex: 0 }]

  finishFirstRound(state)
  expect(state.players[0]).toMatchObject({ hp: 100, mp: 26 })
  expect(enemy.hp).toBe(49)
  expect(enemy).not.toHaveProperty('mp')
  expect(state.log).toContain('hero 赤毒 发作')
  expect(state.log).toContain('1 赤毒 发作')
})

test('unnamed poison grants identify the poison and stack into an existing item slot', () => {
  const held = wfHealItem('held')
  const fresh = wfHealItem('fresh')
  const poisonGrant = (id: number, grantItem: string): PoisonDef => ({
    id,
    name: '',
    curability: 'common',
    color: 0,
    playerTicks: [{ hpDelta: -1, grantItem }],
  })
  const state = createBattleState({
    players: [
      wfPlayer('hero', {
        poisons: [
          { poisonId: 3, tickIndex: 0 },
          { poisonId: 4, tickIndex: 0 },
        ],
      }),
    ],
    enemySlots: [idleEnemy(50)],
    inventory: [{ itemId: held.id, count: 2 }],
    items: { held, fresh },
    poisonDefs: { 3: poisonGrant(3, held.id), 4: poisonGrant(4, fresh.id) },
  })

  finishFirstRound(state)
  expect(state.inventory).toEqual([
    { itemId: 'held', count: 3 },
    { itemId: 'fresh', count: 1 },
  ])
  expect(state.players[0]).toMatchObject({
    hp: 98,
    poisons: [
      { poisonId: 3, tickIndex: 0 },
      { poisonId: 4, tickIndex: 0 },
    ],
  })
  expect(state.log).toContain('毒3 到期化作 held')
  expect(state.log).toContain('毒4 到期化作 fresh')
})

test('equipment restores MP at round end and stops at maximum MP', () => {
  const run = (mp: number) => {
    const state = createBattleState({
      players: [wfPlayer('hero', { mp, maxMp: 30, regenMp: 5 })],
      enemySlots: [idleEnemy(50)],
    })
    finishFirstRound(state)
    return state.players[0]?.mp
  }

  expect(run(20)).toBe(25)
  expect(run(26)).toBe(30)
})
