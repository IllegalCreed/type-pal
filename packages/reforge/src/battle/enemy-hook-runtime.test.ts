import type { EnemyDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { type CreatePlayerInput, createBattleState } from './battle-core.js'
import { beginEnemyHookActivation, nextEnemyHookStep } from './enemy-hook-runtime.js'

function player(): CreatePlayerInput {
  return {
    roleId: 'ling-instance',
    actorTemplateId: 'zhao-linger',
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    attackStrength: 20,
    defense: 20,
    magicStrength: 20,
    baseDexterity: 20,
    skills: [],
    fleeRate: 20,
  }
}

function enemy(id: string): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: `battle-sprite.${id}`,
    yPosOffset: 0,
    stats: {
      health: 100,
      level: 1,
      exp: 0,
      cash: 0,
      attackStrength: 1,
      magicStrength: 1,
      defense: 1,
      dexterity: 1,
      fleeRate: 1,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: { resistanceToSorcery: 0 },
    sounds: {},
  }
}

describe('enemy hook runtime', () => {
  test('continue 同 activation 执行，advance 只在结束时提交 cursor', () => {
    const source = enemy('source')
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
    const activation = beginEnemyHookActivation(state, 0, 'ready')!
    expect(nextEnemyHookStep(state, activation, () => 0)).toEqual({
      kind: 'action',
      action: { kind: 'playSound', asset: 'sound.a' },
    })
    expect(state.enemies[0]!.hookCursors.ready).toBe('a')
    expect(nextEnemyHookStep(state, activation, () => 0)).toEqual({
      kind: 'action',
      action: { kind: 'wait', ms: 80 },
    })
    expect(nextEnemyHookStep(state, activation, () => 0)).toEqual({ kind: 'complete' })
    expect(state.enemies[0]!.hookCursors.ready).toBe('done')
  })

  test('effect outcome 吃真实 summon 结果并驱动 retry/advance', () => {
    const source = enemy('source')
    const minion = enemy('minion')
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
    const activation = beginEnemyHookActivation(state, 0, 'ready')!
    expect(nextEnemyHookStep(state, activation, () => 0)).toMatchObject({
      kind: 'effect',
      commandId: 'spawn',
      result: { outcome: 'succeeded', spawnedIdxs: [1] },
    })
    expect(nextEnemyHookStep(state, activation, () => 0)).toEqual({ kind: 'complete' })
    expect(state.enemies[0]!.hookCursors.ready).toBe('done')

    const full = createBattleState({
      players: [player()],
      enemies: [source, enemy('b'), enemy('c'), enemy('d'), enemy('e')],
      enemiesById: { minion },
    })
    const retry = beginEnemyHookActivation(full, 0, 'ready')!
    expect(nextEnemyHookStep(full, retry, () => 0)).toMatchObject({
      kind: 'effect',
      result: { outcome: 'failed' },
    })
    expect(nextEnemyHookStep(full, retry, () => 0)).toEqual({ kind: 'complete' })
    expect(full.enemies[0]!.hookCursors.ready).toBe('summon')
  })

  test('branch 只在经过时消费 RNG，random 恰好单抽并按权重选臂', () => {
    const source = enemy('source')
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
    const state = createBattleState({ players: [player()], enemies: [source] })
    let calls = 0
    const activation = beginEnemyHookActivation(state, 0, 'turnStart')!
    expect(
      nextEnemyHookStep(state, activation, () => {
        calls += 1
        return 0.28
      }),
    ).toEqual({ kind: 'complete' })
    expect(calls).toBe(1)
    expect(state.enemies[0]!.hookCursors.turnStart).toBe('explain')
  })

  test('setFallback 按实例隔离，restart 提交 initial', () => {
    const source = enemy('source')
    source.ai.hooks = {
      ready: {
        initial: 'a',
        states: {
          a: {
            body: [
              {
                kind: 'setFallback',
                fallback: {
                  action: { kind: 'cast', skillId: 'new-magic' },
                  chancePercent: 40,
                },
              },
            ],
            next: { kind: 'restart' },
          },
        },
      },
    }
    const state = createBattleState({ players: [player()], enemies: [source, source] })
    const activation = beginEnemyHookActivation(state, 0, 'ready')!
    expect(nextEnemyHookStep(state, activation, () => 0)).toEqual({ kind: 'complete' })
    expect(state.enemies[0]!.fallback).toEqual({
      action: { kind: 'cast', skillId: 'new-magic' },
      chancePercent: 40,
    })
    expect(state.enemies[1]!.fallback).toBeUndefined()
    expect(state.enemies[0]!.hookCursors.ready).toBe('a')
  })
})
