import { describe, expect, test } from 'vitest'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import { checkEnemyHookFlow, type EnemyHookFlow } from './enemy-script.js'

const hookFlow = () => ({
  initial: 'ready',
  states: { ready: { body: [], next: { kind: 'stay' } } },
})
describe('hook state shape', () => {
  test('accepts a stay state without copying or modifying the declared program', () => {
    const input = hookFlow()
    expectAcceptsUnchanged((value) => checkEnemyHookFlow(value, 'hook'), input)
  })
  test('states 空对象拒绝', () => {
    expect(() => checkEnemyHookFlow({ initial: 'x', states: {} }, 'hook')).toThrow(
      /hook\.states: 期望至少一个 state/,
    )
  })
  test('initial 未命中拒绝（未知 state）', () => {
    expect(() => checkEnemyHookFlow({ ...hookFlow(), initial: 'gone' }, 'hook')).toThrow(
      /hook\.initial: 未知 state gone/,
    )
  })
  test.each([undefined, {}])('rejects a missing or non-array state body %j', (body) => {
    const flow = {
      initial: 'ready',
      states: { ready: { body, next: { kind: 'stay' } } },
    }
    expect(() => checkEnemyHookFlow(flow, 'hook')).toThrow(
      /hook\.states\.ready\.body: 期望 EnemyHookCommand\[\]/,
    )
  })
})

function commandOutcomeFlow(): EnemyHookFlow {
  const flow: EnemyHookFlow = {
    initial: 'one',
    states: {
      one: {
        body: [
          { kind: 'effect', id: 'spawn', effect: { kind: 'summon', enemyId: 'friend', count: 1 } },
          { kind: 'setFallback', fallback: { action: { kind: 'pass' }, chancePercent: 0 } },
        ],
        next: {
          kind: 'commandOutcome',
          commandId: 'spawn',
          outcome: 'succeeded',
          then: { kind: 'advance', state: 'two' },
          else: { kind: 'random', choices: [{ weight: 1, then: { kind: 'stay' } }] },
        },
      },
      two: { body: [{ kind: 'wait', ms: 0 }], next: { kind: 'restart' } },
    },
  }
  checkEnemyHookFlow(flow, 'hook')
  return flow
}

test('hook rejects a forbidden effect kind even when the nested AI action itself is legal', () => {
  const flow = commandOutcomeFlow()
  const bad = {
    ...flow,
    states: {
      ...flow.states,
      one: {
        ...flow.states.one,
        body: [{ kind: 'effect', id: 'spawn', effect: { kind: 'attack' } }],
      },
    },
  }
  const before = deepSnapshot(bad)
  expectExactError(
    () => checkEnemyHookFlow(bad, 'hook'),
    'hook.states.one.body[0].effect.kind: effect 只允许 summon|transform|divide',
  )
  expect(bad).toEqual(before)
})

describe('hook command and transition contracts', () => {
  test('rejects the explicit attack fallback in a hook', () => {
    const ok = {
      initial: 'ready',
      states: {
        ready: {
          body: [{ kind: 'setFallback', fallback: { action: { kind: 'pass' }, chancePercent: 0 } }],
          next: { kind: 'stay' },
        },
      },
    }
    const okSnap = deepSnapshot(ok)
    checkEnemyHookFlow(ok, 'hook')
    expect(ok).toEqual(okSnap)
    const bad = {
      initial: 'ready',
      states: {
        ready: {
          body: [
            { kind: 'setFallback', fallback: { action: { kind: 'attack' }, chancePercent: 0 } },
          ],
          next: { kind: 'stay' },
        },
      },
    }
    const badSnap = deepSnapshot(bad)
    expectExactError(
      () => checkEnemyHookFlow(bad, 'hook'),
      'hook.states.ready.body[0].fallback.action.kind: fallback 只允许 cast|pass',
    )
    expect(bad).toEqual(badSnap)
  })
  test('setFallback 缺省正控与同 state effect id 重复拒绝', () => {
    expectAcceptsUnchanged((value) => checkEnemyHookFlow(value, 'hook'), {
      initial: 'ready',
      states: { ready: { body: [{ kind: 'setFallback' }], next: { kind: 'stay' } } },
    })
    const bad = {
      initial: 'ready',
      states: {
        ready: {
          body: [
            { kind: 'effect', id: 'spawn', effect: { kind: 'divide', copies: 1 } },
            { kind: 'effect', id: 'spawn', effect: { kind: 'divide', copies: 1 } },
          ],
          next: { kind: 'stay' },
        },
      },
    }
    const before = deepSnapshot(bad)
    expectExactError(
      () => checkEnemyHookFlow(bad, 'hook'),
      'hook.states.ready.body[1].id: 同一 state 内 effect id 重复 spawn',
    )
    expect(bad).toEqual(before)
  })

  test('branch 转移正控、commandOutcome outcome 叶与未知 transition 拒绝', () => {
    expectAcceptsUnchanged((value) => checkEnemyHookFlow(value, 'hook'), {
      initial: 'ready',
      states: {
        ready: {
          body: [],
          next: {
            kind: 'branch',
            cond: { kind: 'chance', percent: 50 },
            then: { kind: 'stay' },
            else: { kind: 'restart' },
          },
        },
      },
    })
    const badOutcome = {
      initial: 'ready',
      states: {
        ready: {
          body: [
            { kind: 'effect', id: 'spawn', effect: { kind: 'summon', enemyId: 'e', count: 1 } },
          ],
          next: {
            kind: 'commandOutcome',
            commandId: 'spawn',
            outcome: 'always',
            then: { kind: 'stay' },
            else: { kind: 'stay' },
          },
        },
      },
    }
    const outcomeBefore = deepSnapshot(badOutcome)
    expectExactError(
      () => checkEnemyHookFlow(badOutcome, 'hook'),
      'hook.states.ready.next.outcome: 期望 succeeded|failed',
    )
    expect(badOutcome).toEqual(outcomeBefore)
    const badTransition = {
      initial: 'ready',
      states: { ready: { body: [], next: { kind: 'teleport' } } },
    }
    const transitionBefore = deepSnapshot(badTransition)
    expectExactError(
      () => checkEnemyHookFlow(badTransition, 'hook'),
      'hook.states.ready.next.kind: 未知敌人 hook transition teleport',
    )
    expect(badTransition).toEqual(transitionBefore)
  })

  test('同一同步路径双 terminal 拒绝（单 state 内）', () => {
    const bad = {
      initial: 'ready',
      states: {
        ready: {
          body: [{ kind: 'fleeBattle' }, { kind: 'endBattle', result: 'terminate' }],
          next: { kind: 'stay' },
        },
      },
    }
    const before = deepSnapshot(bad)
    expectExactError(
      () => checkEnemyHookFlow(bad, 'hook'),
      'hook.states.ready.body: 同一激活路径 terminal action 不得超过一个',
    )
    expect(bad).toEqual(before)
  })
})
