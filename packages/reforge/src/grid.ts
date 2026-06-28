/**
 * 菱形轴格 ↔ 像素 换算(D16 渲染地基)。
 *
 * 仙剑是等距(isometric)菱形地图:tile 32×16(2:1)。菱形网格 = 旋转 45° 的正交网格,
 * 故坐标轴沿菱形两条斜边走(col/row),不是屏幕像素轴。走一格 = 单轴 ±1(只动 col
 * 或只动 row),任意整数 (col,row) 都合法。GridPos 类型定义在 @type-pal/content。
 */
import type { GridPos } from '@type-pal/content'

export const HALF_W = 16 // iso 一步 x 分量(半个 tile 宽)
export const HALF_H = 8 // iso 一步 y 分量(半个 tile 高)

/** 菱形轴格 → 像素:x = 16(col−row), y = 8(col+row)。height 不投影(独立轴)。 */
export function gridToPixel(p: GridPos): { x: number; y: number } {
  return { x: HALF_W * (p.col - p.row), y: HALF_H * (p.col + p.row) }
}

/** 像素 → 菱形轴格:唯一反解(a=col−row=x/16, b=col+row=y/8)。站位像素必得整数。 */
export function pixelToGrid(x: number, y: number): { col: number; row: number } {
  const a = x / HALF_W // col − row
  const b = y / HALF_H // col + row
  return { col: Math.round((b + a) / 2), row: Math.round((b - a) / 2) }
}
