import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState } from '../core/game-state.js'
import { setSceneContext } from '../core/scene-system.js'
import { heldSnapshot, prepareEmptyLoopContext } from './__tests__/loop-context.js'
import { walkableTilemap } from './__tests__/loop-tilemap.js'
import { ReplayInputSource } from './input.js'
import type { LoopContext } from './main-loop.js'
import { startRafLoop, tickN } from './main-loop.js'

/** Real loop callbacks with an owned pending queue; cancellation actually removes work. */
function installRafQueue() {
  const pending = new Map<number, FrameRequestCallback>()
  const canceled: number[] = []
  const stops: Array<() => void> = []
  const settings = new Map<string, string | null>()
  for (const key of ['tp-speedrun-enabled', 'tp-fps-show']) {
    settings.set(key, localStorage.getItem(key))
    localStorage.removeItem(key)
  }
  const clock = vi.spyOn(performance, 'now').mockReturnValue(0)
  let nextFrameId = 40
  const request = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = ++nextFrameId
    pending.set(id, callback)
    return id
  })
  const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
    canceled.push(id)
    pending.delete(id)
  })
  onTestFinished(() => {
    try {
      for (const stop of stops) stop()
    } finally {
      pending.clear()
      request.mockRestore()
      cancel.mockRestore()
      clock.mockRestore()
      // This page-lifetime port has no uninstall operation; release the tested map.
      setSceneContext({ tilemap: walkableTilemap(8, 8) })
      for (const [key, value] of settings) {
        if (value === null) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      }
    }
  })
  function start(ctx = prepareEmptyLoopContext()): () => void {
    const stop = startRafLoop(ctx)
    stops.push(stop)
    return stop
  }
  function frame(id: number, time: number): void {
    const callback = pending.get(id)
    pending.delete(id)
    expect(callback).toBeTypeOf('function')
    callback?.(time)
  }
  return { pending, canceled, start, frame }
}

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
    const queue = installRafQueue()
    const stopInitial = queue.start()
    expect([...queue.pending.keys()]).toEqual([41])
    stopInitial()
    expect(queue.canceled).toEqual([41])
    expect(queue.pending.size).toBe(0)
    const stopAdvanced = queue.start()
    expect([...queue.pending.keys()]).toEqual([42])
    queue.frame(42, 10)
    expect([...queue.pending.keys()]).toEqual([43])
    stopAdvanced()
    expect(queue.canceled).toEqual([41, 43])
    expect(queue.pending.size).toBe(0)
  })

  it('多帧按逻辑间隔呈现，并取消最新的待执行回调', () => {
    const queue = installRafQueue()
    const present = vi.fn()
    const ctx = prepareEmptyLoopContext(undefined, present)
    const stop = queue.start(ctx)
    expect([...queue.pending.keys()]).toEqual([41])
    queue.frame(41, 100)
    expect(ctx.gs.frameNum).toBe(1)
    expect([...queue.pending.keys()]).toEqual([42])
    queue.frame(42, 250)
    expect(ctx.gs.frameNum).toBe(2)
    expect([...queue.pending.keys()]).toEqual([43])
    queue.frame(43, 280)
    expect(ctx.gs.frameNum).toBe(2)
    expect(present).toHaveBeenCalledTimes(2)
    expect([...queue.pending.keys()]).toEqual([44])
    stop()
    expect(queue.canceled).toEqual([44])
    expect(queue.pending.size).toBe(0)
  })
})
