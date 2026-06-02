import { describe, it, expect, vi } from 'vitest'
import type { Tilemap, AbstractKey, InputSnapshot } from '@type-pal/shared'
import { tickN, advanceRafFrame, logicIntervalMs, type LoopContext } from './main-loop.js'
import { FRAME_MS_BATTLE, FRAME_MS_EXPLORE } from '@type-pal/shared'
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
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
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

  it('Replay 向右走 3 步 → party.x + 3*16, party.y + 3*8 (East 右下)', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
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
    // sdlpal scene.c:804-805 East: dx=+16, dy=+8 × 3 steps
    expect(gs.party.x).toBe(8 * 16)
    expect(gs.party.y).toBe(8 * 8)
  })
})

describe('advanceRafFrame / logicIntervalMs(M1 三不变量)', () => {
  function mkCtx(gs: ReturnType<typeof createInitialGameState>, onPresent: () => void): LoopContext {
    return { gs, bus: createCommandBus(), input: new ReplayInputSource([]), tilemap: flat(10, 10), eventCommands: [], labelMap: {}, onPresent }
  }

  it('① logicIntervalMs:battle 40 / 否则 100', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'explore'
    expect(logicIntervalMs(gs)).toBe(FRAME_MS_EXPLORE)
    gs.mode = 'battle'
    expect(logicIntervalMs(gs)).toBe(FRAME_MS_BATTLE)
  })

  it('② accumulator clamp:dt 巨大(>3×interval)→ 单 tick(非 catch-up 多 tick)+ 修 while-后死代码', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' }) // explore → interval 100
    let ticks = 0
    const ctx = mkCtx(gs, () => {})
    const orig = ctx.input.nextSnapshot.bind(ctx.input)
    // biome-ignore lint/suspicious/noExplicitAny: 测试 spy
    ;(ctx.input as any).nextSnapshot = (fn: number) => { ticks++; return orig(fn) }
    const state = { lastTickTime: 0, accumulator: 0 }
    advanceRafFrame(state, 1000, ctx) // dt=1000 = 10×interval → clamp 到 100 → 跑 1 tick(非 10)
    expect(ticks).toBe(1)
    expect(state.accumulator).toBe(0)
  })

  it('③ present 门控:无 tick + 无 fade → 不 present;有 paletteFade → present', () => {
    const gs1 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const p1 = vi.fn()
    const r1 = advanceRafFrame({ lastTickTime: 0, accumulator: 0 }, 10, mkCtx(gs1, p1)) // dt=10 < 100 → 无 tick
    expect(r1.ticked).toBe(false)
    expect(p1).not.toHaveBeenCalled()
    const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // biome-ignore lint/suspicious/noExplicitAny: 只触发非 null 门控
    gs2.paletteFadeState = {} as any
    const p2 = vi.fn()
    advanceRafFrame({ lastTickTime: 0, accumulator: 0 }, 10, mkCtx(gs2, p2))
    expect(p2).toHaveBeenCalled() // fade 进行中每帧 present
  })
})
