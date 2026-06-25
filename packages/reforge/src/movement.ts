/**
 * 移动 = 意图 → 纯函数碰撞判定 → 结果（D2/D5 红线）。
 * 纯函数、不碰 DOM、碰撞源由调用方注入（isBlocked），可独立单测。
 */

export interface Vec2 {
  x: number
  y: number
}

export interface MoveIntent {
  dx: number
  dy: number
}

/** 给定世界像素坐标是否被阻挡（墙 / 家具 / 界外）。由调用方注入。 */
export type IsBlocked = (x: number, y: number) => boolean

export function resolveMove(pos: Vec2, intent: MoveIntent, isBlocked: IsBlocked): Vec2 {
  // 1) 整体目标开阔 → 走满
  if (!isBlocked(pos.x + intent.dx, pos.y + intent.dy)) {
    return { x: pos.x + intent.dx, y: pos.y + intent.dy }
  }
  // 2) 滑行：只走 x
  if (intent.dx !== 0 && !isBlocked(pos.x + intent.dx, pos.y)) {
    return { x: pos.x + intent.dx, y: pos.y }
  }
  // 3) 滑行：只走 y
  if (intent.dy !== 0 && !isBlocked(pos.x, pos.y + intent.dy)) {
    return { x: pos.x, y: pos.y + intent.dy }
  }
  // 4) 都挡 → 原地
  return pos
}
