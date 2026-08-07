/**
 * D14-3 统一「获得/炼成 X」呈现(reward-gain)——引擎自有呈现的唯一入口,
 * 消灭 narration 卷轴 vs item-use-result 框两套 UI。
 *
 * - drawRewardGainLine:横卷轴样式(原版 0x3E 语义),世界/物品使用路径用。
 * - drawRewardGainText:同组件文本变体(K1),战斗内横幅用(保留战斗节奏位置/时长)。
 */
import { narrationTextUnits } from '../dialog/narration-scroll.js'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'
import { drawScroll, type MenuAssets } from './menu-box.js'

/** 居中横卷轴一行(「获得净衣符」「炼成 净衣符 × 2」);y = 卷轴顶。 */
export function drawRewardGainLine(
  ctx: CanvasRenderingContext2D,
  assets: MenuAssets,
  glyphs: GlyphTable,
  text: string,
  y: number,
): void {
  const units = narrationTextUnits(text)
  const boxX = 160 - units * 4
  const boxLen = Math.max(1, Math.floor((units + 1) / 2))
  drawScroll(ctx, assets.scroll, boxX, y, boxLen)
  renderSpans(ctx, [{ text }], boxX + 8 + ((units & 1) << 2), y + 10, {
    glyphs,
    shadow: false,
    forceRgba: [0, 0, 0],
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
