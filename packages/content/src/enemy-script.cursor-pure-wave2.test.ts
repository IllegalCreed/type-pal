/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C2：hook setFallback 仍走 checkEnemyFallback。
 * 直接 checkEnemyFallback 与缺省 fallback 已由 wave2 / residual 证明。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-pure-wave2-fixtures.js'
import { expectExactError } from './__tests__/guard-leaf-fixtures.js'
import { checkEnemyHookFlow } from './enemy-script.js'

describe('C2 enemy-script 剩余合同', () => {
  test('hook setFallback 只许 pass；attack 精确拒绝且流不变', () => {
    const ok = {
      initial: 'ready',
      states: {
        ready: {
          body: [{ kind: 'setFallback', fallback: { action: { kind: 'pass' }, chancePercent: 0 } }],
          next: { kind: 'stay' },
        },
      },
    }
    const okSnap = inputSnap(ok)
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
    const badSnap = inputSnap(bad)
    expectExactError(
      () => checkEnemyHookFlow(bad, 'hook'),
      'hook.states.ready.body[0].fallback.action.kind: fallback 只允许 cast|pass',
    )
    expect(bad).toEqual(badSnap)
  })
})
