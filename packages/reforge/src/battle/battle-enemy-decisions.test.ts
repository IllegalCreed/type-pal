import { expect, test } from 'vitest'
import { wfEnemy, wfPlayer, wfSkill } from '../__tests__/battle-workflows/catalog.js'
import { expectDefined } from '../defined.js'
import { createBattleState, decideEnemyAction } from './battle-core.js'

const lowestRoll = () => 0

test('silence changes an available fallback spell into an ordinary attack', () => {
  const spell = wfSkill('enemy-bolt')
  const caster = wfEnemy(
    'caster',
    {},
    {
      ai: {
        resistanceToSorcery: 0,
        fallback: { action: { kind: 'cast', skillId: spell.id }, chancePercent: 100 },
      },
    },
  )
  const newBattle = () =>
    createBattleState({
      players: [wfPlayer('hero')],
      enemySlots: [caster],
      skills: { [spell.id]: spell },
    })

  const clear = newBattle()
  const silenced = newBattle()
  const silencedCaster = expectDefined(silenced.enemies[0])
  silencedCaster.status.silence = 2

  expect(decideEnemyAction(clear, expectDefined(clear.enemies[0]), lowestRoll)).toEqual({
    kind: 'cast',
    skill: spell,
    targetPlayerIdx: 0,
  })
  expect(decideEnemyAction(silenced, silencedCaster, lowestRoll)).toEqual({
    kind: 'attack',
    targetPlayerIdx: 0,
  })
  expect(silenced.log).toEqual([])
})

test('a missing transform or summon definition falls back to attacking the selected player', () => {
  const target = wfEnemy('target')
  const cases = [
    { action: { kind: 'transform', enemyId: target.id }, verb: '变身' },
    { action: { kind: 'summon', enemyId: target.id, count: 1 }, verb: '召唤' },
  ] as const
  for (const { action, verb } of cases) {
    const caller = wfEnemy(
      'caller',
      {},
      { ai: { resistanceToSorcery: 0, rules: [{ at: 'act', do: action }] } },
    )
    const roster = { players: [wfPlayer('hero')], enemySlots: [caller, null] }
    // Direct AI callers may supply a partial lookup even though project validation checks references.
    const missing = createBattleState(roster)
    const registered = createBattleState({ ...roster, enemiesById: { target } })

    expect(decideEnemyAction(missing, expectDefined(missing.enemies[0]), lowestRoll)).toEqual({
      kind: 'attack',
      targetPlayerIdx: 0,
    })
    expect(missing.log).toEqual([`caller ${verb} target 缺敌人数据,落普攻`])
    expect(
      decideEnemyAction(registered, expectDefined(registered.enemies[0]), lowestRoll),
    ).toMatchObject({
      kind: action.kind,
      def: target,
    })
  }
})

test('a summon without an enemy ID selects the caller’s current definition', () => {
  const caller = wfEnemy(
    'caller',
    {},
    { ai: { resistanceToSorcery: 0, rules: [{ at: 'act', do: { kind: 'summon', count: 1 } }] } },
  )
  const state = createBattleState({ players: [wfPlayer('hero')], enemySlots: [caller, null] })

  expect(decideEnemyAction(state, expectDefined(state.enemies[0]), lowestRoll)).toEqual({
    kind: 'summon',
    def: caller,
    count: 1,
  })
})
