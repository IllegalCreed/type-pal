import { describe, expect, test, vi } from 'vitest'
import {
  BattleActionPresentationScheduler,
  type BattlePlaybackAdvance,
} from './battle-action-presentation-scheduler.js'
import schedulerSource from './battle-action-presentation-scheduler.ts?raw'
import type { AnimFrame } from './battle-anim.js'
import battleSessionSource from './battle-session.ts?raw'

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

    expect(onFighter).toHaveBeenCalledWith({ side: 'player', idx: 0, frame: 7 })
    expect(onSound).toHaveBeenCalledWith('sound.attack')
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

  test('ordinary or terminal playback clears only the player and leaves script cleanup to its own path', () => {
    const scheduler = new BattleActionPresentationScheduler()
    scheduler.start([frame(10)], {}, true)
    expect(scheduler.advancePlayback(10)).toBe('finished')
    expect(scheduler.active).toBe(false)
    expect(scheduler.advanceScript(0)).toBe('finished')
    expect(scheduler.advanceScript(0)).toBe('inactive')
  })

  test('the 240ms action cadence consumes synchronously and drops overflow like the former timer', () => {
    const scheduler = new BattleActionPresentationScheduler()
    expect(scheduler.consumeActionCadence(239)).toBe(false)
    expect(scheduler.consumeActionCadence(1)).toBe(true)
    expect(scheduler.consumeActionCadence(239)).toBe(false)
    scheduler.resetActionCadence()
    expect(scheduler.consumeActionCadence(1)).toBe(false)
    expect(scheduler.consumeActionCadence(500)).toBe(true)
    expect(scheduler.consumeActionCadence(0)).toBe(false)
  })
})

describe('BattleActionPresentationScheduler ownership boundary', () => {
  test('owns cadence, player and scripted state without importing the session or battle aggregate', () => {
    for (const field of ['actionElapsedMs', 'player', 'scripted'])
      expect(schedulerSource).toContain(`private ${field}`)
    expect(schedulerSource).not.toContain('BattleState')
    expect(schedulerSource).not.toContain("from './battle-session")

    for (const stale of ['private actTimer', 'private anim:', 'private scriptAnimation'])
      expect(battleSessionSource).not.toContain(stale)
    expect(battleSessionSource.match(/new BattleActionPresentationScheduler\(/g)).toHaveLength(1)
    expect(battleSessionSource).toContain('this.actionPresentation.advanceScript(dtMs)')
    expect(
      battleSessionSource.match(/this\.actionPresentation\.advancePlayback\(dtMs\)/g),
    ).toHaveLength(2)
  })
})
