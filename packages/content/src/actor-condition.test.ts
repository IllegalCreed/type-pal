import { describe, expect, test } from 'vitest'
import {
  ACTOR_STATUS_DEFINITIONS,
  type ActorConditionCarrier,
  applyActorCondition,
  applyActorConditionSeed,
  applyCarriedStatus,
  checkActorConditionCommandShape,
  checkActorConditionSeedShape,
  clearActorCondition,
  isCarryableStatusId,
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

describe('actor condition registry', () => {
  test('全部 StatusId 只有傀儡不可作为大世界携带状态', () => {
    expect(Object.keys(ACTOR_STATUS_DEFINITIONS)).toHaveLength(9)
    expect(isCarryableStatusId('protect')).toBe(true)
    expect(isCarryableStatusId('puppet')).toBe(false)
    expect(ACTOR_STATUS_DEFINITIONS.protect.description).toContain('伤害减半')
  })
})

describe('actor condition shape guards', () => {
  test('快照拒绝重复、傀儡、超界回合与内部字段', () => {
    expect(() =>
      checkActorConditionSeedShape({ statuses: [{ status: 'protect', turns: 1000 }] }, 'seed'),
    ).toThrow('999')
    expect(() =>
      checkActorConditionSeedShape({ statuses: [{ status: 'puppet', turns: 1 }] }, 'seed'),
    ).toThrow('不可携带')
    expect(() => checkActorConditionSeedShape({ tickIndex: 3 }, 'seed')).toThrow('未知字段')
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
    ).toThrow('未知字段')
  })
})

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

  test('傀儡与非正整数回合 fail-loud', () => {
    expect(() => applyCarriedStatus(carrier(), 'puppet' as never, 1)).toThrow('不可携带')
    expect(() => applyCarriedStatus(carrier(), 'protect', 0)).toThrow('正安全整数')
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

  test('未知/重复毒、重复/不可携带状态在任何写入前 fail-loud', () => {
    const cases = [
      { poisonIds: [999] },
      { poisonIds: [551, 551] },
      {
        statuses: [
          { status: 'protect' as const, turns: 1 },
          { status: 'protect' as const, turns: 2 },
        ],
      },
      { statuses: [{ status: 'puppet' as never, turns: 1 }] },
    ]
    for (const seed of cases) {
      const target = carrier()
      expect(() => applyActorConditionSeed(target, seed, poisons)).toThrow()
      expect(target).toEqual({ hp: 100 })
    }
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
  })

  test('临时毒抗取高，三种 condition 可分别清除', () => {
    const target = carrier()
    target.poisons = [{ poisonId: 551, tickIndex: 2 }]
    target.extraStatuses = [{ status: 'protect', turns: 7 }]
    target.extraPoisonRes = 30
    expect(applyActorCondition(target, { kind: 'poisonResistance', amount: 20 }, poisons)).toBe(
      false,
    )
    expect(applyActorCondition(target, { kind: 'poisonResistance', amount: 40 }, poisons)).toBe(
      true,
    )
    expect(clearActorCondition(target, { kind: 'poison', poisonId: 551 }, poisons)).toBe(true)
    expect(clearActorCondition(target, { kind: 'status', status: 'protect' }, poisons)).toBe(true)
    expect(clearActorCondition(target, { kind: 'poisonResistance' }, poisons)).toBe(true)
    expect(target).toEqual({ hp: 100, poisons: [], extraStatuses: [] })
  })
})
