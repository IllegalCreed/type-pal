import type { ItemData, SkillData } from '@type-pal/content'
import { expect, test } from 'vitest'
import { wfEnemy, wfHealItem, wfPlayer, wfSkill } from '../__tests__/battle-workflows/catalog.js'
import { createBattleState, stepBattle } from './battle-core.js'

const lowestRoll = () => 0

function stealFrom(itemId: string, count: number, items: Record<string, ItemData> = {}) {
  const spell: SkillData = { ...wfSkill('steal', 0), effects: [{ kind: 'steal', rate: 10 }] }
  const state = createBattleState({
    players: [wfPlayer('hero', { baseDexterity: 500, skills: [spell.id] })],
    enemySlots: [wfEnemy('target', { health: 500 }, { steal: { itemId, count } })],
    skills: { [spell.id]: spell },
    items,
  })
  stepBattle(state, lowestRoll)
  state.pendingActions.set(0, { kind: 'cast', skillId: spell.id, targetEnemyIdx: 0 })
  stepBattle(state, lowestRoll)
  stepBattle(state, lowestRoll)
  expect(state.lastAction).toMatchObject({
    side: 'player',
    idx: 0,
    kind: 'cast',
    skillId: spell.id,
  })
  return state
}

test('steal reports the item or money actually acquired and leaves a rounded zero silent', () => {
  const money = stealFrom('0', 9)
  expect(money.moneyDelta).toBe(4)
  expect(money.lastAction).toMatchObject({
    notice: '获得 4 文钱',
    stolen: { kind: 'money', amount: 4 },
  })

  const relic = { ...wfHealItem('relic'), name: '夜行衣' }
  const named = stealFrom(relic.id, 1, { relic })
  expect(named.inventory).toEqual([{ itemId: relic.id, count: 1 }])
  expect(named.lastAction).toMatchObject({
    notice: '获得 夜行衣',
    stolen: { kind: 'item', name: '夜行衣' },
  })

  // A direct caller with a partial item lookup still receives a stable fallback label.
  const unknown = stealFrom('unloaded', 1)
  expect(unknown.inventory).toEqual([{ itemId: 'unloaded', count: 1 }])
  expect(unknown.lastAction?.notice).toBe('获得 unloaded')

  const zero = stealFrom('0', 1)
  expect(zero.moneyDelta).toBe(0)
  expect(zero.enemies[0]?.stealLeft).toBe(1)
  expect(zero.lastAction?.notice).toBeUndefined()
  expect(zero.lastAction?.stolen).toBeUndefined()
  expect(zero.log).not.toContain('hero 获得 0 文钱')
})
