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

/**
 * 把解码后的逐帧位图装配成 SpriteImage[]。**每帧用自身宽高定 anchor**(底部中心)。
 *
 * sdlpal 真值(scene.c:224 / 291 / 358):blit 时一律按**当前帧**的 PAL_RLEGetWidth/Height —
 *   x = pos.x - PAL_RLEGetWidth(本帧)/2;  y = pos.y - PAL_RLEGetHeight(本帧) - iLayer。
 * 即每帧脚底中心对齐到同一 anchor 点,高/宽不同的帧各自向上 / 左右居中延展。
 *
 * 之前 bug:三处 loader 都用 `first.height` / `first.width/2`(frame[0])当整组所有帧的 anchor。
 *   行走精灵各帧等高(chunk2 全 22×50)看不出;但爬行精灵 chunk193 各帧高度 31~73 差异巨大,
 *   爬帧(frame6=73)用 frame0 高度 31 当锚 → 脚底向下溢出 (73-31)=42px = 密道攀爬"玩家偏下"。
 */
export function toSpriteImages(
  frames: { width: number; height: number; indices: Uint8Array; opaque: Uint8Array }[],
): SpriteImage[] {
  return frames.map((f) => ({
    width: f.width,
    height: f.height,
    indices: f.indices,
    opaque: f.opaque,
    anchorX: Math.floor(f.width / 2),
    anchorY: f.height,
  }))
}

export function drawSprite(fb: Framebuffer, sprite: SpriteImage, cx: number, cy: number): void {
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
