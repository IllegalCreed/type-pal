import { resolveRelativeLatticeOffset } from './map-transform.js'

export type IsometricBrushSize = 1 | 2 | 3

export const ISOMETRIC_BRUSH_SIZES: readonly IsometricBrushSize[] = [1, 2, 3]

export function isometricBrushPoints(
  anchor: { row: number; col: number },
  size: IsometricBrushSize,
): { row: number; col: number }[] {
  const points: { row: number; col: number }[] = []
  // row/col 是菱形的两条斜轴，不是错排存储数组的屏幕纵横轴。
  // grid col +1 => lattice {dRow:+1, du:+1}；grid row +1 => {dRow:+1, du:-1}。
  for (let gridRowOffset = 0; gridRowOffset < size; gridRowOffset += 1)
    for (let gridColOffset = 0; gridColOffset < size; gridColOffset += 1)
      points.push(
        resolveRelativeLatticeOffset(anchor, {
          dRow: gridColOffset + gridRowOffset,
          du: gridColOffset - gridRowOffset,
        }),
      )
  return points
}
