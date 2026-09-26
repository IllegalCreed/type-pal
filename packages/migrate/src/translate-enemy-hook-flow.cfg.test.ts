import { describe, expect, test } from 'vitest'
import { end, go, hookFixture, raw } from './__tests__/enemy-hook-fixtures.js'

describe('enemy hook CFG evidence', () => {
  test('shared target retains exact sorted closure and provenance while dead code is excluded', () => {
    const f = hookFixture({
      100: [raw(0x06, 50, 300), go(300)],
      300: [raw(0x67, 301, 5), end()],
      900: [raw(0xff), end()],
    })
    const result = f.run()
    expect(result.hooks?.ready).toEqual({
      initial: 'initial',
      states: {
        initial: {
          body: [],
          next: {
            kind: 'branch',
            cond: { kind: 'chance', percent: 49 },
            then: { kind: 'continue', state: 'state-L_101' },
            else: { kind: 'continue', state: 'state-L_300' },
          },
        },
        'state-L_101': { body: [], next: { kind: 'continue', state: 'state-L_300' } },
        'state-L_300': {
          body: [
            {
              kind: 'setFallback',
              fallback: { action: { kind: 'cast', skillId: '301' }, chancePercent: 50 },
            },
          ],
          next: { kind: 'stay' },
        },
      },
    })
    expect(result.hookSources?.ready).toEqual({
      rootAddress: 100,
      reachableSourceAddresses: [100, 101, 300, 301],
      sourceMappings: [
        { sourceAddress: 100, disposition: 'translated', targetSelectors: ['states.initial.next'] },
        {
          sourceAddress: 101,
          disposition: 'translated',
          targetSelectors: ['states.state-L_101.next'],
        },
        { sourceAddress: 300, disposition: 'translated', targetSelectors: ['states.state-L_300'] },
        {
          sourceAddress: 301,
          disposition: 'translated',
          targetSelectors: ['states.state-L_300.next'],
        },
      ],
    })
  })

  test('reset to another block advances and does not restart the root', () => {
    const result = hookFixture({ 100: [end({ reset: true, resetTo: 200 })], 200: [end()] }).ready()
    expect(result).toEqual({
      initial: 'initial',
      states: {
        initial: { body: [], next: { kind: 'advance', state: 'state-L_200' } },
        'state-L_200': { body: [], next: { kind: 'stay' } },
      },
    })
  })

  test('adjacent random leaders end their own blocks rather than duplicating the following body', () => {
    const result = hookFixture({ 100: [raw(0xa2, 2), raw(0x85, 2), raw(0x85, 3), end()] }).ready()
    expect(result.states).toEqual({
      initial: {
        body: [],
        next: {
          kind: 'random',
          choices: [
            { weight: 1, then: { kind: 'continue', state: 'state-L_101' } },
            { weight: 1, then: { kind: 'continue', state: 'state-L_102' } },
          ],
        },
      },
      'state-L_101': {
        body: [{ kind: 'wait', ms: 160 }],
        next: { kind: 'continue', state: 'state-L_102' },
      },
      'state-L_102': { body: [{ kind: 'wait', ms: 240 }], next: { kind: 'stay' } },
    })
  })

  test('first-of-kind retry is equivalent in the source ledger but retains its persistent scheduling boundary', () => {
    const result = hookFixture({
      100: [raw(0x91, 0), raw(0x06, 50, 0), end({ reset: true, resetTo: 100 })],
    }).run()
    expect(result.hookSources?.ready?.sourceMappings).toEqual([
      { sourceAddress: 100, disposition: 'translated', targetSelectors: ['states.initial.next'] },
      { sourceAddress: 101, disposition: 'equivalent', targetSelectors: ['states.state-L_101'] },
      {
        sourceAddress: 102,
        disposition: 'translated',
        targetSelectors: ['states.state-L_102.next'],
      },
    ])
    expect(result.hooks?.ready?.states['state-L_102']?.next).toEqual({ kind: 'restart' })
  })

  test('address callback wins over labels and fallback uses the nearest label when absent', () => {
    const indexed = hookFixture(
      { 100: [raw(0x85, 1), end()] },
      { sourceAddressAt: (_, idx) => 700 + idx * 3 },
    ).run()
    expect(indexed.hookSources?.ready?.reachableSourceAddresses).toEqual([700, 703])
    const fallback = hookFixture(
      { 100: [raw(0x85, 1), { ...end(), label: 'L_450' }] },
      { sourceAddressAt: undefined },
    ).run()
    expect(fallback.hookSources?.ready?.reachableSourceAddresses).toEqual([100, 450])
    expect(fallback.hooks?.ready).toEqual(indexed.hooks?.ready)
  })

  test('ready and turnStart compile independently without sharing flow objects', () => {
    const result = hookFixture({ 100: [raw(0x67, 301, 10), end()] }).run({
      ready: 100,
      turnStart: 100,
    })
    expect(result.hooks?.ready).toEqual(result.hooks?.turnStart)
    expect(result.hooks?.ready).not.toBe(result.hooks?.turnStart)
    expect(result.hookSources?.ready).toEqual(result.hookSources?.turnStart)
    expect(result.rules).toEqual([])
    expect(result.choreography).toEqual([])
    expect(result.pending).toEqual([])
  })
})
