/** 当前探索资源的唯一模块级Owner；bootstrap与显式场景装载在资源就绪后替换它。
 * tick可显式传入地图上下文；脚本由script-catalog统一持有，不在这里重复保存。
 */
import type { Tilemap } from '@type-pal/shared'

export interface SceneContext {
  tilemap: Tilemap
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
