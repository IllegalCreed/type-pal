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
})
