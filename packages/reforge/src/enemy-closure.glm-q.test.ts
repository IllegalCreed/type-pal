// Q05 · enemy-closure 敌方 transform/summon 可达闭包（旧测 0 命中，全源新覆盖）。
import type { AiAction, EnemyDef } from '@type-pal/content'
import { expect, describe, test } from 'vitest'
import { collectReachableEnemyDefs, collectReachableEnemySkillIds } from './battle/enemy-closure.js'
import { opponent } from './__tests__/runtime-shell/scenarios.js'

function withRules(id: string, actions: AiAction[]): EnemyDef {
  const base = opponent({ id })
  return {
    ...base,
    ai: {
      ...base.ai,
      rules: actions.map((do_) => ({ at: 'act' as const, do: do_ })),
    },
  }
}

const cast = (skillId: string): Extract<AiAction, { kind: 'cast' }> => ({ kind: 'cast', skillId })
const transform = (enemyId: string): Extract<AiAction, { kind: 'transform' }> => ({ kind: 'transform', enemyId })
const summon = (enemyId: string): Extract<AiAction, { kind: 'summon' }> => ({ kind: 'summon', enemyId, count: 1 })

describe('Q05 collectReachableEnemyDefs', () => {
  test('无 transform/summon 时闭包只含初始敌人且按序去重', () => {
    const table = { a: withRules('a', [cast('s1')]), b: withRules('b', [{ kind: 'flee' }]) }
    const result = collectReachableEnemyDefs([table.a!, table.a!, table.b!], table)
    expect(result.map((enemy) => enemy.id)).toEqual(['a', 'b'])
  })

  test('transform 与 summon 都把目标敌入队；未知目标精确报错', () => {
    const table = {
      boss: withRules('boss', [transform('wing'), summon('minion')]),
      wing: withRules('wing', [cast('gust')]),
      minion: withRules('minion', [cast('bite')]),
    }
    const result = collectReachableEnemyDefs([table.boss!], table)
    expect(result.map((enemy) => enemy.id)).toEqual(['boss', 'wing', 'minion'])
    const broken = { boss: withRules('boss', [transform('ghost')]) }
    expect(() => collectReachableEnemyDefs([broken.boss!], broken)).toThrow(
      '敌人 "boss" transform 目标 "ghost" 不存在',
    )
  })

  test('enemyId 缺省的 summon 不入队；hooks 内 effect summon 参与闭包', () => {
    const table = {
      root: opponent({
        id: 'root',
        ai: {
          resistanceToSorcery: 0,
          fallback: { action: cast('hex'), chancePercent: 50 },
          hooks: {
            ready: {
              initial: 'main',
              states: {
                main: {
                  body: [
                    { id: 'h1', kind: 'effect', effect: summon('support') },
                    { kind: 'setFallback' },
                  ],
                  next: { kind: 'stay' },
                },
              },
            },
          },
          rules: [],
        },
      }),
      support: withRules('support', [cast('aid')]),
    }
    const result = collectReachableEnemyDefs([table.root!], table)
    expect(result.map((enemy) => enemy.id)).toEqual(['root', 'support'])
  })

  test('循环 transform 引用不发散（seen 去重终止）', () => {
    const table = {
      x: withRules('x', [transform('y')]),
      y: withRules('y', [transform('x')]),
    }
    const result = collectReachableEnemyDefs([table.x!], table)
    expect(result.map((enemy) => enemy.id)).toEqual(['x', 'y'])
  })
})

describe('Q05 collectReachableEnemySkillIds', () => {
  test('仅收集 cast 技能、跨敌人去重且顺序稳定', () => {
    const table = {
      boss: withRules('boss', [cast('fire'), transform('wing')]),
      wing: withRules('wing', [cast('fire'), cast('gust'), { kind: 'attack' }]),
      minion: withRules('minion', [summon('boss')]),
    }
    const result = collectReachableEnemySkillIds([table.boss!, table.minion!], table)
    expect(result).toEqual(['fire', 'gust'])
  })

  test('fallback cast 计入技能闭包；hook effect summon/divide 不产生技能', () => {
    const table = {
      root: opponent({
        id: 'root',
        ai: {
          resistanceToSorcery: 0,
          fallback: { action: cast('hex'), chancePercent: 50 },
          hooks: {
            ready: {
              initial: 'main',
              states: {
                main: {
                  body: [{ id: 'h1', kind: 'effect', effect: { kind: 'divide', copies: 2 } }],
                  next: { kind: 'stay' },
                },
              },
            },
          },
          rules: [],
        },
      }),
    }
    expect(collectReachableEnemySkillIds([table.root!], table)).toEqual(['hex'])
    expect(collectReachableEnemySkillIds([], table)).toEqual([])
  })
})
