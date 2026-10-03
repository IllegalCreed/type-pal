/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G09-B。
 * 淡入门、余量边界、drain 和 rAF 取消。不重领 40/100、巨大 dt 和 palette/battleFade。
 */
import type { InputSource, Tilemap } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { BattleState } from '../core/battle/battle-state.js'
import { type BusEntry, type CommandBus, createCommandBus } from '../core/command-bus.js'
import { createInitialGameState } from '../core/game-state.js'
import { createSeedableRng } from '../core/rng.js'
import { setSceneContext } from '../core/scene-system.js'
import {
  advanceRafFrame,
  type LoopContext,
  type RafLoopState,
  startRafLoop,
  tickN,
} from './main-loop.js'

function flat(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tileset: 'fake' }
}

function ctxOf(
  gs = createInitialGameState({ x: 0, y: 0, facing: 'down' }),
  onPresent: LoopContext['onPresent'] = () => {},
): LoopContext {
  const ctx: LoopContext = {
    gs,
    bus: createCommandBus(),
    input: { nextSnapshot: (frameNum) => ({ held: new Set(), pressed: new Set(), frameNum }) },
    tilemap: flat(8, 8),
    eventCommands: [],
    labelMap: {},
    onPresent,
  }
  setSceneContext({
    tilemap: ctx.tilemap,
    eventCommands: ctx.eventCommands,
    labelMap: ctx.labelMap,
  })
  return ctx
}

function fresh(): RafLoopState {
  return { lastTickTime: 0, accumulator: 0 }
}

function battleWithAnim(): BattleState {
  return {
    players: [
      {
        roleId: 0,
        prevHp: 41,
        prevMp: 12,
        defending: false,
        status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
      },
    ],
    enemies: [],
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    phase: 'selectAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'selectMove',
    menuState: 'main',
    selectedAction: 0,
    uiCursor: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
    battleAnim: { frames: [{ durationMs: 40 }], idx: 0, frameElapsedMs: 0 },
  }
}

describe('G09-B 主循环门控', () => {
  it('G09-B01 dither fadeState 在未到逻辑间隔时仍 present，且 ticked 为 false', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.fadeState = { speed: 2, totalMs: 2160, startTimeMs: 0, appliedSteps: 0 }
    let flag: boolean | null = null
    const result = advanceRafFrame(
      fresh(),
      10,
      ctxOf(gs, (_drained, ticked) => {
        flag = ticked
      }),
    )
    expect(result.ticked).toBe(false)
    expect(result.presented).toBe(true)
    expect(flag).toBe(false)
  })

  it('G09-B02 battleAnim 在未到逻辑间隔时仍 present', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.battleState = battleWithAnim()
    const result = advanceRafFrame(fresh(), 10, ctxOf(gs))
    expect(result.ticked).toBe(false)
    expect(result.presented).toBe(true)
  })

  it('G09-B03 dt 150 只 tick 一次，并把 50ms 余量留在累加器', () => {
    const state = fresh()
    const result = advanceRafFrame(state, 150, ctxOf())
    expect(result.ticked).toBe(true)
    expect(state.accumulator).toBe(50)
  })

  it('G09-B04 dt 200 结转后余量正好等于间隔，不丢弃', () => {
    const state = fresh()
    const result = advanceRafFrame(state, 200, ctxOf())
    expect(result.ticked).toBe(true)
    expect(state.accumulator).toBe(100)
  })

  it('G09-B05 冻结时不足一个间隔的余量保留，且不 present', () => {
    const state = fresh()
    const result = advanceRafFrame(state, 40, ctxOf(), undefined, true)
    expect(result.ticked).toBe(false)
    expect(result.presented).toBe(false)
    expect(state.accumulator).toBe(40)
  })

  it('G09-B06 逻辑 tick 把 bus.drain 的那一条命令交给 onPresent', () => {
    const entry: BusEntry = { cmdId: 7, cmd: { op: 'clearDialogBox' } }
    const bus: CommandBus = {
      emit: () => 1,
      drain: () => [entry],
      complete: () => {},
    }
    let got: BusEntry[] = []
    const ctx = ctxOf(undefined, (drained) => {
      got = drained
    })
    ctx.bus = bus
    const result = advanceRafFrame(fresh(), 100, ctx)
    expect(result.ticked).toBe(true)
    expect(got).toEqual([entry])
  })

  it('G09-B07 发生逻辑 tick 时 nowMs 写成这一帧的时间戳', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    advanceRafFrame(fresh(), 2500, ctxOf(gs))
    expect(gs.nowMs).toBe(2500)
  })

  it('G09-B08 dump 使用调用方给出的 partyWalkFrames 4', () => {
    const seen: number[] = []
    const ctx = ctxOf()
    ctx.partyWalkFrames = 4
    advanceRafFrame(fresh(), 100, ctx, {
      enabled: true,
      push: (_gs, walkFrames) => {
        seen.push(walkFrames)
      },
    })
    expect(seen).toEqual([4])
  })

  it('G09-B09 未给 partyWalkFrames 时 dump 使用 3', () => {
    const seen: number[] = []
    advanceRafFrame(fresh(), 100, ctxOf(), {
      enabled: true,
      push: (_gs, walkFrames) => {
        seen.push(walkFrames)
      },
    })
    expect(seen).toEqual([3])
  })

  it('G09-B10 没有 suppressHeldForFade 的输入源在 scene-fade 里仍按 fadeState present', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.eventCursor = { ip: 0, waiting: 'scene-fade' }
    gs.fadeState = { speed: 1, totalMs: 720, startTimeMs: 0, appliedSteps: 0 }
    const input: InputSource = {
      nextSnapshot: (frameNum) => ({ held: new Set(), pressed: new Set(), frameNum }),
    }
    const ctx = ctxOf(gs)
    ctx.input = input
    const result = advanceRafFrame(fresh(), 10, ctx)
    expect(result.ticked).toBe(false)
    expect(result.presented).toBe(true)
  })

  it('G09-B11 探索累到 90 后切战斗，同一时间戳用 40ms 间隔 tick 一次并清掉超额余量', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const state = fresh()
    const ctx = ctxOf(gs)
    const first = advanceRafFrame(state, 90, ctx)
    expect(first.ticked).toBe(false)
    expect(state.accumulator).toBe(90)
    gs.mode = 'battle'
    const second = advanceRafFrame(state, 90, ctx)
    expect(second.ticked).toBe(true)
    expect(state.accumulator).toBe(0)
  })

  it('G09-B12 tickN(0) 不 present，帧号保持 0', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    let calls = 0
    tickN(
      0,
      ctxOf(gs, () => {
        calls += 1
      }),
    )
    expect(calls).toBe(0)
    expect(gs.frameNum).toBe(0)
  })

  it('G09-B13 startRafLoop 的取消函数取消的是刚刚排上的那一帧', () => {
    const origRaf = globalThis.requestAnimationFrame
    const origCancel = globalThis.cancelAnimationFrame
    let scheduled = 0
    let canceled = -1
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      void cb
      scheduled = 41
      return 41
    }) as typeof requestAnimationFrame
    globalThis.cancelAnimationFrame = (id: number) => {
      canceled = id
    }
    try {
      const cancel = startRafLoop(ctxOf())
      expect(scheduled).toBe(41)
      cancel()
      expect(canceled).toBe(41)
    } finally {
      globalThis.requestAnimationFrame = origRaf
      globalThis.cancelAnimationFrame = origCancel
    }
  })
})
