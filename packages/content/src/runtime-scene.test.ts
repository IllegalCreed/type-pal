import { describe, expect, test } from 'vitest'
import { checkRuntimeHostileBehavior, checkPositiveSafeInt } from './runtime-scene.js'

const base = {
  enemyTeamId: 'team-3',
  onVictory: { kind: 'hide' as const, ticks: 800 },
  onPlayerFlee: { kind: 'suspend' as const, ticks: 15 },
}

describe('current hostile policy', () => {
  test('accepts the explicit victory and flee policies', () => {
    expect(() => checkRuntimeHostileBehavior(base)).not.toThrow()
    expect(() =>
      checkRuntimeHostileBehavior({
        ...base,
        onVictory: { kind: 'remove' },
        onPlayerFlee: { kind: 'remain' },
      }),
    ).not.toThrow()
  })

  test('rejects legacy respawn/success fields and missing policies', () => {
    expect(() => checkRuntimeHostileBehavior({ ...base, respawnSeconds: 80 })).toThrow(/未知字段/)
    expect(() => checkRuntimeHostileBehavior({ ...base, success: 'hide' })).toThrow(/未知字段/)
    const { onVictory: _onVictory, ...missingVictory } = base
    expect(() => checkRuntimeHostileBehavior(missingVictory)).toThrow(/缺键 "onVictory"/)
  })

  test.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '15'])('rejects bad ticks %s', (ticks) => {
    expect(() => checkPositiveSafeInt(ticks, 'ticks')).toThrow(/正安全整数/)
  })

  test('rejects polluted discriminants and malformed chase', () => {
    expect(() =>
      checkRuntimeHostileBehavior({
        ...base,
        onVictory: { kind: 'hide', ticks: 800, extra: true },
      }),
    ).toThrow(/未知字段/)
    expect(() =>
      checkRuntimeHostileBehavior({ ...base, onPlayerFlee: { kind: 'suspend', ticks: 0 } }),
    ).toThrow(/正安全整数/)
    expect(() => checkRuntimeHostileBehavior({ ...base, chase: { range: 3, speed: 0 } })).toThrow(
      /chase.speed/,
    )
  })

  test('recursively validates the defeat arm instead of accepting legacy vanish', () => {
    expect(() =>
      checkRuntimeHostileBehavior({
        ...base,
        onLose: [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'x', is: true },
            then: [{ kind: 'vanishEntity' }],
          },
        ],
      }),
    ).toThrow(/禁止 vanishEntity/)
  })
})
