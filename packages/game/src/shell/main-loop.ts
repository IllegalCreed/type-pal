/**
 * 主循环 wrapper(02 架构 + D13)。
 *  - tickN(n, ctx):headless,跑 n 个逻辑 tick,供 e2e / record-replay 用。
 *  - startRafLoop(ctx):浏览器,rAF + 节流到 10fps(explore),返回 cancel。
 *
 * setSceneContext 在 loop 启动前调用一次:ctx_singleton 在 loop 生命期内有效。
 * 不在每 tick 重设,避免和 EventSystem 装载的 cursor.commands 错位。
 */

import type { Command, InputSource, Tilemap } from '@type-pal/shared'
import type { BusEntry, CommandBus } from '../core/command-bus.js'
import type { GameState } from '../core/game-state.js'
import { tickByMode } from '../core/mode.js'
import { setSceneContext } from '../core/scene-system.js'

export interface LoopContext {
  gs: GameState
  bus: CommandBus
  input: InputSource
  tilemap: Tilemap
  eventCommands: Command[]
  labelMap: Record<string, number>
  onPresent: (drained: BusEntry[]) => void
}

const FRAME_MS = 100 // D13: 10fps explore

function singleTick(ctx: LoopContext): void {
  const snap = ctx.input.nextSnapshot(ctx.gs.frameNum)
  tickByMode(ctx.gs, snap, ctx.bus)
  const drained = ctx.bus.drain()
  ctx.onPresent(drained)
}

export function tickN(n: number, ctx: LoopContext): void {
  setSceneContext({
    tilemap: ctx.tilemap,
    eventCommands: ctx.eventCommands,
    labelMap: ctx.labelMap,
  })
  for (let i = 0; i < n; i++) singleTick(ctx)
}

export function startRafLoop(ctx: LoopContext): () => void {
  setSceneContext({
    tilemap: ctx.tilemap,
    eventCommands: ctx.eventCommands,
    labelMap: ctx.labelMap,
  })
  let last = performance.now()
  let raf = 0
  const loop = (now: number): void => {
    if (now - last >= FRAME_MS) {
      last = now
      singleTick(ctx)
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(raf)
}
