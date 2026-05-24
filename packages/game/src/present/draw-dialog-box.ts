import type { DialogBoxStyle } from '@type-pal/shared'
import { type Framebuffer, SCREEN_W, SCREEN_H } from './framebuffer.js'
import { renderText, type GlyphTable } from './font.js'

// M2 简化:0 = 调色板下标 0(原版通常黑色)。
// TODO(M3): 改成真实对话框背景色的调色板下标(原版 palette 里的深蓝/深灰)。
const BOX_BG = 0
const BOX_BORDER = 255
const TEXT_COLOR = 255

const BOX_W = 280
const BOX_H = 48
const BOX_X = (SCREEN_W - BOX_W) / 2

const TEXT_MARGIN_X = 8   // 左边距,对齐一个字符宽
const TEXT_MARGIN_Y = 16  // 上边距,留出边框 + 一行字高

function boxYFor(style: DialogBoxStyle): number {
  switch (style) {
    case 'top':       return 8
    case 'center':    return (SCREEN_H - BOX_H) / 2
    case 'bottom':    return SCREEN_H - BOX_H - 8
    case 'narration': return SCREEN_H - BOX_H - 8  // 位置与 bottom 相同,仅无边框(M2 简化)
  }
}

export function drawDialogBox(
  fb: Framebuffer,
  text: string,
  style: DialogBoxStyle,
  glyphs?: GlyphTable,
): void {
  const x0 = BOX_X
  const y0 = boxYFor(style)
  const hasBorder = style !== 'narration'

  for (let y = 0; y < BOX_H; y++) {
    for (let x = 0; x < BOX_W; x++) {
      const isBorder = hasBorder && (y === 0 || y === BOX_H - 1 || x === 0 || x === BOX_W - 1)
      fb.writePixel(x0 + x, y0 + y, isBorder ? BOX_BORDER : BOX_BG)
    }
  }
  renderText(fb, text, x0 + TEXT_MARGIN_X, y0 + TEXT_MARGIN_Y, TEXT_COLOR, glyphs)
}
