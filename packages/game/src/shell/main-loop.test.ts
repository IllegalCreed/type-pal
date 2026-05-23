import { describe, it, expect, vi } from 'vitest'
import type { Tilemap, AbstractKey, InputSnapshot } from '@type-pal/shared'
import { tickN, type LoopContext } from './main-loop.js'
import { ReplayInputSource } from './input.js'
import { createInitialGameState } from '../core/game-state.js'
import { createCommandBus } from '../core/command-bus.js'

function flat(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tilesetImage: 'fake' }
}

function snap(held: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return { held: new Set(held), pressed: new Set(), frameNum }
}

describe('tickN', () => {
  it('跑 N tick,每 tick 调 onPresent', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    const bus = createCommandBus()
    const presentFn = vi.fn()
    const ctx: LoopContext = {
      gs, bus,
      input: new ReplayInputSource([]),
      tilemap: flat(10, 10),
      eventCommands: [], labelMap: {},
      onPresent: presentFn,
    }
    tickN(3, ctx)
    expect(presentFn).toHaveBeenCalledTimes(3)
    expect(gs.frameNum).toBe(3)
  })

  it('Replay 向右走 3 步 → party.col + 3', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    const bus = createCommandBus()
    const ctx: LoopContext = {
      gs, bus,
      input: new ReplayInputSource([
        snap(['Right'], 0),
        snap(['Right'], 1),
        snap(['Right'], 2),
      ]),
      tilemap: flat(10, 10),
      eventCommands: [], labelMap: {},
      onPresent: () => {},
    }
    tickN(3, ctx)
    expect(gs.party.col).toBe(8)
  })
})
