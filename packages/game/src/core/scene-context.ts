/** 当前探索资源的唯一模块级Owner；bootstrap与显式场景装载在资源就绪后替换它。
 * tick可显式传入上下文，避免测试共享可变实例；公共SceneContext形状在本次拆分中保留。
 */
import type { Command, Tilemap } from '@type-pal/shared'

export interface SceneContext {
  tilemap: Tilemap
  eventCommands: Command[]
  labelMap: Record<string, number>
}

let activeContext: SceneContext | null = null

export function setSceneContext(ctx: SceneContext): void {
  activeContext = ctx
}

export function requireSceneContext(ctxOverride?: SceneContext): SceneContext {
  const ctx = ctxOverride ?? activeContext
  if (!ctx) throw new Error('scene-system: setSceneContext / ctxOverride 必须先设置')
  return ctx
}
