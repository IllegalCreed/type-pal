import type { DialogBoxStyle } from '@type-pal/shared'
import { type Framebuffer, SCREEN_W, SCREEN_H } from './framebuffer.js'
import { renderText } from './font.js'

const BOX_BG = 0
const BOX_BORDER = 255
const TEXT_COLOR = 255

const BOX_W = 280
const BOX_H = 48
const BOX_X = (SCREEN_W - BOX_W) / 2

function boxYFor(style: DialogBoxStyle): number {
  switch (style) {
    case 'top':       return 8
    case 'center':    return (SCREEN_H - BOX_H) / 2
    case 'bottom':    return SCREEN_H - BOX_H - 8
    case 'narration': return SCREEN_H - BOX_H - 8
  }
}

export function drawDialogBox(
  fb: Framebuffer,
  text: string,
  style: DialogBoxStyle,
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
  renderText(fb, text, x0 + 8, y0 + 16, TEXT_COLOR)
}
