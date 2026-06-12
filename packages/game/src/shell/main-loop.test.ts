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
    // M5:起点 col8/row8 合法区(避开 fCheckRange 边缘带 blockX=5/blockY=7)
    const gs = createInitialGameState({ x: 16 * 16, y: 16 * 8, facing: 'down' })
    const bus = createCommandBus()
    const ctx: LoopContext = {
      gs, bus,
      input: new ReplayInputSource([
        snap(['Right'], 0),
        snap(['Right'], 1),
        snap(['Right'], 2),
      ]),
      tilemap: flat(20, 20),
      eventCommands: [], labelMap: {},
      onPresent: () => {},
    }
    tickN(3, ctx)
    // sdlpal scene.c:804-805 East: dx=+16, dy=+8 × 3 steps
    expect(gs.party.x).toBe(19 * 16)
    expect(gs.party.y).toBe(19 * 8)
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

// ── 战后渐变吞键回归(2026-06-12 user 报"打完怪 fadeout 后卡一下按键"):
// C 真值:渐变期间清键(每步 PAL_ClearKeyState + dir=Unknown)**只有** PAL_SceneFade(0x93,
// palette.c:314-316)和 PAL_PaletteFade 的 fUpdateScene 变体(0x80,palette.c:441-446)——
// 恰好 = 我们 waiting='scene-fade' 的集合。PAL_FadeOut/FadeIn/ColorFade/FadeToRed(0x50/0x51/
// 0x8C/0x4F/战后自动渐入)是纯色表 ramp,不清键:按键累积、按住的方向 fade 一结束立即生效。
// 旧 DM30 把清键泛化到所有 paletteFadeState → 战后 ~1.2s 吞键 + 按住方向须松开重按。
describe('渐变吞键仅限 scene-fade(palette.c 真值边界)', () => {
  const mkFade = () => ({
    startColors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
    targetColors: Array.from({ length: 256 }, () => [9, 9, 9] as [number, number, number]),
    startTimeMs: 0,
    totalMs: 600,
    mode: 'lerp' as const,
    steps: 60,
    increment: 0,
  })
  function run(gs: ReturnType<typeof createInitialGameState>) {
    const suppress = vi.fn()
    const ctx: LoopContext = {
      gs,
      bus: createCommandBus(),
      input: { nextSnapshot: () => snap(), suppressHeldForFade: suppress },
      tilemap: flat(10, 10),
      eventCommands: [], labelMap: {},
      onPresent: () => {},
    }
    advanceRafFrame({ lastTickTime: 0, accumulator: 0 }, 10, ctx)
    return suppress
  }

  it("waiting='scene-fade'(0x93/0x80-update)→ 每 rAF 抑制按键(C 每步清键)", () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.paletteFadeState = mkFade()
    gs.eventCursor = { ip: 0, waiting: 'scene-fade' } as typeof gs.eventCursor
    expect(run(gs)).toHaveBeenCalled()
  })

  it("waiting='palette-fade'(0x50/0x51/0x8C/0x4F)→ 不抑制(C 不清键,按键应累积)", () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.paletteFadeState = mkFade()
    gs.eventCursor = { ip: 0, waiting: 'palette-fade' } as typeof gs.eventCursor
    expect(run(gs)).not.toHaveBeenCalled()
  })

  it('无游标的自动渐入(战后/进场 PAL_FadeIn)→ 不抑制(战后卡键根因)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.paletteFadeState = mkFade() // explore 自动渐入:无 eventCursor
    expect(run(gs)).not.toHaveBeenCalled()
  })

  it('无渐变 → 不抑制', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(run(gs)).not.toHaveBeenCalled()
  })
})
