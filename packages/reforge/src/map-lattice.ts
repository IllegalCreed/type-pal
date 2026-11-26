import type { ProjectMap } from '@type-pal/content'

export interface LatticePos {
  col: number
  row: number
}

export function isLatticeInside(
  map: Pick<ProjectMap, 'width' | 'height'>,
  pos: LatticePos,
): boolean {
  return pos.col >= 0 && pos.col < map.width && pos.row >= 0 && pos.row < map.height * 2
}

/** 错排 lattice 中心：奇数行向右错半格。 */
export function latticeCenter(pos: LatticePos): { x: number; y: number } {
  return { x: pos.col * 32 + (pos.row & 1) * 16, y: pos.row * 8 }
}

/**
 * ProjectMap tile 的真实世界绘制矩形。渲染与编辑器透明像素命中必须共用，避免魔数漂移。
 * 实例 height 只参与遮挡排序，不改变图像几何位置。
 */
export function projectMapTileBlitRect(
  pos: LatticePos,
  frame: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const center = latticeCenter(pos)
  return { x: center.x - 16, y: center.y - 8, width: frame.width, height: frame.height }
}

/** 世界像素命中最近的错排菱形子格。 */
export function pixelToLattice(x: number, y: number): LatticePos {
  let col = Math.floor(x / 32)
  let cellRow = Math.floor(y / 16)
  let subRow = 0
  const xr = ((x % 32) + 32) % 32
  const yr = ((y % 16) + 16) % 16
  if (xr + yr * 2 >= 16) {
    if (xr + yr * 2 >= 48) {
      col++
      cellRow++
    } else if (32 - xr + yr * 2 < 16) {
      col++
    } else if (32 - xr + yr * 2 < 48) {
      subRow = 1
    } else {
      cellRow++
    }
  }
  return { col, row: cellRow * 2 + subRow }
}

/** 像素 AABB 内的 lattice 中心；端点任意序，界外交给写入函数忽略。 */
export function latticeInRect(x0: number, y0: number, x1: number, y1: number): LatticePos[] {
  const [xa, xb] = x0 <= x1 ? [x0, x1] : [x1, x0]
  const [ya, yb] = y0 <= y1 ? [y0, y1] : [y1, y0]
  const out: LatticePos[] = []
  for (let row = Math.ceil(ya / 8); row * 8 <= yb; row++) {
    const offset = (row & 1) * 16
    for (let col = Math.ceil((xa - offset) / 32); col * 32 + offset <= xb; col++) {
      out.push({
        col: Object.is(col, -0) ? 0 : col,
        row: Object.is(row, -0) ? 0 : row,
      })
    }
  }
  return out
}

/** 地图内的像素 AABB lattice 中心；先裁枚举边界，避免极低缩放/界外拖拽制造巨量中间数组。 */
export function latticeInMapRect(
  map: Pick<ProjectMap, 'width' | 'height'>,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): LatticePos[] {
  const [xa, xb] = x0 <= x1 ? [x0, x1] : [x1, x0]
  const [ya, yb] = y0 <= y1 ? [y0, y1] : [y1, y0]
  const firstRow = Math.max(0, Math.ceil(ya / 8))
  const lastRow = Math.min(map.height * 2 - 1, Math.floor(yb / 8))
  const out: LatticePos[] = []
  for (let row = firstRow; row <= lastRow; row++) {
    const offset = (row & 1) * 16
    const firstCol = Math.max(0, Math.ceil((xa - offset) / 32))
    const lastCol = Math.min(map.width - 1, Math.floor((xb - offset) / 32))
    for (let col = firstCol; col <= lastCol; col++) out.push({ col, row })
  }
  return out
}
