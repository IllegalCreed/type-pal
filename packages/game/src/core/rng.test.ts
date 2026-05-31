import { describe, it, expect } from 'vitest'
import { createSeedableRng } from './rng.js'

describe('SeedableRng (mulberry32)', () => {
  it('同 seed 产相同序列', () => {
    const a = createSeedableRng(42)
    const b = createSeedableRng(42)
    for (let i = 0; i < 10; i++) {
      expect(a.next()).toBe(b.next())
    }
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

  it('rangeFloat(1, 1.125) 总在 [1, 1.125)(对齐 sdlpal RandomFloat 伤害浮动)', () => {
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
    expect(a.rangeFloat(1, 2)).toBe(b.rangeFloat(1, 2))
  })

  it('getState 返回当前 state,可用于 save', () => {
    const r = createSeedableRng(789)
    r.next()
    r.next()
    const state = r.getState()
    expect(typeof state).toBe('number')
    expect(state).toBeGreaterThan(0)
  })
})
