/**
 * 战斗背景渲染(M3 T25)。
 *
 * 数据源:FBP.MKF chunk[BattleField.id](sdlpal `battle.c:982`
 * `PAL_MKFDecompressChunk(buf, 320*200, wNumBattleField, fpFBP)`)。
 *
 * FBP 每 chunk 解出 64000 字节 = 320×200 raw 8-bit indexed bitmap,
 * 直接逐像素写入 framebuffer。无透明色概念(战斗背景占满全屏底层)。
 */
import type { Framebuffer } from '../framebuffer.js'

export interface BattleBgAsset {
  /** 期望 320。 */
  width: number
  /** 期望 200。 */
  height: number
  /** 8-bit indexed 像素,长度 = width * height。 */
  indices: Uint8Array
}

/**
 * 把 320×200 索引位图整面写入 framebuffer。
 * 与精灵不同 —— 索引 0 也照画(背景层不透明)。
 */
export function drawBattleBg(fb: Framebuffer, bg: BattleBgAsset): void {
  const w = Math.min(bg.width, fb.width)
  const h = Math.min(bg.height, fb.height)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      fb.writePixel(x, y, bg.indices[y * bg.width + x]!)
    }
  }
}
