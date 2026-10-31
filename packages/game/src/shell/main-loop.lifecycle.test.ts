import { describe, expect, it, vi } from 'vitest'
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState } from '../core/game-state.js'
import { heldSnapshot, prepareEmptyLoopContext } from './__tests__/loop-context.js'
import { walkableTilemap } from './__tests__/loop-tilemap.js'
import { ReplayInputSource } from './input.js'
import type { LoopContext } from './main-loop.js'
import { startRafLoop, tickN } from './main-loop.js'

describe('Headless loop', () => {
  it('跑 N tick,每 tick 调 onPresent', () => {
    const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
    const bus = createCommandBus()
    const presentFn = vi.fn()
    const ctx: LoopContext = {
      gs,
      bus,
      input: new ReplayInputSource([]),
      tilemap: walkableTilemap(10, 10),
      onPresent: presentFn,
    }
    tickN(3, ctx)
    expect(presentFn).toHaveBeenCalledTimes(3)
    expect(gs.frameNum).toBe(3)
  })
  it('Replay 向右走 3 步 → party.x + 3*16, party.y + 3*8 (East 右下)', () => {
    // M5:起点 col8/row8 合法区(避开 fCheckRange 边缘带 blockX=5/blockY=7)
    const gs = createInitialGameState({ x: 16 * 16, y: 16 * 8, facing: 'down' })
    const bus = createCommandBus()
    const ctx: LoopContext = {
      gs,
      bus,
      input: new ReplayInputSource([
        heldSnapshot(['Right'], 0),
        heldSnapshot(['Right'], 1),
        heldSnapshot(['Right'], 2),
      ]),
      tilemap: walkableTilemap(20, 20),
      onPresent: () => {},
    }
    tickN(3, ctx)
    // sdlpal scene.c:804-805 East: dx=+16, dy=+8 × 3 steps
    expect(gs.party.x).toBe(19 * 16)
    expect(gs.party.y).toBe(19 * 8)
  })
  it('tickN(0) 不 present，帧号保持 0', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    let calls = 0
    tickN(
      0,
      prepareEmptyLoopContext(gs, () => {
        calls += 1
      }),
    )
    expect(calls).toBe(0)
    expect(gs.frameNum).toBe(0)
  })
})

describe('Animation frame loop lifecycle', () => {
  it('取消初帧与推进后最新帧，释放各自排队的回调', () => {
    const pending = new Map<number, FrameRequestCallback>()
    const canceled: number[] = []
    const stops: Array<() => void> = []
    const settings = new Map<string, string | null>()
    for (const key of ['tp-speedrun-enabled', 'tp-fps-show'])
      settings.set(key, localStorage.getItem(key))
    let nextFrameId = 40
    try {
      for (const key of settings.keys()) localStorage.removeItem(key)
      vi.spyOn(performance, 'now').mockReturnValue(0)
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
        const id = ++nextFrameId
        pending.set(id, callback)
        return id
      })
      vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
        canceled.push(id)
        pending.delete(id)
      })
      const stopInitial = startRafLoop(prepareEmptyLoopContext())
      stops.push(stopInitial)
      expect([...pending.keys()]).toEqual([41])
      stopInitial()
      expect(canceled).toEqual([41])
      expect(pending.size).toBe(0)
      const stopAdvanced = startRafLoop(prepareEmptyLoopContext())
      stops.push(stopAdvanced)
      expect([...pending.keys()]).toEqual([42])
      const frame = pending.get(42)
      pending.delete(42)
      expect(frame).toBeTypeOf('function')
      frame?.(10)
      expect([...pending.keys()]).toEqual([43])
      stopAdvanced()
      expect(canceled).toEqual([41, 43])
      expect(pending.size).toBe(0)
    } finally {
      try {
        for (const stop of stops) stop()
      } finally {
        pending.clear()
        vi.restoreAllMocks()
        for (const [key, value] of settings) {
          if (value === null) localStorage.removeItem(key)
          else localStorage.setItem(key, value)
        }
      }
    }
  })
})
