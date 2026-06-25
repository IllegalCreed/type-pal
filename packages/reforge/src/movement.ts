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
  // 目标开阔 → 走满；被挡 → 原地停。
  // ⚠ 不做单轴滑行：iso 一步 = (±16,±8)，x/16 与 y/8 各变 1 → 和的奇偶守恒（站立点不变量）。
  // 单轴回退 (±16,0)/(0,±8) 只动一个分量 → 奇偶翻转 → 站到等距格缝，且之后步步守恒在
  // 错基点 → 永久半格（用户实测：一撞墙就半格、之后一直半格）。撞墙就停也更忠实原版。
  if (!isBlocked(pos.x + intent.dx, pos.y + intent.dy)) {
    return { x: pos.x + intent.dx, y: pos.y + intent.dy }
  }
  return pos
}
