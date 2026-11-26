export const MENU_GRID_COLUMNS = 3

export type GridDirection = 'up' | 'down' | 'left' | 'right'

const stepByDirection: Record<GridDirection, number> = {
  up: -MENU_GRID_COLUMNS,
  down: MENU_GRID_COLUMNS,
  left: -1,
  right: 1,
}

/** Pin the cursor to the first or last entry, including a partially filled last row. */
export function stepMenuGridCursor(cursor: number, entryCount: number, direction: GridDirection) {
  const next = cursor + stepByDirection[direction]
  return Math.max(0, Math.min(next, entryCount - 1))
}
