import { narrationScrollLayout } from '../dialog/narration-scroll.js'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'
import { drawScroll, type MenuAssets, SCROLL_LABEL_STYLE } from './menu-box.js'

/** 居中横卷轴一行(「获得净衣符」「炼成 净衣符 × 2」);y = 卷轴顶。 */
export function drawRewardGainLine(
  ctx: CanvasRenderingContext2D,
  assets: MenuAssets,
  glyphs: GlyphTable,
  text: string,
  y: number,
): void {
  const { boxX, boxY, boxLen, textX, textY } = narrationScrollLayout(text, y)
  drawScroll(ctx, assets.scroll, boxX, boxY, boxLen)
  renderSpans(ctx, [{ text }], textX, textY, {
    ...SCROLL_LABEL_STYLE,
    glyphs,
  })
}

/** 文本变体(战斗横幅;fight.c:2316 PAL_DrawText color15 白字语义)。 */
export function drawRewardGainText(
  ctx: CanvasRenderingContext2D,
  glyphs: GlyphTable,
  text: string,
  x: number,
  y: number,
): void {
  renderSpans(ctx, [{ text }], x, y, {
    glyphs,
    shadow: true,
    forceRgba: [255, 255, 255],
  })
}
