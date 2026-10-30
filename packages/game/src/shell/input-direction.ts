import type { AbstractKey } from '@type-pal/shared'

type Direction = Extract<AbstractKey, 'Up' | 'Right' | 'Down' | 'Left'>

/** Undo the clockwise layout rotation; callers apply their dead zone in original coordinates. */
export function inputDirection(x: number, y: number, rotated: boolean): Direction {
  const dx = rotated ? x + y : x
  const dy = rotated ? y - x : y
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'Right' : 'Left') : dy > 0 ? 'Down' : 'Up'
}
