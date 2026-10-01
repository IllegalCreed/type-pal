/** TEST-GLM-WAVE-O-1 O08：携带状态/毒抗/条件种子与 apply/clear 残余合同。
 *  旧证：actor-condition.boundaries / cursor-pure 覆盖形状 guard；本卡按 gap-map 直击
 *  未覆盖臂：applyCarriedStatus 坏不刷新/好仅活人/取长、applyTemporaryPoisonResistance
 *  取大、applyActorConditionSeed 毒+状态+毒抗物化、apply/clearActorCondition 命令形状、
 *  毒 id 正整数轴。
 */
import { describe, expect, test } from 'vitest'
import type { PoisonDef } from '@type-pal/content'
import type { CarryableStatusId } from './actor-condition.js'
import {
  applyActorCondition,
  applyActorConditionSeed,
  applyCarriedStatus,
  applyTemporaryPoisonResistance,
  clearActorCondition,
} from './actor-condition.js'

const poisonDefs: Record<number, PoisonDef> = {
  1: { id: 1, name: 'poison.1', curability: 'common', color: 0, counters: 9 },
}

type Carrier = {
  hp: number
  poisons?: { poisonId: number; tickIndex: number; label?: string }[]
  extraStatuses?: { status: CarryableStatusId; turns: number }[]
  extraPoisonRes?: number
}
const carrier = (over: { hp?: number } = {}): Carrier => ({ hp: over.hp ?? 100 })

describe('O08 applyCarriedStatus：叠加规则', () => {
  test('坏状态（confused）已有不刷新；为 0 时可设', () => {
    const c = carrier()
    expect(applyCarriedStatus(c, 'confused', 3)).toBe(true)
    expect(c.extraStatuses).toEqual([{ status: 'confused', turns: 3 }])
    expect(applyCarriedStatus(c, 'confused', 5)).toBe(false)
    expect(c.extraStatuses![0]!.turns).toBe(3)
  })

  test('好状态（bravery）仅活人：hp 0 拒绝；活人取更长回合', () => {
    const dead = carrier({ hp: 0 })
    expect(applyCarriedStatus(dead, 'bravery', 4)).toBe(false)
    const alive = carrier()
    expect(applyCarriedStatus(alive, 'bravery', 2)).toBe(true)
    expect(applyCarriedStatus(alive, 'bravery', 5)).toBe(true)
    expect(alive.extraStatuses).toEqual([{ status: 'bravery', turns: 5 }])
    expect(applyCarriedStatus(alive, 'bravery', 1)).toBe(false)
  })

  test('非法回合 fail-loud（不可携带 puppet 轴对 typed 调用方不可构造，登记 unreachable）', () => {
    expect(() => applyCarriedStatus(carrier(), 'sleep', 0)).toThrow(/turns/)
  })
})

describe('O08 applyTemporaryPoisonResistance：取大语义', () => {
  test('首次设置返回 true；更小值不覆盖返回 false；更大值覆盖', () => {
    const c = carrier()
    expect(applyTemporaryPoisonResistance(c, 30)).toBe(true)
    expect(c.extraPoisonRes).toBe(30)
    expect(applyTemporaryPoisonResistance(c, 10)).toBe(false)
    expect(applyTemporaryPoisonResistance(c, 60)).toBe(true)
    expect(c.extraPoisonRes).toBe(60)
  })

  test('非正整数 fail-loud', () => {
    expect(() => applyTemporaryPoisonResistance(carrier(), 0)).toThrow(/amount/)
    expect(() => applyTemporaryPoisonResistance(carrier(), -5)).toThrow(/amount/)
  })
})

describe('O08 applyActorConditionSeed：新建世界物化', () => {
  test('毒从 tickIndex=0 物化 + 状态 + 毒抗全落地', () => {
    const c = carrier()
    applyActorConditionSeed(
      c,
      { poisonIds: [1], statuses: [{ status: 'sleep', turns: 3 }], poisonResistance: 25 },
      poisonDefs,
    )
    expect(c.poisons).toEqual([{ poisonId: 1, tickIndex: 0 }])
    expect(c.extraStatuses).toEqual([{ status: 'sleep', turns: 3 }])
    expect(c.extraPoisonRes).toBe(25)
  })

  test('未知毒 id fail-loud（缺表）', () => {
    expect(() =>
      applyActorConditionSeed(carrier(), { poisonIds: [99] }, poisonDefs),
    ).toThrow('applyActorConditionSeed.poisonIds: 未知毒 99')
  })

  test('毒 id 非正整数 fail-loud（形状轴）', () => {
    expect(() =>
      applyActorConditionSeed(carrier(), { poisonIds: [0] }, poisonDefs),
    ).toThrow(/毒 id 必须是正安全整数/)
  })
})

describe('O08 applyActorCondition / clearActorCondition：宿主命令轴', () => {
  test('apply poison：未知毒 → 精确 applyActorCondition.poisonId 诊断', () => {
    const c = carrier()
    expect(() =>
      applyActorCondition(c, { kind: 'poison', poisonId: 99 }, poisonDefs),
    ).toThrow('applyActorCondition.poisonId: 未知毒 99')
  })

  test('apply poison 三段链经统一入口（cured 路径）', () => {
    const c: Carrier = { hp: 100, poisons: [{ poisonId: 9, tickIndex: 0 }] }
    expect(
      applyActorCondition(c, { kind: 'poison', poisonId: 1 }, { ...poisonDefs, 9: { id: 9, name: 'p9', curability: 'common', color: 0, counters: 1 } }),
    ).toBe(true)
    expect(c.poisons).toEqual([])
  })

  test('apply status：好状态仅活人；坏状态直接生效', () => {
    const dead = carrier({ hp: 0 })
    expect(
      applyActorCondition(dead, { kind: 'status', status: 'protect', turns: 2 }, poisonDefs),
    ).toBe(false)
    const alive = carrier()
    expect(
      applyActorCondition(alive, { kind: 'status', status: 'confused', turns: 2 }, poisonDefs),
    ).toBe(true)
    expect(alive.extraStatuses).toEqual([{ status: 'confused', turns: 2 }])
  })

  test('clear poison：移除匹配毒；clear status：移除匹配状态；未命中 false', () => {
    const c: Carrier = { hp: 100 }
    applyActorConditionSeed(c, { poisonIds: [1], statuses: [{ status: 'sleep', turns: 3 }] }, poisonDefs)
    expect(clearActorCondition(c, { kind: 'poison', poisonId: 1 }, poisonDefs)).toBe(true)
    expect(c.poisons).toEqual([])
    expect(clearActorCondition(c, { kind: 'status', status: 'sleep' }, poisonDefs)).toBe(true)
    expect(c.extraStatuses).toEqual([])
    expect(clearActorCondition(c, { kind: 'poison', poisonId: 1 }, poisonDefs)).toBe(false)
  })
})
