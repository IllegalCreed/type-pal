import type { Tilemap } from '@type-pal/shared'
import type { SpriteImage } from '../draw-sprite.js'
import type { PresentContext } from '../present.js'

/** Fresh scene raster data. Dimensions/anchors intentionally differ from the hold-only1px fixture. */
export function sceneMap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tileset: 'fake' }
}

export function sceneSprite(colorIdx: number = 1): SpriteImage {
  return {
    width: 16,
    height: 24,
    indices: new Uint8Array(16 * 24).fill(colorIdx),
    opaque: new Uint8Array(16 * 24).fill(1),
    anchorX: 8,
    anchorY: 24,
  }
}

export function sceneContext(tilemap?: Tilemap): PresentContext {
  return {
    tilemap: tilemap ?? sceneMap(10, 10),
    tileImages: { get: () => undefined },
    partyFrames: [sceneSprite(5)],
    partyWalkFrames: 3,
    npcSprites: new Map([
      [1, sceneSprite(3)],
      [2, sceneSprite(4)],
    ]),
  }
}
