import { solidIndexedImage } from '../../__tests__/raster-fixtures.js'
/** Pixel inputs are separate from combat state; masks are required by SpriteFrame. */
import { createFramebuffer, type Framebuffer } from '../../framebuffer.js'
import type { SpriteAsset, SpriteFrame } from '../draw-battle-sprites.js'

export function twoByTwoSprites(fills: number[]): SpriteAsset {
  return { frames: fills.map((fill) => solidIndexedImage(2, 2, fill)) }
}

export function rowFrame(values: number[], opaqueValues?: number[]): SpriteFrame {
  return {
    width: values.length,
    height: 1,
    indices: new Uint8Array(values),
    opaque: new Uint8Array(opaqueValues ?? values.map(() => 1)),
  }
}

export function markedFramebuffer(): Framebuffer {
  const fb = createFramebuffer()
  fb.indices.fill(0x5a)
  return fb
}
