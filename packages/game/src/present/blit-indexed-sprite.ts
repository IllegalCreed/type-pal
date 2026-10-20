import type { IndexedImage } from '../assets/png.js'
import type { Framebuffer } from './framebuffer.js'

/** Alpha来自opaque mask，索引0仍可为不透明黑色；越界裁剪由framebuffer拥有。 */
export function blitSpriteOpaque(
  fb: Framebuffer,
  frame: IndexedImage,
  dstX: number,
  dstY: number,
): void {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const off = y * frame.width + x
      if (frame.opaque[off]! > 0) {
        fb.writePixel(dstX + x, dstY + y, frame.indices[off]!)
      }
    }
  }
}
