import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  checkPositiveSafeInt,
  checkRuntimeHostileBehavior,
  type RuntimeHostileBehavior,
} from './runtime-scene.js'

function hostilePolicy() {
  return {
    enemyTeamId: 'patrol',
    onVictory: { kind: 'hide', ticks: 800 },
    onPlayerFlee: { kind: 'suspend', ticks: 15 },
  } satisfies RuntimeHostileBehavior
}

test('preserves explicit victory and flee policies, transitions and legal zero values', () => {
  const timed = hostilePolicy()
  const policies = [
    timed,
    {
      ...timed,
      onVictory: { kind: 'remove' },
      onPlayerFlee: { kind: 'remain' },
      victoryTransition: 'direct',
    },
    {
      ...timed,
      battleFieldId: 0,
      onLose: 'gameOver',
      chase: { range: 0, speed: 0.5, floating: false },
      victoryTransition: 'fade',
    },
  ] satisfies RuntimeHostileBehavior[]
  const before = deepSnapshot(policies)
  for (const policy of policies) checkRuntimeHostileBehavior(policy)
  expect(policies).toEqual(before)
})

const invalidPolicies: { label: string; patch: Record<string, unknown>; message: string }[] = [
  {
    label: 'legacy respawn settings',
    patch: { respawnSeconds: 80 },
    message: 'hostile.respawnSeconds: 未知字段',
  },
  {
    label: 'legacy victory settings',
    patch: { success: 'hide' },
    message: 'hostile.success: 未知字段',
  },
  {
    label: 'a missing victory policy',
    patch: { onVictory: undefined },
    message: 'hostile: 缺键 "onVictory"',
  },
  {
    label: 'a missing flee policy',
    patch: { onPlayerFlee: undefined },
    message: 'hostile: 缺键 "onPlayerFlee"',
  },
  {
    label: 'an unknown victory policy',
    patch: { onVictory: { kind: 'explode' } },
    message: 'hostile.onVictory.kind: 期望 hide|remove|remain',
  },
  {
    label: 'an unknown flee policy',
    patch: { onPlayerFlee: { kind: 'explode' } },
    message: 'hostile.onPlayerFlee.kind: 期望 suspend|remain',
  },
  {
    label: 'an unknown victory transition',
    patch: { victoryTransition: 'black' },
    message: 'hostile.victoryTransition: 期望 direct|fade',
  },
  {
    label: 'an unknown hide field',
    patch: { onVictory: { kind: 'hide', ticks: 800, extra: true } },
    message: 'hostile.onVictory.extra: 未知字段',
  },
  {
    label: 'zero suspend ticks',
    patch: { onPlayerFlee: { kind: 'suspend', ticks: 0 } },
    message: 'hostile.onPlayerFlee.ticks: 期望正安全整数',
  },
  {
    label: 'negative chase range',
    patch: { chase: { range: -1, speed: 1 } },
    message: 'hostile.chase.range: 期望非负有限数',
  },
  {
    label: 'zero chase speed',
    patch: { chase: { range: 0, speed: 0 } },
    message: 'hostile.chase.speed: 期望正有限数',
  },
  {
    label: 'a non-boolean floating flag',
    patch: { chase: { range: 0, speed: 0.5, floating: 0 } },
    message: 'hostile.chase.floating: 期望 boolean',
  },
  {
    label: 'an empty enemy team ID',
    patch: { enemyTeamId: '' },
    message: 'hostile.enemyTeamId: 期望非空字符串',
  },
  {
    label: 'a fractional battlefield ID',
    patch: { battleFieldId: 0.5 },
    message: 'hostile.battleFieldId: 期望非负安全整数',
  },
]

test.each(invalidPolicies)('rejects $label', ({ patch, message }) => {
  const input = { ...hostilePolicy(), ...patch }
  const before = deepSnapshot(input)
  expect(() => checkRuntimeHostileBehavior(input)).toThrow(new Error(message))
  expect(input).toEqual(before)
})

test('rejects a null hostile definition at its root', () => {
  expect(() => checkRuntimeHostileBehavior(null)).toThrow(new Error('hostile: 期望对象'))
})

test.each([
  0,
  -1,
  1.5,
  Number.MAX_SAFE_INTEGER + 1,
  '15',
])('rejects invalid tick count %j', (ticks) => {
  expect(() => checkPositiveSafeInt(ticks, 'ticks')).toThrow(new Error('ticks: 期望正安全整数'))
})

test('checks nested defeat commands and rejects retired or unknown kinds at their location', () => {
  const condition = { kind: 'flag', flag: 'defeated', is: true }
  const input = {
    ...hostilePolicy(),
    onLose: [{ kind: 'branch', cond: condition, then: [{ kind: 'vanishEntity' }] }],
  }
  expect(() => checkRuntimeHostileBehavior(input)).toThrow(
    new Error('hostile.onLose[0].then[0].kind: current 禁止 vanishEntity；请使用显式生命周期命令'),
  )
  expect(() =>
    checkRuntimeHostileBehavior({ ...hostilePolicy(), onLose: [{ kind: 'unrecognized' }] }),
  ).toThrow(new Error('hostile.onLose[0].kind: 未知或已退役的 current 命令 unrecognized'))
})
