import type { EnemyFallback } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfPlayer, wfSkill } from '../__tests__/battle-workflows/catalog.js'
import { expectDefined } from '../defined.js'
import { createBattleState } from './battle-core.js'
import { beginEnemyHookActivation, nextEnemyHookStep } from './enemy-hook-runtime.js'

const player = (actorTemplateId = 'zhao-linger') => wfPlayer('ling-instance', { actorTemplateId })

describe('enemy hook runtime', () => {
  test('continue 同 activation 执行，advance 只在结束时提交 cursor', () => {
    const source = wfEnemy('source')
    source.ai.hooks = {
      ready: {
        initial: 'a',
        states: {
          a: {
            body: [{ kind: 'playSound', asset: 'sound.a' }],
            next: { kind: 'continue', state: 'b' },
          },
          b: {
            body: [{ kind: 'wait', ms: 80 }],
            next: { kind: 'advance', state: 'done' },
          },
          done: { body: [], next: { kind: 'stay' } },
        },
      },
    }
    const state = createBattleState({ players: [player()], enemies: [source] })
    const activation = expectDefined(beginEnemyHookActivation(state, 0, 'ready'))
    expect(nextEnemyHookStep(state, activation, () => 0)).toEqual({
      kind: 'action',
      action: { kind: 'playSound', asset: 'sound.a' },
    })
    expect(expectDefined(state.enemies[0]).hookCursors.ready).toBe('a')
    expect(nextEnemyHookStep(state, activation, () => 0)).toEqual({
      kind: 'action',
      action: { kind: 'wait', ms: 80 },
    })
    expect(expectDefined(state.enemies[0]).hookCursors.ready).toBe('a')
    expect(nextEnemyHookStep(state, activation, () => 0)).toEqual({ kind: 'complete' })
    expect(expectDefined(state.enemies[0]).hookCursors.ready).toBe('done')
  })

  test('effect outcome 吃真实 summon 结果并驱动 retry/advance', () => {
    const source = wfEnemy('source')
    const minion = wfEnemy('minion')
    source.ai.hooks = {
      ready: {
        initial: 'summon',
        states: {
          summon: {
            body: [
              {
                kind: 'effect',
                id: 'spawn',
                effect: { kind: 'summon', enemyId: 'minion', count: 1 },
              },
            ],
            next: {
              kind: 'commandOutcome',
              commandId: 'spawn',
              outcome: 'succeeded',
              then: { kind: 'advance', state: 'done' },
              else: { kind: 'stay' },
            },
          },
          done: { body: [], next: { kind: 'stay' } },
        },
      },
    }
    const state = createBattleState({
      players: [player()],
      enemySlots: [source, null],
      enemiesById: { minion },
    })
    const activation = expectDefined(beginEnemyHookActivation(state, 0, 'ready'))
    expect(nextEnemyHookStep(state, activation, () => 0)).toMatchObject({
      kind: 'effect',
      commandId: 'spawn',
      result: { outcome: 'succeeded', spawnedIdxs: [1] },
    })
    expect(state.enemies[1]?.def).toBe(minion)
    expect(nextEnemyHookStep(state, activation, () => 0)).toEqual({ kind: 'complete' })
    expect(expectDefined(state.enemies[0]).hookCursors.ready).toBe('done')

    const full = createBattleState({
      players: [player()],
      enemies: [source, wfEnemy('b'), wfEnemy('c'), wfEnemy('d'), wfEnemy('e')],
      enemiesById: { minion },
    })
    const retry = expectDefined(beginEnemyHookActivation(full, 0, 'ready'))
    expect(nextEnemyHookStep(full, retry, () => 0)).toMatchObject({
      kind: 'effect',
      result: { outcome: 'failed' },
    })
    expect(nextEnemyHookStep(full, retry, () => 0)).toEqual({ kind: 'complete' })
    expect(expectDefined(full.enemies[0]).hookCursors.ready).toBe('summon')
  })

  test('branch 只在经过时消费 RNG，random 恰好单抽并按权重选臂', () => {
    const source = wfEnemy('source')
    source.ai.hooks = {
      turnStart: {
        initial: 'a',
        states: {
          a: {
            body: [],
            next: {
              kind: 'branch',
              cond: { kind: 'playerInParty', role: 'zhao-linger' },
              then: {
                kind: 'random',
                choices: [
                  { weight: 29, then: { kind: 'advance', state: 'explain' } },
                  { weight: 71, then: { kind: 'advance', state: 'done' } },
                ],
              },
              else: { kind: 'stay' },
            },
          },
          explain: { body: [], next: { kind: 'stay' } },
          done: { body: [], next: { kind: 'stay' } },
        },
      },
    }
    const advance = (actorTemplateId: string, values: readonly number[]) => {
      const state = createBattleState({ players: [player(actorTemplateId)], enemies: [source] })
      const activation = expectDefined(beginEnemyHookActivation(state, 0, 'turnStart'))
      const draws = values.values()
      expect(nextEnemyHookStep(state, activation, () => expectDefined(draws.next().value))).toEqual(
        {
          kind: 'complete',
        },
      )
      expect(draws.next().done).toBe(true)
      return expectDefined(state.enemies[0]).hookCursors.turnStart
    }
    expect(advance('zhao-linger', [0.28])).toBe('explain')
    expect(advance('zhao-linger', [0.295])).toBe('done')
    expect(advance('li-xiaoyao', [])).toBe('a')
  })

  test('setFallback 按实例隔离，restart 提交 initial', () => {
    const spell = wfSkill()
    const fallback: EnemyFallback = {
      action: { kind: 'cast', skillId: spell.id },
      chancePercent: 40,
    }
    const source = wfEnemy('source')
    source.ai.hooks = {
      ready: {
        initial: 'a',
        states: {
          a: { body: [], next: { kind: 'advance', state: 'b' } },
          b: { body: [{ kind: 'setFallback', fallback }], next: { kind: 'restart' } },
        },
      },
    }
    const state = createBattleState({
      players: [player()],
      enemies: [source, source],
      skills: { [spell.id]: spell },
    })
    const first = expectDefined(state.enemies[0])
    const second = expectDefined(state.enemies[1])
    const advance = expectDefined(beginEnemyHookActivation(state, 0, 'ready'))
    expect(nextEnemyHookStep(state, advance, () => 0)).toEqual({ kind: 'complete' })
    expect(first.hookCursors.ready).toBe('b')

    const restart = expectDefined(beginEnemyHookActivation(state, 0, 'ready'))
    expect(nextEnemyHookStep(state, restart, () => 0)).toEqual({ kind: 'complete' })
    expect(first.hookCursors.ready).toBe('a')
    expect(second.hookCursors.ready).toBe('a')
    const instanceFallback = expectDefined(first.fallback)
    expect(instanceFallback).toEqual(fallback)
    expect(instanceFallback.action).not.toBe(fallback.action)
    expect(second.fallback).toBeUndefined()
    expect(source.ai.fallback).toBeUndefined()
  })
})
