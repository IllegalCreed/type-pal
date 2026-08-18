export type IsometricBrushSize = 1 | 2 | 3

export const ISOMETRIC_BRUSH_SIZES: readonly IsometricBrushSize[] = [1, 2, 3]

export function isometricBrushPoints(
  anchor: { row: number; col: number },
  size: IsometricBrushSize,
): { row: number; col: number }[] {
  const points: { row: number; col: number }[] = []
  for (let rowOffset = 0; rowOffset < size; rowOffset += 1)
    for (let colOffset = 0; colOffset < size; colOffset += 1)
      points.push({ row: anchor.row + rowOffset, col: anchor.col + colOffset })
  return points
}
