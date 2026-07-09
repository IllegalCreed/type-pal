/**
 * 自有地图(W7)—— 作者绘制的地图,复用引擎 Tilemap 形(width/height/cells{lower,upper}/tileset),
 * 存工程内 content/maps/<id>.json,引擎渲染/碰撞与复用原版地图一套代码。
 * 本文件:地图构造/编辑纯逻辑(TDD);tileset 引用解析(蹭原版号 / 自有)= W7a-4 加载分流。
 *
 * 子格模型(W7c,与 render/collision 同源):cell.lower / cell.upper 不是图层,是同一格的
 * 两个**错排菱形子格**(h=0 整格位 / h=1 右下偏半格);每个子格 word 是完整 u32 ——
 * layer0 瓦片 = 位 0-7 + 位 12 作第 9 位,layer1 在高 16 位(0=无),高度位 8-11,障碍 bit13。
 */
import type { TileCell, Tilemap } from '@type-pal/shared'

/** 空白自有地图:cols×rows 全空格(lower/upper=0),引用给定 tileset。 */
export function buildBlankOwnMap(cols: number, rows: number, tileset: string): Tilemap {
  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: cols, height: rows, cells, tileset }
}

/** layer0 可编码的最大瓦片索引(9 位:位 0-7 + 位 12)。面板超界瓦片禁选。 */
export const MAX_LAYER0_TILE = 0x1ff

/**
 * 瓦片索引 → 子格 word(仅 layer0 位;layer1/高度/障碍 = 0 —— 笔刷画的新格是干净地板)。
 * 逆运算 = render.ts tileIdLayer0。0 = 空(tileset frame 0 惯例为透明/黑帧)。
 */
export function encodeTileLayer0(tileId: number): number {
  return (tileId & 0xff) | ((tileId & 0x100) << 4)
}

/** 一笔子格编辑:h=0 写 cell.lower,h=1 写 cell.upper;word 为完整子格值。 */
export interface SubTileEdit {
  col: number
  row: number
  h: 0 | 1
  word: number
}

/**
 * 不可变 cell patch:按 edits 写子格 word,只克隆触及的行;界外/重复以后者为准。
 * 笔刷 stroke 预览(每帧临时图)与 PaintTilesCommand(入 undo)共用。
 */
export function paintCells(map: Tilemap, edits: readonly SubTileEdit[]): Tilemap {
  const touched = new Set<number>()
  for (const e of edits) {
    if (e.row >= 0 && e.row < map.height && e.col >= 0 && e.col < map.width) touched.add(e.row)
  }
  if (touched.size === 0) return map
  const cells = map.cells.map((row, ri) =>
    touched.has(ri) ? row.map((c): TileCell => ({ ...c })) : row,
  )
  for (const e of edits) {
    const cell = cells[e.row]?.[e.col]
    if (!cell) continue
    if (e.h === 0) cell.lower = e.word
    else cell.upper = e.word
  }
  return { ...map, cells }
}
