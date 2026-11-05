/** Event cursor release and end-of-trigger cleanup. */
import type { Command } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import { buildLabelMap, tickEventSystem } from './event-system.js'
import { snap } from './scene.test-fixtures.js'

function program(commands: Command[]) {
  const gs = freshPlayerOpcodeState()
  gs.mode = 'event'
  gs.nowMs = 1000
  gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
  return gs
}

describe('event cursor ownership', () => {
  it('a missing cursor returns event mode to exploration', () => {
    const gs = freshPlayerOpcodeState()
    gs.mode = 'event'
    tickEventSystem(gs, snap())
    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
  })

  it('the legacy scene-load wait does not execute until an external owner replaces its cursor', () => {
    // No current production writer of this legacy tag was found. This is only its exposed-state guard.
    const commands: Command[] = [{ op: 'raw', opcode: 0x1e, operands: [111, 0, 0] }, { op: 'end' }]
    const gs = program(commands)
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0, waiting: 'scene-load' }
    const suspended = gs.eventCursor
    tickEventSystem(gs, snap())
    tickEventSystem(gs, snap())
    expect(gs.dwCash).toBe(0)
    expect(gs.eventCursor).toBe(suspended)
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
    tickEventSystem(gs, snap())
    expect(gs.dwCash).toBe(111)
    expect(gs.eventCursor).toBeUndefined()
  })

  it('a dialog wait with no box resumes its current instruction without losing the suffix', () => {
    const commands: Command[] = [{ op: 'raw', opcode: 0x1e, operands: [111, 0, 0] }, { op: 'end' }]
    const gs = program(commands)
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0, waiting: 'dialog' }
    tickEventSystem(gs, snap())
    expect(gs.dwCash).toBe(111)
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.mode).toBe('explore')
  })

  it('trigger advance checkpoints after real dialogue and clears its portrait layout', () => {
    const commands: Command[] = [
      { op: 'end', label: 'L_0' },
      { op: 'setDialogStyleBottom', arg0: 5, label: 'L_1' },
      { op: 'showDialog', messageIndex: 0, text: '完成~00' },
      { op: 'end', advance: true },
    ]
    const gs = program(commands)
    gs.npcs = [{ id: 0, x: 100, y: 100, spriteNum: 1, sState: 1 }]
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 1, triggerOwnerId: 0 }
    tickEventSystem(gs, snap())
    expect(gs.dialogBox?.portraitIcon).toBe(5)
    expect(gs.currentDialogPortraitLayout).toBe(true)
    for (let tick = 0; tick < 6 && gs.eventCursor; tick++) {
      gs.nowMs += 100
      tickEventSystem(gs, snap())
    }
    expect(gs.npcs[0]?.triggerResume).toEqual({ ip: 4 })
    expect(gs.currentDialogPortraitLayout).toBe(false)
    expect(gs.currentDialogPortraitIcon).toBeUndefined()
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.mode).toBe('explore')
  })
})
