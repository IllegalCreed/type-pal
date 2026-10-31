import type { InputSource } from '@type-pal/shared'
import { FRAME_MS_BATTLE, FRAME_MS_EXPLORE } from '@type-pal/shared'
import { describe, expect, it, vi } from 'vitest'
import { createBattleState } from '../core/battle/battle-state.js'
import type { BusEntry, CommandBus } from '../core/command-bus.js'
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState } from '../core/game-state.js'
import { buildPaletteFade } from '../core/palette-fade.js'
import { createSeedableRng } from '../core/rng.js'
import { setSceneContext } from '../core/scene-system.js'
import { heldSnapshot, prepareEmptyLoopContext } from './__tests__/loop-context.js'
import { walkableTilemap } from './__tests__/loop-tilemap.js'
import { ReplayInputSource } from './input.js'
import type { LoopContext, RafLoopState } from './main-loop.js'
import { advanceRafFrame, logicIntervalMs } from './main-loop.js'

function prepareReplayLoopContext(
  gs: ReturnType<typeof createInitialGameState>,
  onPresent: () => void,
): LoopContext {
  const ctx: LoopContext = {
    gs,
    bus: createCommandBus(),
    input: new ReplayInputSource([]),
    tilemap: walkableTilemap(10, 10),
    onPresent,
  }
  setSceneContext({ tilemap: ctx.tilemap })
  return ctx
}

function paletteFadeFixture() {
  const start = Array.from({ length: 256 }, (): [number, number, number] => [0, 0, 0])
  const target = Array.from({ length: 256 }, (): [number, number, number] => [9, 9, 9])
  return buildPaletteFade(start, target, 600, 0)
}

/** Only presence-based render gates at10ms; no battle logic/resource tick. */
function createPresentationBattle(gs: ReturnType<typeof createInitialGameState>) {
  return createBattleState({
    gs,
    playerRoles: { roles: [] },
    enemies: [],
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    rng: createSeedableRng(1),
  })
}

function captureFadeSuppression(gs: ReturnType<typeof createInitialGameState>) {
  const suppress = vi.fn()
  const ctx: LoopContext = {
    gs,
    bus: createCommandBus(),
    input: { nextSnapshot: () => heldSnapshot(), suppressHeldForFade: suppress },
    tilemap: walkableTilemap(10, 10),
    onPresent: () => {},
  }
  advanceRafFrame({ lastTickTime: 0, accumulator: 0 }, 10, ctx)
  return suppress
}

function freshRafState(): RafLoopState {
  return { lastTickTime: 0, accumulator: 0 }
}

describe('Frame intervals and accumulation', () => {
  it('logicIntervalMs:battle 40 / 否则 100', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'explore'
    expect(logicIntervalMs(gs)).toBe(FRAME_MS_EXPLORE)
    gs.mode = 'battle'
    expect(logicIntervalMs(gs)).toBe(FRAME_MS_BATTLE)
  })
  it('accumulator clamp:巨大 dt 只推进一次逻辑，丢弃超过一间隔的剩余积压', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' }) // explore → interval 100
    let ticks = 0
    const ctx = prepareReplayLoopContext(gs, () => {})
    const orig = ctx.input.nextSnapshot.bind(ctx.input)
    ctx.input.nextSnapshot = (fn: number) => {
      ticks++
      return orig(fn)
    }
    const state = { lastTickTime: 0, accumulator: 0 }
    advanceRafFrame(state, 1000, ctx) // dt=1000，先推进一次并减100；剩余900>100，故清为0，不追跑10次
    expect(ticks).toBe(1)
    expect(state.accumulator).toBe(0)
  })
  it('稳态节奏:60Hz 显示器下 battle 应 25 tick/s(40ms/tick),不被累积器丢余量拖慢', () => {
    // 回归(2026-06-13 user 报"怪物死亡淡出比原版长"):DM31 把 tick 后 `accumulator -= interval`
    //   改成 `accumulator = 0`,丢弃了 [interval, interval+rafDt) 的溢出量。battle interval=40ms
    //   不是 60Hz 帧时(16.667ms)的整数倍 → 每 tick 实际等 3 帧=50ms → 全战斗动画(含
    //   PAL_BattleFadeScene 死亡淡出 72×16ms)在 60Hz 上慢 25%(此处 2s 只跑 40 tick,应 50)。
    //   本例只核 60Hz 下的逻辑节奏；不据此宣称所有刷新率或实际渲染表现。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'battle' // interval=40;battleState 未设 → tickBattle 早退(纯节奏 no-op)
    let ticks = 0
    const ctx = prepareReplayLoopContext(gs, () => {})
    const state = { lastTickTime: 0, accumulator: 0 }
    const rafDt = 1000 / 60
    for (let i = 1; i <= 120; i++) {
      // 2s @ 60Hz
      if (advanceRafFrame(state, i * rafDt, ctx).ticked) ticks++
    }
    // 忠实节奏 = FPS_BATTLE × 2s = 50;DM31 缺陷给 40。容差 ±1 防浮点边界。
    expect(ticks).toBeGreaterThanOrEqual(49)
    expect(ticks).toBeLessThanOrEqual(51)
  })
  it('present 门控:无 tick + 无 fade → 不 present;有 paletteFade → present', () => {
    const gs1 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const p1 = vi.fn()
    const r1 = advanceRafFrame(
      { lastTickTime: 0, accumulator: 0 },
      10,
      prepareReplayLoopContext(gs1, p1),
    ) // dt=10 < 100 → 无 tick
    expect(r1.ticked).toBe(false)
    expect(p1).not.toHaveBeenCalled()
    const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs2.paletteFadeState = paletteFadeFixture()
    const p2 = vi.fn()
    advanceRafFrame({ lastTickTime: 0, accumulator: 0 }, 10, prepareReplayLoopContext(gs2, p2))
    expect(p2).toHaveBeenCalled() // fade 进行中每帧 present
  })
  it('battleFade(D17 死亡淡出)门控:无 tick 也每 rAF present(wall-clock 细分平滑)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'battle'
    gs.battleState = createPresentationBattle(gs)
    gs.battleState.battleFade = { elapsedMs: 0 }
    const present = vi.fn()
    // dt=10 < 40(battle interval)→ 无逻辑 tick;但 battleFade active → 仍须 present(否则淡出顿挫在 25fps)
    const r = advanceRafFrame(
      { lastTickTime: 0, accumulator: 0 },
      10,
      prepareReplayLoopContext(gs, present),
    )
    expect(r.ticked).toBe(false)
    expect(present).toHaveBeenCalled()
  })
  it('frozen=true:累积达 interval 也不 tick(速通手动暂停冻结世界)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' }) // explore interval 100
    let ticks = 0
    const ctx = prepareReplayLoopContext(gs, () => {})
    const orig = ctx.input.nextSnapshot.bind(ctx.input)
    ctx.input.nextSnapshot = (fn: number) => {
      ticks++
      return orig(fn)
    }
    const state = { lastTickTime: 0, accumulator: 0 }
    const r = advanceRafFrame(state, 1000, ctx, undefined, true) // dt=1000≥interval,但 frozen
    expect(ticks).toBe(0)
    expect(r.ticked).toBe(false)
    expect(state.accumulator).toBe(0)
  })
})

describe('Scene fade input suppression', () => {
  it("waiting='scene-fade'(0x93/0x80-update)→ 每 rAF 抑制按键(C 每步清键)", () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.paletteFadeState = paletteFadeFixture()
    gs.eventCursor = { ip: 0, waiting: 'scene-fade' }
    expect(captureFadeSuppression(gs)).toHaveBeenCalled()
  })
  it("waiting='palette-fade'(0x50/0x51/0x8C/0x4F)→ 不抑制(C 不清键,按键应累积)", () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.paletteFadeState = paletteFadeFixture()
    gs.eventCursor = { ip: 0, waiting: 'palette-fade' }
    expect(captureFadeSuppression(gs)).not.toHaveBeenCalled()
  })
  it('无游标的自动渐入(战后/进场 PAL_FadeIn)→ 不抑制(战后卡键根因)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.paletteFadeState = paletteFadeFixture() // explore 自动渐入:无 eventCursor
    expect(captureFadeSuppression(gs)).not.toHaveBeenCalled()
  })
  it('无渐变 → 不抑制', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(captureFadeSuppression(gs)).not.toHaveBeenCalled()
  })
})

describe('Present and input gates', () => {
  it('dither fadeState 在未到逻辑间隔时仍 present，且 ticked 为 false', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.fadeState = { speed: 2, totalMs: 2160, startTimeMs: 0, appliedSteps: 0 }
    let flag: boolean | null = null
    const result = advanceRafFrame(
      freshRafState(),
      10,
      prepareEmptyLoopContext(gs, (_drained, ticked) => {
        flag = ticked
      }),
    )
    expect(result.ticked).toBe(false)
    expect(result.presented).toBe(true)
    expect(flag).toBe(false)
  })
  it('battleAnim 在未到逻辑间隔时仍 present', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.battleState = createPresentationBattle(gs)
    gs.battleState.battleAnim = { frames: [{ durationMs: 40 }], idx: 0, frameElapsedMs: 0 }
    const result = advanceRafFrame(freshRafState(), 10, prepareEmptyLoopContext(gs))
    expect(result.ticked).toBe(false)
    expect(result.presented).toBe(true)
  })
  it('没有 suppressHeldForFade 的输入源在 scene-fade 里仍按 fadeState present', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.eventCursor = { ip: 0, waiting: 'scene-fade' }
    gs.fadeState = { speed: 1, totalMs: 720, startTimeMs: 0, appliedSteps: 0 }
    const input: InputSource = {
      nextSnapshot: (frameNum) => ({ held: new Set(), pressed: new Set(), frameNum }),
    }
    const ctx = prepareEmptyLoopContext(gs)
    ctx.input = input
    const result = advanceRafFrame(freshRafState(), 10, ctx)
    expect(result.ticked).toBe(false)
    expect(result.presented).toBe(true)
  })
})

describe('Accumulator boundaries', () => {
  it('dt 150 只 tick 一次，并把 50ms 余量留在累加器', () => {
    const state = freshRafState()
    const result = advanceRafFrame(state, 150, prepareEmptyLoopContext())
    expect(result.ticked).toBe(true)
    expect(state.accumulator).toBe(50)
  })
  it('dt 200 结转后余量正好等于间隔，不丢弃', () => {
    const state = freshRafState()
    const result = advanceRafFrame(state, 200, prepareEmptyLoopContext())
    expect(result.ticked).toBe(true)
    expect(state.accumulator).toBe(100)
  })
  it('冻结时不足一个间隔的余量保留，且不 present', () => {
    const state = freshRafState()
    const result = advanceRafFrame(state, 40, prepareEmptyLoopContext(), undefined, true)
    expect(result.ticked).toBe(false)
    expect(result.presented).toBe(false)
    expect(state.accumulator).toBe(40)
  })
  it('探索累到 90 后切战斗，同一时间戳用 40ms 间隔 tick 一次并清掉超额余量', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const state = freshRafState()
    const ctx = prepareEmptyLoopContext(gs)
    const first = advanceRafFrame(state, 90, ctx)
    expect(first.ticked).toBe(false)
    expect(state.accumulator).toBe(90)
    gs.mode = 'battle'
    const second = advanceRafFrame(state, 90, ctx)
    expect(second.ticked).toBe(true)
    expect(state.accumulator).toBe(0)
  })
})

describe('Tick effects and dump forwarding', () => {
  it('逻辑 tick 把 bus.drain 的那一条命令交给 onPresent', () => {
    const entry: BusEntry = { cmd: { op: 'stopMusic', fadeMs: 0 } }
    const bus: CommandBus = {
      emit: () => {},
      drain: () => [entry],
    }
    let got: BusEntry[] = []
    const ctx = prepareEmptyLoopContext(undefined, (drained) => {
      got = drained
    })
    ctx.bus = bus
    const result = advanceRafFrame(freshRafState(), 100, ctx)
    expect(result.ticked).toBe(true)
    expect(got).toEqual([entry])
  })
  it('发生逻辑 tick 时 nowMs 写成这一帧的时间戳', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    advanceRafFrame(freshRafState(), 2500, prepareEmptyLoopContext(gs))
    expect(gs.nowMs).toBe(2500)
  })
  it('dump 使用调用方给出的 partyWalkFrames 4', () => {
    const seen: number[] = []
    const ctx = prepareEmptyLoopContext()
    ctx.partyWalkFrames = 4
    advanceRafFrame(freshRafState(), 100, ctx, {
      enabled: true,
      push: (_gs, walkFrames) => {
        seen.push(walkFrames)
      },
    })
    expect(seen).toEqual([4])
  })
  it('未给 partyWalkFrames 时 dump 使用 3', () => {
    const seen: number[] = []
    advanceRafFrame(freshRafState(), 100, prepareEmptyLoopContext(), {
      enabled: true,
      push: (_gs, walkFrames) => {
        seen.push(walkFrames)
      },
    })
    expect(seen).toEqual([3])
  })
})
