import type { ItemDataMap, WorldItemUsePresentation } from '@type-pal/content'
import { narrationTextUnits } from '../dialog/narration-scroll.js'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'
import { drawScroll, drawSlicedBox, type MenuAssets } from './menu-box.js'

export interface ItemUseResultEntry {
  itemId: string
  count: number
  title: string
  itemName: string
}

/** presentation 顺序就是执行顺序；多产物逐个展示，不把结果压成不可追踪的一行。 */
export function buildItemUseResultEntries(
  presentations: readonly WorldItemUsePresentation[],
  items: ItemDataMap,
): ItemUseResultEntry[] {
  return presentations.flatMap((presentation) =>
    presentation.items.map((item) => ({
      itemId: item.itemId,
      count: item.count,
      title: presentation.source === 'craftRecipe' ? '炼出' : '炼成',
      itemName: items[item.itemId]?.name ?? item.itemId,
    })),
  )
}

export interface ItemUseResultLineLayout {
  boxX: number
  boxLen: number
  textX: number
}

export function itemUseResultLineLayout(text: string): ItemUseResultLineLayout {
  const units = narrationTextUnits(text)
  const boxX = 160 - units * 4
  return {
    boxX,
    boxLen: Math.max(1, Math.floor((units + 1) / 2)),
    textX: boxX + 8 + ((units & 1) << 2),
  }
}

function drawResultLine(
  ctx: CanvasRenderingContext2D,
  assets: MenuAssets,
  glyphs: GlyphTable,
  text: string,
  y: number,
): void {
  const layout = itemUseResultLineLayout(text)
  drawScroll(ctx, assets.scroll, layout.boxX, y, layout.boxLen)
  renderSpans(ctx, [{ text }], layout.textX, y + 10, {
    glyphs,
    shadow: false,
    forceRgba: [0, 0, 0],
  })
}

/** 对齐一阶段 item-box：居中物品框 + 图标 + 两条居中卷轴文字。 */
export function drawItemUseResult(
  ctx: CanvasRenderingContext2D,
  entry: ItemUseResultEntry,
  items: ItemDataMap,
  assets: MenuAssets,
  glyphs: GlyphTable,
): void {
  const boxX = 128
  const boxY = 68
  drawSlicedBox(ctx, assets.itembox, boxX, boxY, 64, 64, { shadow: false })
  const item = items[entry.itemId]
  const icon = item?.icon ? assets.itemIcons[item.icon] : undefined
  if (icon) ctx.drawImage(icon, boxX + 8, boxY + 7)
  drawResultLine(ctx, assets, glyphs, entry.title, 30)
  drawResultLine(
    ctx,
    assets,
    glyphs,
    `${entry.itemName}${entry.count > 1 ? ` × ${entry.count}` : ''}`,
    48,
  )
}
