import { describe, expect, test, vi } from 'vitest'
import {
  BattleActionPresentationScheduler,
  type BattlePlaybackAdvance,
} from './battle-action-presentation-scheduler.js'
import type { AnimFrame } from './battle-anim.js'

const frame = (durationMs = 40): AnimFrame => ({
  durationMs,
  fighters: [{ side: 'player', idx: 0, frame: 7 }],
  sound: 'sound.attack',
})

describe('BattleActionPresentationScheduler', () => {
  test('enters the first timeline frame synchronously and finishes at the exact sampled boundary', () => {
    const scheduler = new BattleActionPresentationScheduler()
    const onFighter = vi.fn()
    const onSound = vi.fn()

    scheduler.start([frame()], { onFighter, onSound })

    expect(onFighter).toHaveBeenCalledExactlyOnceWith({ side: 'player', idx: 0, frame: 7 })
    expect(onSound).toHaveBeenCalledExactlyOnceWith('sound.attack')
    expect(scheduler.active).toBe(true)
    expect(scheduler.advancePlayback(39)).toBe('playing')
    expect(scheduler.advancePlayback(1)).toBe('finished')
    expect(scheduler.active).toBe(false)
    expect(scheduler.advancePlayback(100)).toBe('inactive')
  })

  test('script consumption clears both player and scripted flag', () => {
    const scheduler = new BattleActionPresentationScheduler()
    scheduler.start([frame(20)], {}, true)
    const sequence: BattlePlaybackAdvance[] = [
      scheduler.advanceScript(19),
      scheduler.advanceScript(1),
      scheduler.advanceScript(100),
    ]
    expect(sequence).toEqual(['playing', 'finished', 'inactive'])
  })

  test('the script pump leaves an ordinary action on its own playback clock', () => {
    const scheduler = new BattleActionPresentationScheduler()
    const onSound = vi.fn()
    scheduler.start([frame(10)], { onSound })
    expect(scheduler.advanceScript(50)).toBe('inactive')
    expect(scheduler.advancePlayback(9)).toBe('playing')
    expect(scheduler.advanceScript(50)).toBe('inactive')
    expect(scheduler.advancePlayback(1)).toBe('finished')
    expect(scheduler.active).toBe(false)
    expect(scheduler.advanceScript(0)).toBe('inactive')
    expect(onSound).toHaveBeenCalledExactlyOnceWith('sound.attack')
  })

  test('shares elapsed frame time between a queue beat, playback and the next queue beat', () => {
    const scheduler = new BattleActionPresentationScheduler()
    expect(scheduler.consumeActionCadence(17)).toBe(false)
    expect(scheduler.consumeActionCadence(17)).toBe(false)
    expect(scheduler.consumeActionCadence(17)).toBe(true)
    scheduler.start([frame(40), frame(20)], {})

    expect(scheduler.advancePlayback(0)).toBe('playing')
    expect(scheduler.advancePlayback(17)).toBe('playing')
    expect(scheduler.advancePlayback(17)).toBe('playing')
    expect(scheduler.advancePlayback(17)).toBe('finished')
    expect(scheduler.consumeActionCadence(37)).toBe(false)
    expect(scheduler.consumeActionCadence(1)).toBe(true)
  })

  test('discards a full missed beat after a stall and starts a fresh cadence at turn preparation', () => {
    const scheduler = new BattleActionPresentationScheduler()
    expect(scheduler.consumeActionCadence(39)).toBe(false)
    expect(scheduler.consumeActionCadence(1)).toBe(true)
    expect(scheduler.consumeActionCadence(39)).toBe(false)
    scheduler.resetActionCadence()
    expect(scheduler.consumeActionCadence(1)).toBe(false)
    expect(scheduler.consumeActionCadence(500)).toBe(true)
    expect(scheduler.consumeActionCadence(0)).toBe(false)
    expect(scheduler.consumeActionCadence(1)).toBe(false)
    expect(scheduler.consumeActionCadence(39)).toBe(true)
    expect(scheduler.consumeActionCadence(17)).toBe(false)
    scheduler.resetActionCadence()
    expect(scheduler.consumeActionCadence(23)).toBe(false)
    expect(scheduler.consumeActionCadence(17)).toBe(true)
    scheduler.satisfyActionCadence()
    expect(scheduler.consumeActionCadence(0)).toBe(false)
    expect(scheduler.consumeActionCadence(1)).toBe(true)
  })
})
