/**
 * 切片 demo 碰撞：从复用的原版 tilemap 直接算可走格（v1）。
 * 规则 = room 内「有地板(layer0)且无家具/墙(layer1)」的格可走；其余阻挡。
 * 与渲染遮挡同源（layer1 = 遮挡物 = 挡路），与 room#0 开阔地图一致。
 * 之后可换成原版精确障碍位，接口不变（注入给 resolveMove 的 isBlocked）。
 */
import type { Tilemap } from '@type-pal/shared'
import type { CellRect } from './render.js'

const TILE_W = 32
const TILE_H = 16

/** 该 DWORD 是否含 layer1（上层）瓦片 = 家具/墙顶 = 遮挡且挡路。 */
function hasLayer1(d: number): boolean {
  const hi = d >>> 16
  return ((hi & 0xff) | ((hi >> 4) & 0x100)) - 1 >= 0
}

/** 构造 isBlocked(worldX, worldY)：feet 像素 → 格 → 查可走集。 */
export function buildIsBlocked(map: Tilemap, room: CellRect): (x: number, y: number) => boolean {
  const walkable = new Set<number>()
  for (let r = room.row; r < room.row + room.rows; r++) {
    const row = map.cells[r]
    if (!row) continue
    for (let c = room.col; c < room.col + room.cols; c++) {
      const cell = row[c]
      if (!cell) continue
      const empty = cell.lower === 0 && cell.upper === 0
      const occluder = hasLayer1(cell.lower) || hasLayer1(cell.upper)
      if (!empty && !occluder) walkable.add(r * 64 + c)
    }
  }
  return (x, y) => {
    const c = Math.floor(x / TILE_W)
    const r = Math.floor(y / TILE_H)
    return !walkable.has(r * 64 + c)
  }
}
