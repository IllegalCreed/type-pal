import type { Framebuffer } from './framebuffer.js'

export interface SpriteImage {
  width: number
  height: number
  indices: Uint8Array
  /** opaque mask(M3.5 fix):1 = 写入,0 = RLE-skip 透明跳过。
   *  之前 blit 用 `idx === 0 continue` 把 RLE-skip 与 opaque-palette-0 合并 →
   *  人物 sprite palette-0 像素(头发暗部 / 眼睛等)被误判为透明 → 半透明。 */
  opaque: Uint8Array
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
      const srcOff = y * sprite.width + x
      if (sprite.opaque[srcOff] === 0) continue
      fb.writePixel(dstX + x, dstY + y, sprite.indices[srcOff]!)
    }
  }
}
