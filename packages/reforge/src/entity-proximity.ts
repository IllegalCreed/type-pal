import type { GridPos } from '@type-pal/content'

/** Current-instance planar distance; height, visibility and collision are not proximity gates. */
export function areEntityPositionsNear(
  from: GridPos | undefined,
  to: GridPos | undefined,
  range: number,
): boolean {
  return (
    !!from && !!to && Math.max(Math.abs(from.col - to.col), Math.abs(from.row - to.row)) < range
  )
}
