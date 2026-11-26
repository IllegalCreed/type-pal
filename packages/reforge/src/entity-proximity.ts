import type { GridPos } from '@type-pal/content'

/** Read live entity positions using the strict diamond-grid radius, independent of height. */
export function areEntityPositionsNear(
  from: GridPos | undefined,
  to: GridPos | undefined,
  range: number,
): boolean {
  return (
    !!from && !!to && Math.max(Math.abs(from.col - to.col), Math.abs(from.row - to.row)) < range
  )
}
