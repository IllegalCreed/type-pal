import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  type ActorConditionCarrier,
  type ActorConditionSeed,
  applyActorCondition,
  applyActorConditionSeed,
  applyCarriedStatus,
  checkActorConditionSeedShape,
  clearActorCondition,
} from './actor-condition.js'
import type { PoisonDef } from './poison.js'

const poisons: Record<number, PoisonDef> = {
  551: { id: 551, name: '赤毒', curability: 'common', color: 16, counters: 552 },
  552: { id: 552, name: '尸毒', curability: 'common', color: 17, lethalWith: 553 },
  553: { id: 553, name: '瘴毒', curability: 'common', color: 18 },
}

function carrier(hp = 100): ActorConditionCarrier {
  return { hp }
}

describe('applyCarriedStatus', () => {
  test('坏状态已有时不刷新', () => {
    const target = carrier()
    target.extraStatuses = [{ status: 'confused', turns: 2 }]
    expect(applyCarriedStatus(target, 'confused', 7)).toBe(false)
    expect(target.extraStatuses).toEqual([{ status: 'confused', turns: 2 }])
  })

  test('好状态只施加给活人且取更长回合', () => {
    const target = carrier()
    target.extraStatuses = [{ status: 'protect', turns: 7 }]
    expect(applyCarriedStatus(target, 'protect', 3)).toBe(false)
    expect(applyCarriedStatus(target, 'protect', 9)).toBe(true)
    expect(target.extraStatuses).toEqual([{ status: 'protect', turns: 9 }])
    expect(applyCarriedStatus(carrier(0), 'protect', 7)).toBe(false)
  })

  test('rejects a zero duration before writing the carrier', () => {
    const target = carrier()
    expect(() => applyCarriedStatus(target, 'protect', 0)).toThrow(
      new Error('applyCarriedStatus.turns: 必须是正安全整数'),
    )
    expect(target).toEqual({ hp: 100 })
  })
})

describe('entry condition seed', () => {
  test('三种 carrier 一次性播种，毒统一从 tickIndex=0 开始', () => {
    const target = carrier()
    applyActorConditionSeed(
      target,
      {
        poisonIds: [551, 552],
        statuses: [
          { status: 'confused', turns: 3 },
          { status: 'protect', turns: 7 },
        ],
        poisonResistance: 120,
      },
      poisons,
    )
    expect(target).toEqual({
      hp: 100,
      poisons: [
        { poisonId: 551, tickIndex: 0 },
        { poisonId: 552, tickIndex: 0 },
      ],
      extraStatuses: [
        { status: 'confused', turns: 3 },
        { status: 'protect', turns: 7 },
      ],
      extraPoisonRes: 120,
    })
  })

  test.each([
    [{ poisonIds: [999] }, 'applyActorConditionSeed.poisonIds: 未知毒 999'],
    [{ poisonIds: [0] }, 'applyActorConditionSeed.poisonIds: 毒 id 必须是正安全整数'],
    [{ poisonIds: [551, 551] }, 'applyActorConditionSeed.poisonIds: 毒 551 重复'],
    [
      {
        statuses: [
          { status: 'protect' as const, turns: 1 },
          { status: 'protect' as const, turns: 2 },
        ],
      },
      'applyActorConditionSeed.statuses: 状态 protect 重复',
    ],
  ] satisfies [
    ActorConditionSeed,
    string,
  ][])('rejects an invalid seed before any carrier write %#', (input, message) => {
    const target = carrier()
    const seed = deepSnapshot(input)
    expect(() => applyActorConditionSeed(target, seed, poisons)).toThrow(new Error(message))
    expect(target).toEqual({ hp: 100 })
  })

  test('入口死亡角色拒绝好状态，并在任何 carrier 写入前 fail-loud', () => {
    const target = carrier(0)
    expect(() =>
      applyActorConditionSeed(
        target,
        {
          poisonIds: [551],
          statuses: [{ status: 'protect', turns: 7 }],
          poisonResistance: 20,
        },
        poisons,
      ),
    ).toThrow('死亡角色不能播种好状态 protect')
    expect(target).toEqual({ hp: 0 })
  })
})

describe('story condition operations', () => {
  test('剧情施毒必中，复用自毒相克/致死链', () => {
    const cured = carrier()
    cured.poisons = [{ poisonId: 552, tickIndex: 4 }]
    expect(applyActorCondition(cured, { kind: 'poison', poisonId: 551 }, poisons)).toBe(true)
    expect(cured.poisons).toEqual([])

    const lethal = carrier()
    lethal.poisons = [{ poisonId: 553, tickIndex: 0 }]
    expect(applyActorCondition(lethal, { kind: 'poison', poisonId: 552 }, poisons)).toBe(true)
    expect(lethal.hp).toBe(0)
    const alreadyDead = deepSnapshot(lethal)
    expect(applyActorCondition(lethal, { kind: 'poison', poisonId: 552 }, poisons)).toBe(false)
    expect(lethal).toEqual(alreadyDead)
  })

  test('reports an unknown poison before touching the target', () => {
    const target = carrier()
    expect(() => applyActorCondition(target, { kind: 'poison', poisonId: 999 }, poisons)).toThrow(
      new Error('applyActorCondition.poisonId: 未知毒 999'),
    )
    expect(target).toEqual({ hp: 100 })
  })

  test('a dead actor can receive a harmful status while a beneficial one is rejected', () => {
    const target = carrier(0)
    expect(
      applyActorCondition(target, { kind: 'status', status: 'protect', turns: 4 }, poisons),
    ).toBe(false)
    expect(target).toEqual({ hp: 0 })
    expect(
      applyActorCondition(target, { kind: 'status', status: 'confused', turns: 3 }, poisons),
    ).toBe(true)
    expect(target).toEqual({ hp: 0, extraStatuses: [{ status: 'confused', turns: 3 }] })
  })

  test('临时毒抗取高，三种 condition 可分别清除', () => {
    const target = carrier()
    target.poisons = [{ poisonId: 551, tickIndex: 2 }]
    target.extraStatuses = [{ status: 'protect', turns: 7 }]
    expect(applyActorCondition(target, { kind: 'poisonResistance', amount: 30 }, poisons)).toBe(
      true,
    )
    expect(target.extraPoisonRes).toBe(30)
    expect(applyActorCondition(target, { kind: 'poisonResistance', amount: 20 }, poisons)).toBe(
      false,
    )
    expect(applyActorCondition(target, { kind: 'poisonResistance', amount: 40 }, poisons)).toBe(
      true,
    )
    expect(target.extraPoisonRes).toBe(40)
    expect(clearActorCondition(target, { kind: 'poison', poisonId: 551 }, poisons)).toBe(true)
    expect(clearActorCondition(target, { kind: 'status', status: 'protect' }, poisons)).toBe(true)
    expect(clearActorCondition(target, { kind: 'poisonResistance' }, poisons)).toBe(true)
    expect(target).toEqual({ hp: 100, poisons: [], extraStatuses: [] })
  })
})

test('invalid seed resistance rejects before replacing existing poison or status carriers', () => {
  const target: ActorConditionCarrier = {
    hp: 100,
    poisons: [{ poisonId: 553, tickIndex: 5 }],
    extraStatuses: [{ status: 'sleep', turns: 4 }],
    extraPoisonRes: 20,
  }
  const before = deepSnapshot(target)
  const input = {
    poisonIds: [551, 553],
    statuses: [{ status: 'protect' as const, turns: 999 }],
    poisonResistance: 1,
  }
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
      { poisonId: 551, tickIndex: 0 },
      { poisonId: 553, tickIndex: 0 },
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
    { kind: 'poison', poisonId: 551 },
    { kind: 'poisonResistance' },
  ] as const) {
    expect(clearActorCondition(absent, condition, poisons)).toBe(false)
    expect(absent).toEqual({ hp: 100 })
  }
  expect(applyCarriedStatus(absent, 'sleep', 1)).toBe(true)
  expect(absent).toEqual({ hp: 100, extraStatuses: [{ status: 'sleep', turns: 1 }] })
})

test('poison add and selective clear preserve the other poison tick cursor', () => {
  const target: ActorConditionCarrier = { hp: 100, poisons: [{ poisonId: 553, tickIndex: 5 }] }
  const beforeDefs = deepSnapshot(poisons)
  expect(applyActorCondition(target, { kind: 'poison', poisonId: 551 }, poisons)).toBe(true)
  expect(target.poisons).toEqual([
    { poisonId: 553, tickIndex: 5 },
    { poisonId: 551, tickIndex: 0 },
  ])
  expect(applyActorCondition(target, { kind: 'poison', poisonId: 551 }, poisons)).toBe(false)
  expect(clearActorCondition(target, { kind: 'poison', poisonId: 551 }, poisons)).toBe(true)
  expect(target).toEqual({ hp: 100, poisons: [{ poisonId: 553, tickIndex: 5 }] })
  expect(clearActorCondition(target, { kind: 'poison', poisonId: 551 }, poisons)).toBe(false)
  expect(poisons).toEqual(beforeDefs)
})

test.each([0, -5])('rejects non-positive resistance %s without touching the carrier', (amount) => {
  const target = carrier()
  expect(() => applyActorCondition(target, { kind: 'poisonResistance', amount }, poisons)).toThrow(
    new Error('applyTemporaryPoisonResistance.amount: 必须是正安全整数'),
  )
  expect(target).toEqual({ hp: 100 })
})
