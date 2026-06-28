/**
 * 移动 = 意图 → 纯函数碰撞判定 → 结果（D2/D5 红线）。
 * 纯函数、不碰 DOM、碰撞源由调用方注入（isBlocked），可独立单测。
 *
 * 菱形轴(D16):走一格 = 单轴 ±1(intent.dcol 或 intent.drow),绝不对角。
 * 撞墙就原地停(不滑行)——菱形轴下天然如此(单轴步进,目标挡即停,无"部分走"歧义)。
 */
import type { GridPos } from '@type-pal/content'

export interface MoveIntent {
  /** 沿菱形 col 轴的步进(±1 或 0)。 */
  dcol: number
  /** 沿菱形 row 轴的步进(±1 或 0)。 */
  drow: number
}

/** 给定格坐标是否被阻挡（墙 / 家具 / 界外）。由调用方注入。 */
export type IsBlocked = (pos: GridPos) => boolean

export function resolveMove(pos: GridPos, intent: MoveIntent, isBlocked: IsBlocked): GridPos {
  // 目标开阔 → 走满意图;被挡 → 原地停(撞墙停步,保持站位)。
  const next: GridPos = {
    col: pos.col + intent.dcol,
    row: pos.row + intent.drow,
    height: pos.height, // 移动不改 height(地面行走恒 0;飞行机制留后续)
  }
  if (!isBlocked(next)) {
    return next
  }
  return pos
}
