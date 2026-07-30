import { describe, expect, test } from 'vitest'
import { validateEnemies } from './validate.js'

function enemy(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'enemy-test',
    name: 'name.enemy-test',
    battleSprite: 'battle-sprite-test',
    yPosOffset: 0,
    stats: {},
    ai: {
      resistanceToSorcery: 0,
      fallback: {
        action: { kind: 'cast', skillId: 'skill-test' },
        chancePercent: 35,
      },
      hooks: {
        ready: {
          initial: 'summon',
          states: {
            summon: {
              body: [
                {
                  kind: 'effect',
                  id: 'summon-minion',
                  effect: { kind: 'summon', enemyId: 'enemy-minion', count: 1 },
                },
              ],
              next: {
                kind: 'commandOutcome',
                commandId: 'summon-minion',
                outcome: 'succeeded',
                then: { kind: 'advance', state: 'done' },
                else: { kind: 'stay' },
              },
            },
            done: {
              body: [{ kind: 'playSound', asset: 'sound.done' }],
              next: { kind: 'stay' },
            },
          },
        },
      },
    },
    sounds: {},
    choreography: [
      {
        at: 'turnStart',
        once: true,
        body: [
          {
            kind: 'applyActorGrowth',
            actor: 'zhao-linger',
            delta: {
              level: 11,
              maxHP: 170,
              maxMP: 190,
              attack: 100,
              magicAttack: 155,
              defense: 55,
              speed: 80,
              luck: 30,
            },
          },
          {
            kind: 'playActorCastEffect',
            actor: 'zhao-linger',
            effect: 'pre-magic-white-flash',
          },
        ],
      },
    ],
    onDefeated: [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'boss-ready', is: true },
        then: [{ kind: 'giveItem', itemId: 'item-reward' }],
        else: [{ kind: 'stopScript' }],
      },
    ],
    ...over,
  }
}

describe('contentVersion 10 enemy script schema', () => {
  test('接受具名 hook state、真实 effect outcome、battle action 与受限 onDefeated', () => {
    expect(validateEnemies([enemy()])).toHaveLength(1)
  })

  test('法术抗性接受完全免疫值 10，拒绝越界值与非整数', () => {
    expect(
      validateEnemies([
        enemy({
          ai: { resistanceToSorcery: 10 },
        }),
      ]),
    ).toHaveLength(1)
    expect(() =>
      validateEnemies([
        enemy({
          ai: { resistanceToSorcery: 11 },
        }),
      ]),
    ).toThrow(/0\.\.10 整数/)
    expect(() =>
      validateEnemies([
        enemy({
          ai: { resistanceToSorcery: 9.5 },
        }),
      ]),
    ).toThrow(/0\.\.10 整数/)
  })

  test('拒绝悬空 state、跨 state effect id 与未知字段', () => {
    const source = enemy()
    const ai = source.ai as Record<string, unknown>
    const hooks = ai.hooks as Record<string, unknown>
    const ready = hooks.ready as Record<string, unknown>
    const states = ready.states as Record<string, Record<string, unknown>>
    states.summon!.next = { kind: 'advance', state: 'missing' }
    expect(() => validateEnemies([source])).toThrow(/未知 state missing/)

    const crossState = enemy()
    const crossAi = crossState.ai as Record<string, unknown>
    const crossHooks = crossAi.hooks as Record<string, unknown>
    const crossReady = crossHooks.ready as Record<string, unknown>
    const crossStates = crossReady.states as Record<string, Record<string, unknown>>
    crossStates.done!.next = {
      kind: 'commandOutcome',
      commandId: 'summon-minion',
      outcome: 'failed',
      then: { kind: 'stay' },
      else: { kind: 'stay' },
    }
    expect(() => validateEnemies([crossState])).toThrow(/同 state 顶层 effect id/)

    expect(() =>
      validateEnemies([
        enemy({
          ai: { resistanceToSorcery: 0, accidentalLegacyField: true },
        }),
      ]),
    ).toThrow(/accidentalLegacyField: 未知字段/)
  })

  test('拒绝空 random、非正权重、continue SCC 与过长同步 closure', () => {
    const withNext = (next: unknown): Record<string, unknown> =>
      enemy({
        ai: {
          resistanceToSorcery: 0,
          hooks: {
            ready: {
              initial: 'a',
              states: { a: { body: [], next } },
            },
          },
        },
      })
    expect(() => validateEnemies([withNext({ kind: 'random', choices: [] })])).toThrow(
      /非空 random/,
    )
    expect(() =>
      validateEnemies([
        withNext({
          kind: 'random',
          choices: [{ weight: 0, then: { kind: 'stay' } }],
        }),
      ]),
    ).toThrow(/正整数/)
    expect(() => validateEnemies([withNext({ kind: 'continue', state: 'a' })])).toThrow(
      /无调度边界循环/,
    )

    const states: Record<string, unknown> = {}
    for (let index = 0; index < 65; index += 1)
      states[`s${index}`] = {
        body: [],
        next: index === 64 ? { kind: 'stay' } : { kind: 'continue', state: `s${index + 1}` },
      }
    expect(() =>
      validateEnemies([
        enemy({
          ai: {
            resistanceToSorcery: 0,
            hooks: { ready: { initial: 's0', states } },
          },
        }),
      ]),
    ).toThrow(/超过 64 步/)
  })

  test('拒绝同一同步路径上的多个 terminal action', () => {
    expect(() =>
      validateEnemies([
        enemy({
          ai: {
            resistanceToSorcery: 0,
            hooks: {
              turnStart: {
                initial: 'a',
                states: {
                  a: {
                    body: [{ kind: 'fleeBattle' }],
                    next: { kind: 'continue', state: 'b' },
                  },
                  b: {
                    body: [{ kind: 'endBattle', result: 'terminate' }],
                    next: { kind: 'stay' },
                  },
                },
              },
            },
          },
        }),
      ]),
    ).toThrow(/terminal action 超过一个/)
  })

  test('battle choreography 与 onDefeated 都拒绝宽泛世界命令', () => {
    expect(() =>
      validateEnemies([
        enemy({
          choreography: [
            {
              at: 'battleStart',
              body: [{ kind: 'giveItem', itemId: 'forbidden' }],
            },
          ],
        }),
      ]),
    ).toThrow(/battle context 不支持动作/)
    expect(() =>
      validateEnemies([
        enemy({
          onDefeated: [{ kind: 'startBattle', team: 1 }],
        }),
      ]),
    ).toThrow(/onDefeated context 不支持命令/)
  })
})
