/**
 * 菱形轴格 ↔ 像素 换算(D16 渲染地基)。
 *
 * 仙剑是等距(isometric)菱形地图:tile 32×16(2:1)。菱形网格 = 旋转 45° 的正交网格,
 * 故坐标轴沿菱形两条斜边走(col/row),不是屏幕像素轴。走一格 = 单轴 ±1(只动 col
 * 或只动 row),任意整数 (col,row) 都合法。
 *
 * 放在 content(非 reforge):纯数学(GPU 无关)、reforge + editor 共用,且 GridPos
 * 类型也在 content —— 依赖方向 reforge→content/editor→content 一致。
 */

/**
 * 实体的菱形轴逻辑坐标(D16)。
 * - col/row:沿菱形两条斜边设轴(非屏幕像素轴)。菱形网格 = 旋转 45° 的正交网格,
 *   走一格 = 单轴 ±1(只动 col 或只动 row,绝不对角),任意整数 (col,row) 都合法。
 *   屏幕像素换算(渲染层):x = 16(col−row), y = 8(col+row)。
 * - height:垂直离地轴,与平面 col/row 正交。地面 = 0;飞行/楼层/高台 > 0。
 *   逻辑/碰撞/影子都在地面 (col,row);height 只把 sprite 显示位置沿屏幕正上方移
 *   (每级 16px,= 对角格 (col−h,row−h) 的屏幕位置)。纯显示层,不进逻辑/碰撞。
 *
 * GridPos = 实体位置的真值类型(玩家/NPC/entry/编辑器摆点都存它)。
 */
export interface GridPos {
  col: number
  row: number
  height: number
}

/** iso 一步 x 分量(半个 tile 宽)。 */
export const HALF_W = 16
/** iso 一步 y 分量(半个 tile 高)。 */
export const HALF_H = 8

/**
 * 菱形轴格 → 像素:x = 16(col−row), y = 8(col+row)。height 不投影(独立轴)。
 */
export function gridToPixel(p: GridPos): { x: number; y: number } {
  return { x: HALF_W * (p.col - p.row), y: HALF_H * (p.col + p.row) }
}

/** 像素 → 菱形轴格:唯一反解(a=col−row=x/16, b=col+row=y/8)。站位像素必得整数。 */
export function pixelToGrid(x: number, y: number): { col: number; row: number } {
  const a = x / HALF_W // col − row
  const b = y / HALF_H // col + row
  return { col: Math.round((b + a) / 2), row: Math.round((b - a) / 2) }
}
