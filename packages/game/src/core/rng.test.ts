import { describe, expect, it } from 'vitest'
import { createSeedableRng } from './rng.js'

describe('SeedableRng (mulberry32)', () => {
  it('同 seed 产相同序列', () => {
    const a = createSeedableRng(42)
    const b = createSeedableRng(42)
    // Frozen mulberry32 unsigned words, independently recomputed with integer arithmetic.
    const expected = [2581720956, 1925393290, 3661312704, 2876485805].map(
      (word) => word / 4294967296,
    )
    expect(Array.from({ length: 4 }, () => a.next())).toEqual(expected)
    expect(Array.from({ length: 4 }, () => b.next())).toEqual(expected)
  })

  it('不同 seed 产不同序列', () => {
    const a = createSeedableRng(1)
    const b = createSeedableRng(2)
    expect(a.next()).not.toBe(b.next())
  })

  it('range(0, 100) 总在 [0, 100)', () => {
    const r = createSeedableRng(42)
    // 独立整数word向量映射到[0,100)，精确值可拒绝常量和错误缩放。
    expect(Array.from({ length: 4 }, () => r.range(0, 100))).toEqual([60, 44, 85, 66])
    expect(r.getState()).toBe(3031295998)
  })

  it('rangeInclusive(0, 10) 总在 [0, 10] 且能取到边界', () => {
    const r = createSeedableRng(42)
    // span=11的精确映射可区分floor(next*11)与有偏的round(next*10)。
    expect(Array.from({ length: 5 }, () => r.rangeInclusive(0, 10))).toEqual([6, 4, 9, 7, 1])
    // 两个确定的合法seed分别命中下端点和上端点，不靠上万次抽样碰撞。
    expect(createSeedableRng(7).rangeInclusive(0, 10)).toBe(0)
    expect(createSeedableRng(4).rangeInclusive(0, 10)).toBe(10)
  })

  it('rangeFloat(1, 1.125) 总在 [1, 1.125)(TS 半开区间)', () => {
    const r = createSeedableRng(42)
    // [1,1+1/8)的精确二进制分数；word独立冻结，不由SUT动态产生期望。
    const expected = [2581720956, 1925393290, 3661312704, 2876485805].map(
      (word) => 1 + word / 34359738368,
    )
    expect(Array.from({ length: 4 }, () => r.rangeFloat(1, 1.125))).toEqual(expected)
    expect(r.getState()).toBe(3031295998)
  })

  it('rangeFloat 同 seed 确定性', () => {
    const a = createSeedableRng(7)
    const b = createSeedableRng(7)
    expect([a.rangeFloat(1, 2), b.rangeFloat(1, 2)]).toEqual([
      1 + 50271532 / 4294967296,
      1 + 50271532 / 4294967296,
    ])
  })

  it('getState 返回当前 state,可用于 save', () => {
    const r = createSeedableRng(789)
    r.next()
    r.next()
    const state = r.getState()
    expect(state).toBe(3663132415) // (789 + 2*0x6d2b79f5) modulo 2^32
  })

  it('to<=from 时三个 range API 返回 from 且不消耗 RNG（对齐 util.c RandomLong/RandomFloat）', () => {
    const r = createSeedableRng(987)
    const before = r.getState()

    expect(r.range(5, 5)).toBe(5)
    expect(r.range(5, 4)).toBe(5)
    expect(r.rangeInclusive(7, 7)).toBe(7)
    expect(r.rangeInclusive(7, 6)).toBe(7)
    expect(r.rangeFloat(9, 9)).toBe(9)
    expect(r.rangeFloat(9, 8)).toBe(9)
    expect(r.getState()).toBe(before)
  })
})
