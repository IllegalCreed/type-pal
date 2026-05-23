import type { Framebuffer } from './framebuffer.js'

export interface SpriteImage {
  width: number
  height: number
  indices: Uint8Array
  anchorX: number
  anchorY: number
}

export function drawSprite(
  fb: Framebuffer,
  sprite: SpriteImage,
  cx: number,
  cy: number,
): void {
  const dstX = cx - sprite.anchorX
  const dstY = cy - sprite.anchorY
  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const idx = sprite.indices[y * sprite.width + x]!
      if (idx === 0) continue
      fb.writePixel(dstX + x, dstY + y, idx)
    }
  }
}
