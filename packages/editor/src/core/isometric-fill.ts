import type { GridPointRef } from './map-selection.js'

export interface IsometricTileSample {
  tileId: number | null
  height: number
}

function pointKey(point: GridPointRef): string {
  return `${point.row}:${point.col}`
}

function neighbors(point: GridPointRef): GridPointRef[] {
  const left = point.col - (point.row % 2 === 0 ? 1 : 0)
  return [
    { row: point.row - 1, col: left },
    { row: point.row - 1, col: left + 1 },
    { row: point.row + 1, col: left },
    { row: point.row + 1, col: left + 1 },
  ]
}

/**
 * 错排菱形格上的四邻域填充域。tileId 与实例高度共同定义边界；
 * `tileId: null, height: 0` 是普通空格，不是“不可访问”。
 */
export function floodFillIsometricTiles(options: {
  start: GridPointRef
  isInside: (point: GridPointRef) => boolean
  sampleAt: (point: GridPointRef) => IsometricTileSample | undefined
}): GridPointRef[] {
  if (!options.isInside(options.start)) return []
  const seed = options.sampleAt(options.start)
  if (!seed) return []

  const filled: GridPointRef[] = []
  const queue: GridPointRef[] = [options.start]
  const visited = new Set<string>([pointKey(options.start)])
  while (queue.length > 0) {
    const current = queue.pop()
    if (!current) continue
    const sample = options.sampleAt(current)
    if (!sample || sample.tileId !== seed.tileId || sample.height !== seed.height) continue
    filled.push(current)
    for (const neighbor of neighbors(current)) {
      const key = pointKey(neighbor)
      if (visited.has(key) || !options.isInside(neighbor)) continue
      visited.add(key)
      queue.push(neighbor)
    }
  }
  return filled
}
