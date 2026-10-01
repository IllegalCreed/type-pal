/** TEST-GLM-WAVE-O-1 O08/O09：等级成长与实体生命周期残余合同。
 *  旧证：rewards.test / actor-condition 邻域覆盖主干；本卡按 gap-map 直击未覆盖臂：
 *  applyLevelGrowth 负/零级钳位、等级与属性上限、确定性 rng 区间、
 *  normalizeEntityLifecycleTable 未知 scene/entity 引用与输入不可变。
 */
import { describe, expect, test } from 'vitest'
import {
  buildEntityLifecycleReferenceIndex,
  normalizeEntityLifecycleTable,
} from './entity-lifecycle.js'
import { applyLevelGrowth, type LevelGrowthTarget } from './rewards.js'

const target = (over: Partial<LevelGrowthTarget> = {}): LevelGrowthTarget => ({
  level: 1,
  maxHP: 100,
  maxMP: 50,
  attack: 10,
  magicAttack: 10,
  defense: 10,
  speed: 10,
  luck: 10,
  ...over,
})

describe('O08 applyLevelGrowth：钳位与确定性区间', () => {
  test('负级/零级 → 不改任何属性，delta 全 0', () => {
    for (const levels of [-3, 0, 0.9]) {
      const t = target()
      const delta = applyLevelGrowth(t, levels, () => 0)
      expect(delta).toEqual({
        level: 0,
        maxHP: 0,
        maxMP: 0,
        attack: 0,
        magicAttack: 0,
        defense: 0,
        speed: 0,
        luck: 0,
      })
      expect(t.level).toBe(1)
    }
  })

  test('每级固定+2 luck（无随机）；rng=0/1 区间上下界', () => {
    const low = applyLevelGrowth(target(), 1, () => 0)
    expect(low.luck).toBe(2)
    expect(low.maxHP).toBe(10) // 10 + r(0,7)=0
    expect(low.maxMP).toBe(8)
    expect(low.attack).toBe(4)
    const high = applyLevelGrowth(target(), 1, () => 0.999999)
    expect(high.maxHP).toBe(17) // 10 + r(0,7)=7
    expect(high.maxMP).toBe(13)
    expect(high.attack).toBe(5)
    expect(high.luck).toBe(2)
  })

  test('等级钳 MAX_LEVEL=99；属性钳 STAT_CAP=999', () => {
    // level 98 + 5 级 → 钳 99，delta.level=1。
    const t = target({ level: 98 })
    const delta = applyLevelGrowth(t, 5, () => 0)
    expect(t.level).toBe(99)
    expect(delta.level).toBe(1)
    // maxHP 995 + 每级 10 → 5 级钳 999，delta.maxHP=4。
    const near = target({ maxHP: 995 })
    const d2 = applyLevelGrowth(near, 5, () => 0)
    expect(near.maxHP).toBe(999)
    expect(d2.maxHP).toBe(4)
  })

  test('多级累积：每级独立掷随机', () => {
    const t = target()
    const delta = applyLevelGrowth(t, 3, () => 0)
    expect(delta.level).toBe(3)
    expect(delta.maxHP).toBe(30)
    expect(delta.luck).toBe(6)
  })
})

describe('O09 normalizeEntityLifecycleTable：引用闭包与不可变', () => {
  const index = buildEntityLifecycleReferenceIndex([
    {
      id: 's001',
      entities: [{ id: 'e1' }, { id: 'e2' }],
    },
  ])

  test('合法表深拷贝返回（输入 entry 不被别名共享）', () => {
    const input = {
      s001: {
        e1: { phase: 'awaitingExit' as const },
        e2: { phase: 'suspended' as const, remainingTicks: 3 },
      },
    }
    const normalized = normalizeEntityLifecycleTable(input, index)
    expect(normalized.s001?.e1).toEqual(input.s001?.e1)
    expect(normalized.s001?.e2).toEqual(input.s001?.e2)
    expect(normalized.s001?.e2).not.toBe(input.s001?.e2)
  })

  test('undefined 表 → 空表（缺表即正常）', () => {
    expect(normalizeEntityLifecycleTable(undefined, index)).toEqual({})
  })

  test('未知 scene id / 未知 entity id → 精确诊断', () => {
    expect(() => normalizeEntityLifecycleTable({ s999: {} }, index)).toThrow(
      'entityLifecycles.s999: 未知 scene id',
    )
    expect(() =>
      normalizeEntityLifecycleTable({ s001: { ghost: { phase: 'removed' as const } } }, index),
    ).toThrow('entityLifecycles.s001.ghost: 未知 entity id')
  })
})
