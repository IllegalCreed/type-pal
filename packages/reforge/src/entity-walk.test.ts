import { type GridPos, gridToPixel, type WalkSpeed } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  consumeScheduledMoveRest,
  facingToward,
  restAfterMoveAttempt,
  SPEED_GRID,
  stepEntityPos,
  walkTick,
} from './entity-walk.js'

const pos = (col: number, row: number): GridPos => ({ col, row, height: 0 })

describe('production entity walk tick', () => {
  test.each([
    'slow',
    'normal',
    'fast',
    'run',
  ] as const)('walks the authored stair line continuously at %s speed without an endpoint jump', (speed) => {
    const start = pos(122, 49)
    const target = pos(131, 52)
    const distancePerTick = Math.hypot(16, 8) * SPEED_GRID[speed]
    let current = start
    let done = false
    let ticks = 0
    while (!done && ticks++ < 100) {
      const before = gridToPixel(current)
      const next = walkTick(current, target, speed)
      const after = gridToPixel(next.pos)
      expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThanOrEqual(
        distancePerTick + 1e-9,
      )
      expect(after.x - before.x).toBeCloseTo(after.y - before.y, 8)
      expect(next.facing).toBe('right')
      current = next.pos
      done = next.done
    }
    expect(done).toBe(true)
    expect(current).toEqual(target)
  })

  test.each([
    [pos(10, -10), 'right'],
    [pos(10, 10), 'right'],
    [pos(-10, 10), 'down'],
    [pos(-10, -10), 'up'],
    [pos(-10, 0), 'left'],
    [pos(0, -10), 'up'],
  ] as const)('does not teleport when a projected axis is already aligned', (target, facing) => {
    const first = walkTick(pos(0, 0), target, 'normal')
    expect(first.done).toBe(false)
    expect(first.facing).toBe(facing)
    const point = gridToPixel(first.pos)
    expect(Math.hypot(point.x, point.y)).toBeCloseTo(Math.hypot(16, 8) * SPEED_GRID.normal)
  })

  test('commits height only at the endpoint, including zero ground-plane distance', () => {
    const target = { ...pos(4, 0), height: 2 }
    expect(walkTick(pos(0, 0), target, 'normal').pos.height).toBe(0)
    expect(walkTick(pos(4, 0), target, 'normal')).toEqual({
      pos: target,
      facing: 'right',
      done: true,
    })
  })

  test.each([
    'slow',
    'normal',
    'fast',
    'run',
  ] satisfies WalkSpeed[])('clamps the last %s step exactly to the target, without overshooting', (speed) => {
    const target = pos(0.01, 0.02)
    expect(walkTick(pos(0, 0), target, speed)).toEqual({
      pos: target,
      facing: 'down',
      done: true,
    })
    expect(walkTick(target, target, speed).done).toBe(true)
  })

  test('keeps the four authored speed quanta', () => {
    expect(SPEED_GRID).toEqual({ slow: 0.25, normal: 0.375, fast: 0.5, run: 1 })
  })

  test('uses projected-pixel quadrants for diamond-grid facing', () => {
    expect(facingToward(pos(0, 0), pos(0, 4))).toBe('down')
    expect(facingToward(pos(0, 0), pos(4, 0))).toBe('right')
    expect(facingToward(pos(0, 0), pos(0, -4))).toBe('up')
    expect(facingToward(pos(0, 0), pos(-4, 0))).toBe('left')
  })

  test('shares the exact quarter-grid one-step opcode geometry', () => {
    expect(stepEntityPos(pos(2, 3), 'left')).toEqual(pos(1.75, 3))
    expect(stepEntityPos(pos(2, 3), 'down')).toEqual(pos(2, 3.25))
  })

  test('advances by the selected quantum and snaps only at the production threshold', () => {
    expect(walkTick(pos(0, 0), pos(0, 4), 'normal')).toEqual({
      pos: pos(0, 0.375),
      facing: 'down',
      done: false,
    })
    expect(walkTick(pos(0, 0), pos(0.25, 0), 'normal')).toEqual({
      pos: pos(0.25, 0),
      facing: 'right',
      done: true,
    })
  })

  test('slow cadence attempts immediately, then rests exactly one eligible tick', () => {
    expect(consumeScheduledMoveRest('slow', false)).toEqual({
      attempt: true,
      restPending: false,
    })
    expect(restAfterMoveAttempt('slow')).toBe(true)
    expect(consumeScheduledMoveRest('slow', true)).toEqual({
      attempt: false,
      restPending: false,
    })
    expect(restAfterMoveAttempt('normal')).toBe(false)
  })

  test('ineligible wall-clock gaps do not age command-local slow cadence', () => {
    let restPending = restAfterMoveAttempt('slow')
    // No transition is called during menu / authority / lifecycle pause, regardless of elapsed
    // global world ticks. The first restored eligible tick consumes the same scheduled rest.
    expect(restPending).toBe(true)
    const restored = consumeScheduledMoveRest('slow', restPending)
    expect(restored).toEqual({ attempt: false, restPending: false })
    restPending = restored.restPending
    expect(consumeScheduledMoveRest('slow', restPending).attempt).toBe(true)
  })
})
