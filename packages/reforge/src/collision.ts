/** ProjectMap 独立 collision lattice 的统一判定。 */
import {
  type GridPos,
  gridToPixel,
  type IsometricMapContent,
  type ProjectMap,
} from '@type-pal/content'
import { pixelToLattice } from './project-map.js'

/** 世界像素坐标落到 lattice 后查独立碰撞值；界外恒阻挡。 */
export function buildIsBlocked(
  map: IsometricMapContent<number | null>,
): (x: number, y: number) => boolean {
  return (x, y) => {
    const pos = pixelToLattice(x, y)
    if (pos.col < 0 || pos.col >= map.width || pos.row < 0 || pos.row >= map.height * 2) return true
    return (map.collision[pos.row]?.[pos.col] ?? 1) !== 0
  }
}

/** 两个世界像素点是否落在同一个错排菱形实例。 */
export function sameLatticeCell(ax: number, ay: number, bx: number, by: number): boolean {
  const a = pixelToLattice(ax, ay)
  const b = pixelToLattice(bx, by)
  return a.col === b.col && a.row === b.row
}

export function isBlockedAt(map: ProjectMap, pos: GridPos): boolean {
  const { x, y } = gridToPixel(pos)
  return buildIsBlocked(map)(x, y)
}

/** 两个 GridPos 是否在同一站立格。height 不参与逻辑碰撞。 */
export function sameGrid(a: GridPos, b: GridPos): boolean {
  return a.col === b.col && a.row === b.row
}
