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

  it('getState 返回当前 state,可用于 save', () => {
    const r = createSeedableRng(789)
    r.next()
    r.next()
    const state = r.getState()
    expect(typeof state).toBe('number')
    expect(state).toBeGreaterThan(0)
  })
})
