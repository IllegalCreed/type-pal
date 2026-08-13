import type { GridPos } from '@type-pal/content'
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
