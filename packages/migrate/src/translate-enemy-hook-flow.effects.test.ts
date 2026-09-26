import { describe, expect, test } from 'vitest'
import { end, hookFixture, raw } from './__tests__/enemy-hook-fixtures.js'

describe('enemy hook effect boundaries', () => {
  test('divide failure uses the effect identity and preserves both exact continuations', () => {
    const result = hookFixture({
      100: [raw(0x9c, 2, 200), end()],
      200: [raw(0x67, 0), end()],
    }).run()
    expect(result.hooks?.ready?.states.initial).toEqual({
      body: [{ kind: 'effect', id: 'effect-100', effect: { kind: 'divide', copies: 2 } }],
      next: {
        kind: 'commandOutcome',
        commandId: 'effect-100',
        outcome: 'succeeded',
        then: { kind: 'continue', state: 'state-L_101' },
        else: { kind: 'continue', state: 'state-L_200' },
      },
    })
    expect(result.hooks?.ready?.states['state-L_200']).toEqual({
      body: [{ kind: 'setFallback' }],
      next: { kind: 'stay' },
    })
    expect(result.hookSources?.ready?.sourceMappings[0]).toEqual({
      sourceAddress: 100,
      disposition: 'translated',
      targetSelectors: ['states.initial', 'states.initial.next'],
    })
  })

  test('self summon sentinels and signed counts do not manufacture an enemy reference', () => {
    expect(
      hookFixture({
        100: [
          raw(0x9e, 0, 2, 0),
          raw(0x9e, 65535, 65535, 0),
          raw(0x9c, 0, 0),
          raw(0x9f, 441),
          end(),
        ],
      }).ready().states.initial?.body,
    ).toEqual([
      { kind: 'effect', id: 'effect-100', effect: { kind: 'summon', count: 2 } },
      { kind: 'effect', id: 'effect-101', effect: { kind: 'summon', count: 1 } },
      { kind: 'effect', id: 'effect-102', effect: { kind: 'divide', copies: 1 } },
      { kind: 'effect', id: 'effect-103', effect: { kind: 'transform', enemyId: 'enemy-441' } },
    ])
  })

  test('fallback clearing, pass and cast retain their distinct default probabilities', () => {
    expect(
      hookFixture({
        100: [raw(0x67, 0, 0), raw(0x67, 65535, 0), raw(0x67, 321, 15), end()],
      }).ready().states.initial?.body,
    ).toEqual([
      { kind: 'setFallback' },
      { kind: 'setFallback', fallback: { action: { kind: 'pass' }, chancePercent: 100 } },
      {
        kind: 'setFallback',
        fallback: { action: { kind: 'cast', skillId: '321' }, chancePercent: 100 },
      },
    ])
    // Enemy-table rate=0 means zero, unlike opcode 0x67 rate=0's default 100.
    expect(hookFixture({}).run({}, { magic: 65535, rate: 0 }).fallback).toEqual({
      action: { kind: 'pass' },
      chancePercent: 0,
    })
    expect(hookFixture({}).run({}, { magic: 0, rate: 9 }).fallback).toBeUndefined()
    expect(hookFixture({}).run({}, { magic: 321, rate: 15 }).fallback).toEqual({
      action: { kind: 'cast', skillId: '321' },
      chancePercent: 100,
    })
  })

  test.each([
    [3, 'won'],
    [1, 'lost'],
    [0, 'terminate'],
  ] as const)('battle result %i produces exactly %s', (code, result) => {
    expect(hookFixture({ 100: [raw(0x89, code), end()] }).ready().states.initial?.body).toEqual([
      { kind: 'endBattle', result },
    ])
  })

  test('flee is terminal and the wrapper rejects a second terminal on the same path', () => {
    expect(hookFixture({ 100: [raw(0x69), end()] }).ready().states.initial?.body).toEqual([
      { kind: 'fleeBattle' },
    ])
    expect(() => hookFixture({ 100: [raw(0x69), raw(0x89, 3), end()] }).run()).toThrow(
      '同一激活路径 terminal action 不得超过一个',
    )
  })
})
