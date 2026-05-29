/**
 * 主循环 wrapper(02 架构 + D13 + M3 T28)。
 *  - tickN(n, ctx):headless,跑 n 个逻辑 tick,供 e2e / record-replay 用。
 *  - startRafLoop(ctx):浏览器,rAF + accumulator 节流;按 gs.mode 切 fps
 *    (explore/event 10fps,battle 25fps),返回 cancel。
 *
 * setSceneContext 在 loop 启动前调用一次:ctx_singleton 在 loop 生命期内有效。
 * 不在每 tick 重设,避免和 EventSystem 装载的 cursor.commands 错位。
 *
 * T28 帧率切换设计:
 *   - 每个 raf 都按当前 gs.mode 决定 interval(累积 dt → accumulator)。
 *   - mode 中途切(explore → battle 或反向)时 accumulator 不清零;若累积过多
 *     (> 3 × interval)clamp 到 1 × interval,避免一下子 catch-up N tick。
 *   - tickN 仍是固定 step(不参与帧率),只跑逻辑用。
 */

import type { Command, InputSource, Tilemap } from '@type-pal/shared'
import { FRAME_MS_BATTLE, FRAME_MS_EXPLORE } from '@type-pal/shared'
import type { BusEntry, CommandBus } from '../core/command-bus.js'
import type { GameState } from '../core/game-state.js'
import { tickByMode } from '../core/mode.js'
import { setSceneContext } from '../core/scene-system.js'
import { initStateDump } from './state-dump.js'

export interface LoopContext {
  gs: GameState
  bus: CommandBus
  input: InputSource
  tilemap: Tilemap
  eventCommands: Command[]
  labelMap: Record<string, number>
  onPresent: (drained: BusEntry[]) => void
  /** sdlpal `PlayerRoles.rgwWalkFrames[leaderRoleId]`(3 或 4),dump 计算 wFrame 用 */
  partyWalkFrames?: number
}

/**
 * **逻辑** tick interval —— battle 40ms / 其他 100ms。**fade 不再提速逻辑**。
 *
 * 旧设计:fade 进行中把 tick 提到 16ms(60fps)让 present 多采样平滑 fade。副作用:fade 期间
 * 走步 / 打字 / frame-wait(都是每 tick 推进的逻辑)被一起加速 6×(香兰报信 cutscene 瞬移+一口气根因)。
 * 现解耦(2026-05-30):逻辑固定 100/40ms;fade 的平滑由 startRafLoop 在 fade 进行中**每 raf 帧** present
 * 实现(present.ts 内按 wall-clock 步进 fade,duration time-based 不变)。
 */
function logicIntervalMs(gs: GameState): number {
  return gs.mode === 'battle' ? FRAME_MS_BATTLE : FRAME_MS_EXPLORE
}

function singleTick(ctx: LoopContext, dump?: ReturnType<typeof initStateDump>): void {
  const snap = ctx.input.nextSnapshot(ctx.gs.frameNum)
  tickByMode(ctx.gs, snap, ctx.bus)
  const drained = ctx.bus.drain()
  ctx.onPresent(drained)
  // 对照 sdlpal dump-frames.patch hook 位置:tickByMode 后(等同 PAL_StartFrame 末尾)
  if (dump?.enabled) dump.push(ctx.gs, ctx.partyWalkFrames ?? 3)
}

function applySceneContext(ctx: LoopContext): void {
  setSceneContext({
    tilemap: ctx.tilemap,
    eventCommands: ctx.eventCommands,
    labelMap: ctx.labelMap,
  })
}

export function tickN(n: number, ctx: LoopContext): void {
  applySceneContext(ctx)
  for (let i = 0; i < n; i++) singleTick(ctx)
}

export function startRafLoop(ctx: LoopContext): () => void {
  applySceneContext(ctx)
  const dump = initStateDump()
  let lastTickTime = performance.now()
  let accumulator = 0
  let raf = 0
  const loop = (now: number): void => {
    const dt = now - lastTickTime
    lastTickTime = now
    accumulator += dt

    const interval = logicIntervalMs(ctx.gs)
    let drained: BusEntry[] = []
    let ticked = false
    while (accumulator >= interval) {
      const snap = ctx.input.nextSnapshot(ctx.gs.frameNum)
      tickByMode(ctx.gs, snap, ctx.bus)
      const d = ctx.bus.drain()
      if (d.length) drained = drained.length ? [...drained, ...d] : d
      if (dump?.enabled) dump.push(ctx.gs, ctx.partyWalkFrames ?? 3)
      ticked = true
      accumulator -= interval
    }
    // mode 切换时 clamp:避免 explore→battle 一下子 catch-up 多 tick
    if (accumulator > interval * 3) accumulator = interval

    // 渲染/逻辑解耦(2026-05-30 香兰 cutscene 修):逻辑 tick 时必 present;此外 fade(dither/palette)
    //   进行中**每 raf 帧**都 present → present.ts 内按 wall-clock 平滑步进 fade。逻辑(走步/打字/
    //   frame-wait)不再被 fade 提速。非 fade 且无 tick 时跳过 present(避免空转重画)。
    if (ticked || ctx.gs.fadeState != null || ctx.gs.paletteFadeState != null) {
      ctx.onPresent(drained)
    }

    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(raf)
}
