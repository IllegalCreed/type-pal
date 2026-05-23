import { describe, it, expect } from 'vitest'
import type { Tilemap, InputSnapshot, AbstractKey } from '@type-pal/shared'
import { tickSceneSystem } from './scene-system.js'
import { createInitialGameState } from './game-state.js'
import { createCommandBus } from './command-bus.js'

function makeFlatMap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tilesetImage: 'fake' }
}

function snap(held: AbstractKey[] = [], pressed: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return {
    held: new Set(held),
    pressed: new Set(pressed),
    frameNum,
  }
}

describe('SceneSystem 走路', () => {
  it('按住 Right → party.col + 1, facing=right', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.col).toBe(6)
    expect(gs.party.facing).toBe('right')
  })

  it('按住 Up → row - 1, facing=up', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Up']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.row).toBe(4)
    expect(gs.party.facing).toBe('up')
  })

  it('地图边界 clamp:已在最左不能再左', () => {
    const gs = createInitialGameState({ col: 0, row: 5, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Left']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.col).toBe(0)
    expect(gs.party.facing).toBe('left')
  })
})

describe('SceneSystem NPC 触发', () => {
  it('面前格无 NPC + Confirm → 不切 mode', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'right' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.mode).toBe('explore')
  })

  it('面前格有 NPC + Confirm → mode=event + eventCursor 装载', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'right' })
    gs.npcs = [{ id: 7, col: 6, row: 5, spriteNum: 78, triggerLabel: 'L_59' }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const commands = [
      { op: 'end' as const },
      { op: 'end' as const },
      { op: 'showDialog' as const, messageIndex: 0, text: '你好', label: 'L_59' },
      { op: 'end' as const },
    ]
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_59: 2 },
    })
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(2)
  })
})
