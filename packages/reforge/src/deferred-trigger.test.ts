import { describe, expect, test, vi } from 'vitest'
import { DeferredTouchTrigger } from './deferred-trigger.js'

interface Point {
  col: number
  row: number
}

const claim = (sceneSessionId = 's001:1') => ({
  sceneSessionId,
  entityId: 'door',
  landingTick: 12,
  landing: { col: 4, row: 7 },
})

describe('deferred touch trigger', () => {
  test('holds one committed landing while a runner is busy, then starts it exactly once', () => {
    const pending = new DeferredTouchTrigger<Point>()
    const fire = vi.fn(() => true)
    expect(pending.enqueue(claim())).toBe(true)
    expect(pending.enqueue({ ...claim(), entityId: 'other' })).toBe(false)

    expect(
      pending.drain({
        sceneSessionId: 's001:1',
        busy: true,
        disposition: () => 'ready',
        fire,
      }),
    ).toBe('held')
    expect(pending.pending).toBe(true)
    expect(fire).not.toHaveBeenCalled()

    expect(
      pending.drain({
        sceneSessionId: 's001:1',
        busy: false,
        disposition: () => 'ready',
        fire,
      }),
    ).toBe('started')
    expect(fire).toHaveBeenCalledOnce()
    expect(pending.pending).toBe(false)
    expect(pending.blocksAutoSafePoint).toBe(true)
    pending.releaseDeliveryFence()
    expect(pending.blocksAutoSafePoint).toBe(false)
    expect(
      pending.drain({
        sceneSessionId: 's001:1',
        busy: false,
        disposition: () => 'ready',
        fire,
      }),
    ).toBe('empty')
  })

  test('drops a stale scene claim without firing', () => {
    const pending = new DeferredTouchTrigger<Point>()
    const fire = vi.fn(() => true)
    pending.enqueue(claim('s001:1'))
    expect(
      pending.drain({
        sceneSessionId: 's002:2',
        busy: false,
        disposition: () => 'ready',
        fire,
      }),
    ).toBe('dropped')
    expect(fire).not.toHaveBeenCalled()
  })

  test('targeted lifecycle or binding replacement clears only the matching claim', () => {
    const pending = new DeferredTouchTrigger<Point>()
    pending.enqueue(claim())
    expect(pending.clearEntity('other')).toBe(false)
    expect(pending.pending).toBe(true)
    expect(pending.clearEntity('door')).toBe(true)
    expect(pending.pending).toBe(false)
  })

  test('drops a landing whose scene/lifecycle disposition is no longer valid', () => {
    const pending = new DeferredTouchTrigger<Point>()
    const fire = vi.fn(() => true)
    pending.enqueue(claim())
    expect(
      pending.drain({
        sceneSessionId: 's001:1',
        busy: false,
        disposition: () => 'drop',
        fire,
      }),
    ).toBe('dropped')
    expect(fire).not.toHaveBeenCalled()
  })

  test('retains a temporarily suspended landing until it becomes triggerable', () => {
    const pending = new DeferredTouchTrigger<Point>()
    const fire = vi.fn(() => true)
    pending.enqueue(claim())
    expect(
      pending.drain({
        sceneSessionId: 's001:1',
        busy: false,
        disposition: () => 'hold',
        fire,
      }),
    ).toBe('held')
    expect(pending.pending).toBe(true)
    expect(
      pending.drain({
        sceneSessionId: 's001:1',
        busy: false,
        disposition: () => 'ready',
        fire,
      }),
    ).toBe('started')
    expect(fire).toHaveBeenCalledOnce()
  })

  test('delivers the frozen landing fact instead of reselecting from later positions', () => {
    const pending = new DeferredTouchTrigger<Point>()
    let currentPosition = { col: 99, row: 99 }
    const delivered: Point[] = []
    pending.enqueue(claim())
    currentPosition = { col: -20, row: -20 }
    expect(
      pending.drain({
        sceneSessionId: 's001:1',
        busy: false,
        disposition: () => 'ready',
        fire: (saved) => {
          delivered.push(saved.landing)
          return true
        },
      }),
    ).toBe('started')
    expect(currentPosition).toEqual({ col: -20, row: -20 })
    expect(delivered).toEqual([{ col: 4, row: 7 }])
  })
})
