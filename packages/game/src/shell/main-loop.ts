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

/** 按 gs.mode 选 tick interval —— battle 40ms / 其他 100ms。 */
function tickIntervalMs(gs: GameState): number {
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

    const interval = tickIntervalMs(ctx.gs)
    while (accumulator >= interval) {
      singleTick(ctx, dump)
      accumulator -= interval
    }
    // mode 切换时 clamp:避免 explore→battle 一下子 catch-up 多 tick
    if (accumulator > interval * 3) accumulator = interval

    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(raf)
}
