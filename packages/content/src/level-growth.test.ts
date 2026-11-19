/** Uncapped level growth with a deterministic random source. */

import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
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

describe('applyLevelGrowth：钳位与确定性区间', () => {
  test('负级/零级 → 不改任何属性，delta 全 0', () => {
    for (const levels of [-3, 0, 0.9]) {
      const t = target()
      const before = deepSnapshot(t)
      const delta = applyLevelGrowth(t, levels, () => {
        throw new Error('A zero growth request must not consume a draw')
      })
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
      expect(t).toEqual(before)
    }
  })

  test('每级固定+2 luck（无随机）；合法 RNG 区间上下界（未钳位精确值）', () => {
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
