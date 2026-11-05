/** Persistent trigger/auto/onEnter checkpoints through their real public callers. */
import type { Command } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import {
  buildLabelMap,
  OP_PLAY_SOUND,
  runEnterScript,
  setGlobalEvents,
  tickAutoScripts,
  tickEventSystem,
} from './event-system.js'
import type { GameState } from './game-state.js'
import { makeFlatMap, snap } from './scene.test-fixtures.js'
import { tickSceneInput } from './scene-system.js'

afterEach(() => setGlobalEvents([]))

function resetProgram(): Command[] {
  return [
    { op: 'end', label: 'L_0' },
    { op: 'raw', opcode: OP_PLAY_SOUND, operands: [11, 0, 0], label: 'L_1' },
    { op: 'end', reset: true, resetTo: 5 },
    { op: 'raw', opcode: OP_PLAY_SOUND, operands: [99, 0, 0] },
    { op: 'end' },
    { op: 'raw', opcode: OP_PLAY_SOUND, operands: [44, 0, 0], label: 'L_5' },
    { op: 'end' },
  ]
}

function searchableNpc() {
  const gs = freshPlayerOpcodeState()
  gs.party = { x: 256, y: 128, facing: 'right' }
  gs.npcs = [
    {
      id: 3,
      x: 272,
      y: 136,
      spriteNum: 1,
      sState: 1,
      triggerMode: 1,
      triggerLabel: 'L_1',
    },
  ]
  return gs
}

function search(gs: GameState): void {
  tickSceneInput(gs, snap([], ['Confirm']), { tilemap: makeFlatMap(16, 16) })
  expect(gs.mode).toBe('event')
  expect(gs.eventCursor?.triggerOwnerId).toBe(3)
}

describe('NPC trigger reset checkpoints', () => {
  it('a reset ends this invocation and the next actual search starts at its checkpoint', () => {
    const gs = searchableNpc()
    setGlobalEvents(resetProgram())
    search(gs)
    expect(gs.eventCursor?.ip).toBe(1)
    tickEventSystem(gs, snap())
    expect(gs.mode).toBe('explore')
    expect(gs.npcs[0]!.triggerResume?.ip).toBe(5)
    expect(gs.pendingSounds).toEqual([11])
    search(gs)
    const resumedEntry = gs.eventCursor?.ip
    tickEventSystem(gs, snap())
    expect(gs.pendingSounds).toEqual([11, 44])
    expect(resumedEntry).toBe(5)
    expect(gs.npcs[0]!.triggerResume?.ip).toBe(5)
  })

  it('the saved checkpoint loops back legally before the owner’s idle counter can reach its limit', () => {
    const gs = searchableNpc()
    setGlobalEvents([
      { op: 'end', label: 'L_0' },
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [11, 0, 0], label: 'L_1' },
      { op: 'end', reset: true, resetTo: 5, idleFrames: 2 },
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [22, 0, 0] },
      { op: 'end' },
      { op: 'goto', to: 'L_1', label: 'L_5' },
    ])
    search(gs)
    tickEventSystem(gs, snap())
    expect(gs.pendingSounds).toEqual([11])
    expect(gs.npcs[0]!.triggerResume?.ip).toBe(5)
    expect(gs.npcs[0]!.triggerEndIdleCount).toBe(1)
    search(gs)
    expect(gs.eventCursor?.ip).toBe(5)
    tickEventSystem(gs, snap())
    expect(gs.pendingSounds).toEqual([11, 11, 22])
    expect(gs.npcs[0]!.triggerEndIdleCount).toBe(0)
    expect(gs.npcs[0]!.triggerResume?.ip).toBe(5)
    expect(gs.mode).toBe('explore')
  })
})

describe('auto-script reset counter', () => {
  it('counts three invocations, clears its counter and then parks at the next end', () => {
    const gs = freshPlayerOpcodeState()
    setGlobalEvents([
      { op: 'end', label: 'L_0' },
      { op: 'end', reset: true, resetTo: 1, idleFrames: 3, label: 'L_1' },
      { op: 'end' },
    ])
    gs.npcs = [{ id: 9, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 1 } }]
    const positions: Array<number | undefined> = []
    for (let i = 0; i < 5; i++) {
      tickAutoScripts(gs)
      positions.push(gs.npcs[0]!.autoCursor?.ip)
    }
    expect(positions).toEqual([1, 1, 2, 2, 2])
    expect(gs.npcs[0]!.autoCursor?.idleFrameCount).toBe(0)
  })
})

describe('scene entry reset checkpoints', () => {
  it('the asynchronous cursor saves resetTo and re-entry skips the completed prefix', () => {
    const gs = freshPlayerOpcodeState()
    gs.wNumScene = 7
    const commands = resetProgram()
    const labels = buildLabelMap(commands)
    gs.mode = 'event'
    gs.eventCursor = { commands, labelMap: labels, ip: 1, onEnterSceneId: 7, onEnterStartIp: 1 }
    tickEventSystem(gs, snap())
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.sceneOnEnterIp[7]).toBe(5)
    expect(gs.pendingSounds).toEqual([11])
    gs.mode = 'event'
    gs.eventCursor = {
      commands,
      labelMap: labels,
      ip: gs.sceneOnEnterIp[7]!,
      onEnterSceneId: 7,
      onEnterStartIp: 5,
    }
    tickEventSystem(gs, snap())
    expect(gs.pendingSounds).toEqual([11, 44])
    expect(gs.sceneOnEnterIp[7]).toBe(5)
    expect(gs.mode).toBe('explore')
  })

  it('the synchronous entry runner returns the same saved reset checkpoint', () => {
    const gs = freshPlayerOpcodeState()
    gs.wNumScene = 9
    const commands = resetProgram()
    const labels = buildLabelMap(commands)
    runEnterScript(gs, commands, labels, 1, 9)
    expect(gs.sceneOnEnterIp[9]).toBe(5)
    runEnterScript(gs, commands, labels, gs.sceneOnEnterIp[9]!, 9)
    expect(gs.pendingSounds).toEqual([11, 44])
    expect(gs.sceneOnEnterIp[9]).toBe(5)
  })
})
