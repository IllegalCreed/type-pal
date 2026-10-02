/** TEST-GLM-WAVE-O-1 O08：applyLevelGrowth 防御与区间残余合同。
 *  旧证（existing-proof，O-R9 续审逐条件扣除，不计净新）：
 *  - rewards.test.ts:43-75「通用成长在 99 级仍掷上界属性并把七项钳到 999」已同轴覆盖
 *    MAX_LEVEL=99 等级钳与 STAT_CAP=999 属性钳（含各 delta），本文件原「等级钳/属性钳」行删除；
 *  - entity-lifecycle.test.ts:20 已覆盖 undefined 表 → 空表；:62-72 已覆盖未知 scene/entity
 *    引用精确诊断与「输出改写不影响输入」的深拷贝证明 —— 原 normalizeEntityLifecycleTable
 *    三行全部删除登记（含 buildEntityLifecycleReferenceIndex 输入形状）。
 *  本文件只保留旧证未覆盖的真实新轴：防御性零/负级钳位、未钳位区间端点精确值与
 *  luck 固定 +2（旧证仅在 998 钳位处观察，无法区分固定与随机）、多级累积独立掷骰。
 */

import { describe, expect, test } from 'vitest'
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

  test('每级固定+2 luck（无随机）；rng=0/1 区间上下界（未钳位精确值）', () => {
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

  test('多级累积：每级独立掷随机（计数 rng 区分每级取样）', () => {
    const t = target()
    // 计数 rng：仅第 1 次 r() 调用掷 0，其余掷 →1。maxHP 每级恰好掷一次：
    // 第 1 级 10+0、第 2 级 10+7=17 → 合计 27。若实现每级复用同一次抽样，
    // 结果只能是 20 或 34 —— 计数 rng 使「独立抽样」可证伪。
    let calls = 0
    const delta = applyLevelGrowth(t, 2, () => (calls++ === 0 ? 0 : 0.999999))
    expect(calls).toBe(12) // 2 级 × 6 项掷随机属性（luck 固定不掷）
    expect(delta.level).toBe(2)
    expect(delta.maxHP).toBe(10 + 17)
    expect(delta.attack).toBe(5 + 5)
    expect(delta.luck).toBe(4) // luck 固定 +2 不掷
  })
})
