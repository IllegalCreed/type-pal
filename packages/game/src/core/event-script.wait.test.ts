/** Frame waits optionally reset standing gestures before resuming the script. */
import type { Command } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import { buildLabelMap, OP_PLAY_SOUND, OP_WAIT_FRAMES, tickEventSystem } from './event-system.js'
import { snap } from './scene.test-fixtures.js'

describe('frame-wait gesture ownership', () => {
  it.each([
    { flag: 1, walking: false, step: 0 },
    { flag: 0, walking: true, step: 3 },
  ])('gesture operand $flag is applied during the wait, not at entry', ({
    flag,
    walking,
    step,
  }) => {
    const gs = freshPlayerOpcodeState()
    const commands: Command[] = [
      { op: 'raw', opcode: OP_WAIT_FRAMES, operands: [2, 0, flag] },
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [77, 0, 0] },
      { op: 'end' },
    ]
    gs.mode = 'event'
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
    gs.walkingFrame.walking = true
    gs.walkingFrame.stepFrame = 3
    tickEventSystem(gs, snap())
    expect(gs.eventCursor?.waiting).toBe('frame-wait')
    expect(gs.walkingFrame.walking).toBe(true)
    expect(gs.pendingSounds ?? []).toEqual([])
    tickEventSystem(gs, snap())
    expect(gs.walkingFrame.walking).toBe(walking)
    expect(gs.walkingFrame.stepFrame).toBe(step)
    expect(gs.pendingSounds ?? []).toEqual([])
    tickEventSystem(gs, snap())
    expect(gs.mode).toBe('explore')
    expect(gs.pendingSounds).toEqual([77])
  })
})
