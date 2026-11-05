/** Deterministic scripted draws and synchronous method-call traces, not PRNG seed replay. */
import type { SeedableRng } from '../core/rng.js'

/**
 * Direct opcode probes use the lower bound after their queued integer draws, including floats.
 * Unlike recordingRng's unit-jitter default, this preserves their existing lower-bound policy.
 * Both integer methods share a cursor; invalid draws fail instead of silently changing the fixture.
 * calls traces range methods only. next/getState are fixed zero, not PRNG seed replay.
 */
export function lowerBoundRng(ints: number[] = []): SeedableRng & { calls: string[] } {
  const calls: string[] = []
  let cursor = 0
  const draw = (lo: number, hi: number, inclusive: boolean): number => {
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      throw new RangeError(`lowerBoundRng: non-finite bounds ${lo},${hi}`)
    }
    if (hi <= lo) return lo
    const value = ints[cursor++] ?? lo
    if (!Number.isInteger(value) || value < lo || (inclusive ? value > hi : value >= hi)) {
      throw new RangeError(`lowerBoundRng: ${value} outside ${lo}..${hi} (inclusive=${inclusive})`)
    }
    return value
  }
  return {
    calls,
    next: () => 0,
    range: (lo, hi) => {
      calls.push(`range(${lo},${hi})`)
      return draw(lo, hi, false)
    },
    rangeInclusive: (lo, hi) => {
      calls.push(`rangeInclusive(${lo},${hi})`)
      return draw(lo, hi, true)
    },
    rangeFloat: (lo, hi) => {
      calls.push(`rangeFloat(${lo},${hi})`)
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
        throw new RangeError(`lowerBoundRng: non-finite bounds ${lo},${hi}`)
      }
      return lo
    },
    getState: () => 0,
  }
}

/**
 * 脚本化RNG：整数方法共用ints游标，浮点方法使用floats；拒绝域外值，不静默钳制坏fixture。
 * 队列用尽取合法默认值：exclusive整数取lo，inclusive整数/浮点优先1，否则取lo。
 * 空区间返回lo且不吃队列。记录的是方法调用，不是PRNG内部抽样；next固定0、getState固定0，
 * 因此本stub不提供seed重放语义。trace在调用当时同步追加，供与脚本事件交错的顺序断言。
 */
export function recordingRng(
  ints: number[] = [],
  floats: number[] = [],
  trace?: string[],
): SeedableRng & { calls: string[] } {
  const calls: string[] = []
  let i = 0
  let f = 0
  const emit = (event: string): void => {
    calls.push(event)
    trace?.push(`rng:${event}`)
  }
  const finiteBounds = (lo: number, hi: number): void => {
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      throw new RangeError(`recordingRng: non-finite bounds ${lo},${hi}`)
    }
  }
  return {
    calls,
    next: () => {
      emit('next')
      return 0
    },
    range: (lo: number, hi: number) => {
      emit(`range(${lo},${hi})`)
      finiteBounds(lo, hi)
      if (hi <= lo) return lo
      const v = ints[i++] ?? lo
      if (!Number.isInteger(v) || v < lo || v >= hi) {
        throw new RangeError(`recordingRng.range: ${v} outside [${lo},${hi})`)
      }
      return v
    },
    rangeInclusive: (lo: number, hi: number) => {
      emit(`rangeInclusive(${lo},${hi})`)
      finiteBounds(lo, hi)
      if (hi <= lo) return lo
      const v = ints[i++] ?? (lo <= 1 && 1 <= hi ? 1 : lo)
      if (!Number.isInteger(v) || v < lo || v > hi) {
        throw new RangeError(`recordingRng.rangeInclusive: ${v} outside [${lo},${hi}]`)
      }
      return v
    },
    rangeFloat: (lo: number, hi: number) => {
      emit(`rangeFloat(${lo},${hi})`)
      finiteBounds(lo, hi)
      if (hi <= lo) return lo
      const v = floats[f++] ?? (lo <= 1 && 1 < hi ? 1 : lo)
      if (!Number.isFinite(v) || v < lo || v >= hi) {
        throw new RangeError(`recordingRng.rangeFloat: ${v} outside [${lo},${hi})`)
      }
      return v
    },
    getState: () => 0,
  }
}
