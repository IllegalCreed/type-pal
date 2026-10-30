import { getLanguage } from '../../localization/language.js'
import { wrapEnglishDialogLine } from '../../localization/messages.js'
import { FONT_COLOR_DEFAULT, parseDialogText } from '../dialog-box.js'
import { type GlyphTable, renderColoredText, renderText } from '../font.js'
import type { Framebuffer } from '../framebuffer.js'
import { SMALL_FONT } from '../small-font.js'

/** The English description area uses a compact font, without changing scripts. */
export function drawScriptDescription(
  fb: Framebuffer,
  lines: readonly string[],
  x: number,
  y: number,
  width: number,
  color: number,
  glyphs?: GlyphTable,
): void {
  if (getLanguage() !== 'en') {
    lines.forEach((line, i) => {
      renderText(fb, line, x, y + i * 16, color, glyphs, true)
    })
    return
  }
  let row = 0
  let currentColor = color
  for (const line of lines) {
    for (const wrapped of wrapEnglishDialogLine(line, width)) {
      const parsed = parseDialogText(wrapped, currentColor, false)
      renderColoredText(fb, parsed.text, parsed.colors, x, y + row * 10, SMALL_FONT, true)
      currentColor = parsed.endColor === FONT_COLOR_DEFAULT ? color : parsed.endColor
      row++
    }
  }
}
