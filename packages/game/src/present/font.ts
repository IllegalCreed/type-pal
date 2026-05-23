/**
 * 字体渲染 —— M2 简化:每个字符画 8×16 占位框。
 * 真字形(Unifont CN BDF/hex 解析)留 M3+ 补,不阻塞 M2 端到端验证。
 */

import type { Framebuffer } from './framebuffer.js'

const GLYPH_W = 8
const GLYPH_H = 16
/** 占位用:字符内部填色,区别于边框以便目视识别占位框。M3 替换 renderText 时删除。 */
const GLYPH_INTERIOR_FILL = 200

export function renderText(
  fb: Framebuffer,
  text: string,
  startX: number,
  startY: number,
  colorIndex: number,
): void {
  let x = startX
  for (const _ch of text) {
    for (let py = 0; py < GLYPH_H; py++) {
      for (let px = 0; px < GLYPH_W; px++) {
        const onEdge = py === 0 || py === GLYPH_H - 1 || px === 0 || px === GLYPH_W - 1
        fb.writePixel(x + px, startY + py, onEdge ? colorIndex : GLYPH_INTERIOR_FILL)
      }
    }
    x += GLYPH_W
  }
}
