/**
 * Seedable PRNG —— mulberry32(经典 8 行实现,通过 standard PRNG 测试)。
 *
 * 战斗 / 暗雷 / 任何确定性需求都走这条;D29 数值对拍要求同 seed 同结果(同 seed 反复跑产同序列)。
 * 注:与 sdlpal RNG 算法不同 —— sdlpal 用 LCG (`util.c::lsrand`),本 TS 战斗系统用 mulberry32。
 * D29 对拍只对战斗结果(伤害 / hp / 胜负),不对 RNG 内部 state。
 */

export interface SeedableRng {
  /** 返回 [0, 1) 的浮点数。 */
  next(): number
  /** 返回 [lo, hi) 的整数。 */
  range(lo: number, hi: number): number
  /** 返回 [lo, hi](含两端)的整数。 */
  rangeInclusive(lo: number, hi: number): number
  /** dump 当前 seed state(便于 save / restore)。 */
  getState(): number
}

export function createSeedableRng(seed: number): SeedableRng {
  let state = seed >>> 0 // 转 32-bit unsigned

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    range(lo, hi) {
      return lo + Math.floor(next() * (hi - lo))
    },
    rangeInclusive(lo, hi) {
      return lo + Math.floor(next() * (hi - lo + 1))
    },
    getState() {
      return state
    },
  }
}
