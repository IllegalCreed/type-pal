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
    const r = createSeedableRng(123)
    for (let i = 0; i < 1000; i++) {
      const v = r.range(0, 100)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(100)
    }
  })

  it('rangeInclusive(0, 10) 总在 [0, 10] 且能取到边界', () => {
    const r = createSeedableRng(456)
    const counts = new Map<number, number>()
    for (let i = 0; i < 11000; i++) {
      const v = r.rangeInclusive(0, 10)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(10)
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    expect(counts.size).toBe(11)
  })

  it('rangeFloat(1, 1.125) 总在 [1, 1.125)(TS 半开区间)', () => {
    const r = createSeedableRng(2026)
    let sawLow = false
    let sawHigh = false
    for (let i = 0; i < 5000; i++) {
      const v = r.rangeFloat(1, 1.125)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThan(1.125)
      if (v < 1.01) sawLow = true
      if (v > 1.11) sawHigh = true
    }
    // 覆盖到区间两端附近(非退化常量)
    expect(sawLow).toBe(true)
    expect(sawHigh).toBe(true)
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
