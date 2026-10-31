/** Fresh unblocked cells for headless loop movement; not a rendered asset fixture. */
import type { Tilemap } from '@type-pal/shared'
export function walkableTilemap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tileset: 'fake' }
}
