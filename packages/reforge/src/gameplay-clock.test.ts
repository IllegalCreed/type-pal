import { describe, expect, test } from 'vitest'
import { GameplayClock } from './gameplay-clock.js'

describe('GameplayClock', () => {
  test('freezes gameplay time and resumes without replaying accumulated real time', () => {
    const clock = new GameplayClock()
    expect(clock.advance(1_000, false)).toEqual({
      realDt: 0,
      gameplayDt: 0,
      gameplayNow: 1_000,
    })
    expect(clock.advance(1_016, false)).toEqual({
      realDt: 16,
      gameplayDt: 16,
      gameplayNow: 1_016,
    })
    expect(clock.advance(5_000, true)).toEqual({
      realDt: 100,
      gameplayDt: 0,
      gameplayNow: 1_016,
    })
    expect(clock.advance(5_016, true)).toEqual({
      realDt: 16,
      gameplayDt: 0,
      gameplayNow: 1_016,
    })
    expect(clock.advance(5_032, false)).toEqual({
      realDt: 16,
      gameplayDt: 16,
      gameplayNow: 1_032,
    })
  })

  test('step() advances exactly one tick while frozen real time does not accumulate', () => {
    const clock = new GameplayClock()
    clock.advance(1_000, false)
    // 冻结期 real 时间流逝不积压 gameplay 时间。
    expect(clock.advance(9_000, true)).toEqual({
      realDt: 100,
      gameplayDt: 0,
      gameplayNow: 1_000,
    })
    // 手动单步精确推进一拍(100ms),与墙钟无关。
    expect(clock.advance(9_016, true, 100)).toEqual({
      realDt: 16,
      gameplayDt: 100,
      gameplayNow: 1_100,
    })
    expect(clock.advance(10_000, true)).toEqual({
      realDt: 100,
      gameplayDt: 0,
      gameplayNow: 1_100,
    })
    expect(clock.advance(10_016, true, 100)).toEqual({
      realDt: 16,
      gameplayDt: 100,
      gameplayNow: 1_200,
    })
  })
})
