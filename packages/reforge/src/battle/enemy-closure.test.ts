import type { AiAction, EnemyDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { wfEnemy } from '../__tests__/battle-workflows/catalog.js'
import { collectReachableEnemyDefs, collectReachableEnemySkillIds } from './enemy-closure.js'

function enemyWithRules(id: string, actions: AiAction[]): EnemyDef {
  return wfEnemy(
    id,
    {},
    {
      ai: {
        resistanceToSorcery: 0,
        rules: actions.map((action) => ({ at: 'act', do: action })),
      },
    },
  )
}

describe('enemy dependency closure', () => {
  test('keeps starting enemies in order and visits repeated definitions once', () => {
    const first = enemyWithRules('first', [{ kind: 'cast', skillId: 'fire' }])
    const second = enemyWithRules('second', [{ kind: 'flee' }])
    expect(collectReachableEnemyDefs([first, first, second], { first, second })).toEqual([
      first,
      second,
    ])
  })

  test('a missing explicit transform reports the source enemy and target', () => {
    const source = enemyWithRules('source', [{ kind: 'transform', enemyId: 'missing' }])
    expect(() => collectReachableEnemyDefs([source], { source })).toThrow(
      '敌人 "source" transform 目标 "missing" 不存在',
    )
  })

  test('a hook summon without an enemy ID needs no lookup of its starting definition', () => {
    const source = wfEnemy(
      'summoner',
      {},
      {
        ai: {
          resistanceToSorcery: 0,
          hooks: {
            ready: {
              initial: 'ready',
              states: {
                ready: {
                  body: [
                    { kind: 'effect', id: 'summon-self', effect: { kind: 'summon', count: 1 } },
                    { kind: 'effect', id: 'divide', effect: { kind: 'divide', copies: 2 } },
                    { kind: 'setFallback' },
                  ],
                  next: { kind: 'stay' },
                },
              },
            },
          },
        },
      },
    )
    expect(collectReachableEnemyDefs([source], {})).toEqual([source])
    expect(collectReachableEnemySkillIds([source], {})).toEqual([])
  })

  test('collects reachable cast skills once in first-seen order', () => {
    const boss = enemyWithRules('boss', [
      { kind: 'cast', skillId: 'fire' },
      { kind: 'transform', enemyId: 'wing' },
    ])
    const wing = enemyWithRules('wing', [
      { kind: 'cast', skillId: 'fire' },
      { kind: 'cast', skillId: 'gust' },
      { kind: 'attack' },
    ])
    const minion = enemyWithRules('minion', [{ kind: 'summon', enemyId: 'boss', count: 1 }])
    expect(collectReachableEnemySkillIds([boss, minion], { boss, wing, minion })).toEqual([
      'fire',
      'gust',
    ])
  })

  test('without starting enemies, registered enemies do not contribute skills', () => {
    const caster = enemyWithRules('caster', [{ kind: 'cast', skillId: 'fire' }])
    expect(collectReachableEnemySkillIds([], { caster })).toEqual([])
  })
})
