import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  ACTOR_STATUS_DEFINITIONS,
  type ActorConditionSeed,
  CARRYABLE_STATUS_IDS,
  checkActorConditionCommandShape,
  checkActorConditionSeedShape,
  isCarryableStatusId,
} from './actor-condition.js'

const seed = (): ActorConditionSeed => ({
  poisonIds: [7, 8],
  statuses: [{ status: 'protect', turns: 999 }],
  poisonResistance: 1,
})

describe('actor condition registry', () => {
  test('全部 StatusId 只有傀儡不可作为大世界携带状态', () => {
    expect(CARRYABLE_STATUS_IDS).toEqual([
      'confused',
      'paralyzed',
      'sleep',
      'silence',
      'bravery',
      'protect',
      'haste',
      'dualAttack',
    ])
    expect(isCarryableStatusId('protect')).toBe(true)
    expect(isCarryableStatusId('puppet')).toBe(false)
    expect(ACTOR_STATUS_DEFINITIONS.protect.description).toContain('伤害减半')
  })
})

describe('actor condition shape guards', () => {
  test('rejects non-carryable status, oversized turns and private state fields', () => {
    expect(() =>
      checkActorConditionSeedShape({ statuses: [{ status: 'protect', turns: 1000 }] }, 'seed'),
    ).toThrow(new Error('seed.statuses[0].turns: 不得大于 999'))
    expect(() =>
      checkActorConditionSeedShape({ statuses: [{ status: 'puppet', turns: 1 }] }, 'seed'),
    ).toThrow(new Error('seed.statuses[0].status: 状态 puppet 不可携带'))
    expect(() => checkActorConditionSeedShape({ tickIndex: 3 }, 'seed')).toThrow(
      new Error('seed.tickIndex: 未知字段'),
    )
  })

  test('剧情命令完整覆盖 apply/clear 三类 condition 并拒绝多余字段', () => {
    const commands = [
      { kind: 'applyActorCondition', actor: 'hero', condition: { kind: 'poison', poisonId: 551 } },
      {
        kind: 'applyActorCondition',
        actor: 'hero',
        condition: { kind: 'status', status: 'protect', turns: 7 },
      },
      {
        kind: 'applyActorCondition',
        actor: 'hero',
        condition: { kind: 'poisonResistance', amount: 30 },
      },
      { kind: 'clearActorCondition', actor: 'hero', condition: { kind: 'poison', poisonId: 551 } },
      {
        kind: 'clearActorCondition',
        actor: 'hero',
        condition: { kind: 'status', status: 'protect' },
      },
      {
        kind: 'clearActorCondition',
        actor: 'hero',
        condition: { kind: 'poisonResistance' },
      },
    ]
    commands.forEach((command) =>
      expect(() => checkActorConditionCommandShape(command, 'cmd')).not.toThrow(),
    )
    expect(() =>
      checkActorConditionCommandShape(
        {
          kind: 'clearActorCondition',
          actor: 'hero',
          condition: { kind: 'poisonResistance', amount: 0 },
        },
        'cmd',
      ),
    ).toThrow(new Error('cmd.condition.amount: 未知字段'))
  })
})

test.each([
  ['root array', [], 'seed: 期望对象'],
  ['root null', null, 'seed: 期望对象'],
  ['poison list', { poisonIds: 7 }, 'seed.poisonIds: 期望毒 id 数组'],
  ['poison type', { poisonIds: ['7'] }, 'seed.poisonIds[0]: 期望正安全整数 PoisonDef.id'],
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
  expect(() => checkActorConditionSeedShape(invalid, 'seed')).toThrow(new Error(error))
  expect(invalid).toEqual(before)
})

test.each([
  ['wrong command', { kind: 'other' }, 'cmd.kind: 期望 applyActorCondition|clearActorCondition'],
  ['actor whitespace', { actor: ' hero ' }, 'cmd.actor: 期望非空且无首尾空格的稳定 id'],
  ['condition null', { condition: null }, 'cmd.condition: 期望对象'],
  [
    'poison zero',
    { condition: { kind: 'poison', poisonId: 0 } },
    'cmd.condition.poisonId: 期望正安全整数 PoisonDef.id',
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
  expect(() => checkActorConditionCommandShape(input, 'cmd')).toThrow(new Error(error))
  expect(input).toEqual(before)
})
