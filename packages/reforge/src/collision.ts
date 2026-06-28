/**
 * 切片 demo 碰撞：照原版判障碍 —— 端口自 game scene-system.ts isWalkable / tilemapIsBlocked。
 * 像素 → (col,row,h) 走 sdlpal「菱形四分法」(scene.c:556-591)，再查该格子行的
 * **障碍位 bit 13 (0x2000)**（sdlpal map.c:298 `Tiles[y][x][h] & 0x2000`）。h=0→lower，h=1→upper。
 * 界外 = 阻挡。注入给 resolveMove 的 isBlocked。
 *
 * ⚠ 旧格式兼容层(D16):pixelToTile + h/lower-upper 是旧引擎「2视觉层+障碍焊进tile bit」
 * 的遗迹。只要 reforge 还读 data/extracted 的旧 Tilemap,本层就得继续用;迁移器把图翻成
 * 「N层+独立碰撞层」新格式后,整个 pixelToTile 连同 h 退役。新代码用 GridPos 入口
 * (isBlockedAt / sameGrid),不要直接调像素接口。
 */
import type { GridPos } from '@type-pal/content'
import type { Tilemap } from '@type-pal/shared'
import { gridToPixel } from './grid.js'

const TILE_W = 32
const TILE_H = 16

/** 像素 → (col,row,h)，sdlpal 菱形四分法（scene.c:556-591）。 */
function pixelToTile(x: number, y: number): { col: number; row: number; h: 0 | 1 } {
  let col = Math.floor(x / TILE_W)
  let row = Math.floor(y / TILE_H)
  let h: 0 | 1 = 0
  const xr = ((x % TILE_W) + TILE_W) % TILE_W // 0..31（处理负数）
  const yr = ((y % TILE_H) + TILE_H) % TILE_H // 0..15
  if (xr + yr * 2 >= 16) {
    if (xr + yr * 2 >= 48) {
      col++
      row++
    } else if (TILE_W - xr + yr * 2 < 16) {
      col++
    } else if (TILE_W - xr + yr * 2 < 48) {
      h = 1
    } else {
      row++
    }
  }
  return { col, row, h }
}

/** isBlocked(worldX, worldY)：菱形映射 → 格 + 子行 → 障碍位 bit 13 (0x2000)。界外阻挡。 */
export function buildIsBlocked(map: Tilemap): (x: number, y: number) => boolean {
  return (x, y) => {
    const { col, row, h } = pixelToTile(x, y)
    if (col < 0 || col >= map.width || row < 0 || row >= map.height) return true
    const cell = map.cells[row]?.[col]
    if (!cell) return true
    const word = h === 0 ? cell.lower : cell.upper
    return (word & 0x2000) !== 0
  }
}

/** 两个世界像素点是否落在同一站立格(col,row,h)。实体碰撞用:玩家目标格 == 实体格 → 挡。 */
export function sameTile(ax: number, ay: number, bx: number, by: number): boolean {
  const a = pixelToTile(ax, ay)
  const b = pixelToTile(bx, by)
  return a.col === b.col && a.row === b.row && a.h === b.h
}

// ── GridPos 入口(D16:新代码用这些,内部复用旧像素兼容层,零行为变化) ──────────────

/** GridPos 是否被阻挡:菱形轴格 → 像素 → 复用 buildIsBlocked 旧判定。 */
export function isBlockedAt(map: Tilemap, pos: GridPos): boolean {
  const { x, y } = gridToPixel(pos)
  return buildIsBlocked(map)(x, y)
}

/** 两个 GridPos 是否在同一站立格(实体碰撞用)。height 不参与(逻辑/碰撞在地面层)。 */
export function sameGrid(a: GridPos, b: GridPos): boolean {
  return a.col === b.col && a.row === b.row
}
