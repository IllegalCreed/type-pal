import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import {
  type ActorConditionCarrier,
  type ActorConditionSeed,
  applyActorCondition,
  applyActorConditionSeed,
  applyCarriedStatus,
  checkActorConditionCommandShape,
  checkActorConditionSeedShape,
  clearActorCondition,
} from './actor-condition.js'
import type { PoisonDef } from './poison.js'

const poisons: Record<number, PoisonDef> = {
  7: { id: 7, name: 'poison.red', curability: 'common', color: 16 },
  8: { id: 8, name: 'poison.blue', curability: 'common', color: 17 },
}
const seed = (): ActorConditionSeed => ({
  poisonIds: [7, 8],
  statuses: [{ status: 'protect', turns: 999 }],
  poisonResistance: 1,
})

test.each([
  ['root array', [], 'seed: 期望对象'],
  ['root null', null, 'seed: 期望对象'],
  ['poison list', { poisonIds: 7 }, 'seed.poisonIds: 期望毒 id 数组'],
  ['poison type', { poisonIds: ['7'] }, 'seed.poisonIds[0]: 期望正安全整数'],
  ['poison duplicate', { poisonIds: [7, 7] }, 'seed.poisonIds[1]: 毒 7 重复'],
  ['status list', { statuses: {} }, 'seed.statuses: 期望定时状态数组'],
  ['status record', { statuses: [null] }, 'seed.statuses[0]: 期望对象'],
  [
    'status duplicate',
    {
      statuses: [
        { status: 'sleep', turns: 1 },
        { status: 'sleep', turns: 2 },
      ],
    },
    'seed.statuses[1].status: 状态 sleep 重复',
  ],
  ['fractional resistance', { poisonResistance: 1.5 }, 'seed.poisonResistance: 必须是正安全整数'],
  ['unsafe resistance', { poisonResistance: 2 ** 53 }, 'seed.poisonResistance: 必须是正安全整数'],
] as const)('condition seed rejects %s without rewriting its input', (_label, invalid, error) => {
  const positive = seed()
  const beforePositive = deepSnapshot(positive)
  expect(checkActorConditionSeedShape(positive, 'seed')).toBe(positive)
  expect(positive).toEqual(beforePositive)
  const before = deepSnapshot(invalid)
  expect(() => checkActorConditionSeedShape(invalid, 'seed')).toThrow(error)
  expect(invalid).toEqual(before)
})

test.each([
  ['wrong command', { kind: 'other' }, 'cmd.kind: 期望 applyActorCondition|clearActorCondition'],
  ['actor whitespace', { actor: ' hero ' }, 'cmd.actor: 期望非空'],
  ['condition null', { condition: null }, 'cmd.condition: 期望对象'],
  [
    'poison zero',
    { condition: { kind: 'poison', poisonId: 0 } },
    'cmd.condition.poisonId: 期望正安全整数',
  ],
  [
    'uncarryable status',
    { condition: { kind: 'status', status: 'puppet', turns: 1 } },
    'cmd.condition.status: 状态 puppet 不可携带',
  ],
  ['unknown condition', { condition: { kind: 'other' } }, 'cmd.condition.kind: 未知角色状态 other'],
] as const)('condition command rejects %s at the exact boundary', (_label, override, error) => {
  const valid = {
    kind: 'applyActorCondition',
    actor: 'hero',
    condition: { kind: 'status', status: 'sleep', turns: 1 },
  }
  expect(() => checkActorConditionCommandShape(valid, 'cmd')).not.toThrow()
  const input = { ...valid, ...override }
  const before = deepSnapshot(input)
  expect(() => checkActorConditionCommandShape(input, 'cmd')).toThrow(error)
  expect(input).toEqual(before)
})

test('invalid seed resistance rejects before replacing existing poison or status carriers', () => {
  const target: ActorConditionCarrier = {
    hp: 100,
    poisons: [{ poisonId: 8, tickIndex: 5 }],
    extraStatuses: [{ status: 'sleep', turns: 4 }],
    extraPoisonRes: 20,
  }
  const before = deepSnapshot(target)
  const input = seed()
  checkActorConditionSeedShape(input, 'seed')
  input.poisonResistance = 0 // One invalid runtime input axis, not a valid author seed.
  expect(() => applyActorConditionSeed(target, input, poisons)).toThrow(
    'applyActorConditionSeed.poisonResistance',
  )
  expect(target).toEqual(before)
  input.poisonResistance = 30
  applyActorConditionSeed(target, input, poisons)
  expect(target).toEqual({
    hp: 100,
    poisons: [
      { poisonId: 7, tickIndex: 0 },
      { poisonId: 8, tickIndex: 0 },
    ],
    extraStatuses: [
      { status: 'sleep', turns: 4 },
      { status: 'protect', turns: 999 },
    ],
    extraPoisonRes: 30,
  })
})

test('status refresh preserves unrelated entries and clearing is idempotent without materializing absent fields', () => {
  const target: ActorConditionCarrier = {
    hp: 100,
    extraStatuses: [
      { status: 'sleep', turns: 4 },
      { status: 'protect', turns: 2 },
    ],
  }
  expect(
    applyActorCondition(target, { kind: 'status', status: 'protect', turns: 7 }, poisons),
  ).toBe(true)
  expect(target.extraStatuses).toEqual([
    { status: 'sleep', turns: 4 },
    { status: 'protect', turns: 7 },
  ])
  expect(clearActorCondition(target, { kind: 'status', status: 'protect' }, poisons)).toBe(true)
  expect(target.extraStatuses).toEqual([{ status: 'sleep', turns: 4 }])
  expect(clearActorCondition(target, { kind: 'status', status: 'protect' }, poisons)).toBe(false)
  const absent: ActorConditionCarrier = { hp: 100 }
  for (const condition of [
    { kind: 'status', status: 'protect' },
    { kind: 'poison', poisonId: 7 },
    { kind: 'poisonResistance' },
  ] as const) {
    expect(clearActorCondition(absent, condition, poisons)).toBe(false)
    expect(absent).toEqual({ hp: 100 })
  }
  expect(applyCarriedStatus(absent, 'sleep', 1)).toBe(true)
  expect(absent).toEqual({ hp: 100, extraStatuses: [{ status: 'sleep', turns: 1 }] })
})

test('poison add and selective clear preserve the other poison tick cursor', () => {
  const target: ActorConditionCarrier = { hp: 100, poisons: [{ poisonId: 8, tickIndex: 5 }] }
  const beforeDefs = deepSnapshot(poisons)
  expect(applyActorCondition(target, { kind: 'poison', poisonId: 7 }, poisons)).toBe(true)
  expect(target.poisons).toEqual([
    { poisonId: 8, tickIndex: 5 },
    { poisonId: 7, tickIndex: 0 },
  ])
  expect(applyActorCondition(target, { kind: 'poison', poisonId: 7 }, poisons)).toBe(false)
  expect(clearActorCondition(target, { kind: 'poison', poisonId: 7 }, poisons)).toBe(true)
  expect(target).toEqual({ hp: 100, poisons: [{ poisonId: 8, tickIndex: 5 }] })
  expect(clearActorCondition(target, { kind: 'poison', poisonId: 7 }, poisons)).toBe(false)
  expect(poisons).toEqual(beforeDefs)
})
