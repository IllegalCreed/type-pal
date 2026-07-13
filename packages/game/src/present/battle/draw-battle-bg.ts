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
 *
 * @param bgColorShift 召唤演出背景染色(sdlpal battle.c:62-76 sBackgroundColorShift):每像素低 nibble
 *   += shift,钳 [0,15](b&0x80→0 / b&0x70→0x0F),高 nibble 不变。0 = 不染色。
 */
export function drawBattleBg(fb: Framebuffer, bg: BattleBgAsset, bgColorShift = 0): void {
  const w = Math.min(bg.width, fb.width)
  const h = Math.min(bg.height, fb.height)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let px = bg.indices[y * bg.width + x]!
      if (bgColorShift !== 0) {
        let b = (px & 0x0f) + bgColorShift
        if (b & 0x80)
          b = 0 // 负 → 0(battle.c:67-70)
        else if (b & 0x70) b = 0x0f // >15 → 15(battle.c:71-74)
        px = (b & 0x0f) | (px & 0xf0)
      }
      fb.writePixel(x, y, px)
    }
  }
}
