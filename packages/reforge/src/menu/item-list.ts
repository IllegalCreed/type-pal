// 物品列表网格(装备/使用/投掷 共享):红框 3 列网格 + 数量 + 选中光标 + 底部 itembox + 图标 + 多行描述。
// 布局取自一阶段 draw-inventory.ts / sdlpal itemmenu.c PAL_ItemSelectMenu。320 逻辑坐标,调用方已 ctx.scale。
// items/cursor 由调用方传(装备过 equippableItems、使用过 usableItems,各自过滤)。
import type { ItemData, WorldState } from '@type-pal/content'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'
import { drawNumber, drawSlicedBox, type MenuAssets } from './menu-box.js'

const LIST_X = 2
const LIST_Y = 0
const LIST_W = 317 // 22 + 16×17 + 23
const LIST_H = 148 // 22 + 18×7
const ITEM_X0 = 15
const ITEM_Y0 = 12
const ITEM_DX = 100 // 列宽 INV_ITEM_TEXT_WIDTH
const ITEM_DY = 18
const GRID_COLS = 3
const AMOUNT_DX = 81 // 数量右对齐 = ITEM_X0 + 81 + k×DX
const CURSOR_DX = 25
const CURSOR_DY = 10
const ITEMBOX_X = 0
const ITEMBOX_Y = 140
const ICON_DX = 8
const ICON_DY = 7
const DESC_X = 71
const DESC_Y = 151
const DESC_LINE_H = 16 // 多行说明行距(sdlpal itemmenu.c desc 151+i*16)
const COLOR_NORMAL = [199, 186, 174] as const // 0x4F 米白(物品名)
const COLOR_DESC = [243, 239, 93] as const // 0x3C 浅黄(描述)
const SELECTED_COLORS = [
  [247, 231, 109],
  [235, 211, 97],
  [227, 190, 89],
  [219, 174, 81],
  [231, 195, 93],
  [243, 219, 105],
] as const

/** 物品列表(3 列网格 + 数量 + 选中光标)+ 选中物详情(itembox + 图标 + 多行描述)。 */
export function drawItemGridList(
  ctx: CanvasRenderingContext2D,
  items: ItemData[],
  cursor: number,
  world: WorldState,
  assets: MenuAssets,
  glyphs: GlyphTable,
  now: number,
): void {
  drawSlicedBox(ctx, assets.redBox, LIST_X, LIST_Y, LIST_W, LIST_H)

  // 3 列网格:名(米白/选中黄闪)+ 数量(>1)+ 选中光标(光标画在字之上)
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL
  items.forEach((item, i) => {
    const k = i % GRID_COLS
    const j = Math.floor(i / GRID_COLS)
    const x = ITEM_X0 + k * ITEM_DX
    const y = ITEM_Y0 + j * ITEM_DY
    const selected = i === cursor
    renderSpans(ctx, [{ text: item.name }], x, y, {
      glyphs,
      shadow: true,
      forceRgba: selected ? blink : COLOR_NORMAL,
    })
    const count = world.inventory.find((e) => e.itemId === item.id)?.count ?? 0
    if (count > 1) drawNumber(ctx, count, ITEM_X0 + AMOUNT_DX + k * ITEM_DX, y + 5, assets.numsCyan)
    if (selected && assets.cursorGrid)
      ctx.drawImage(assets.cursorGrid, x + CURSOR_DX, y + CURSOR_DY)
  })

  // 底部:itembox + 选中物图标 + 多行描述(浅黄)
  if (assets.itembox) ctx.drawImage(assets.itembox, ITEMBOX_X, ITEMBOX_Y)
  const sel = items[cursor]
  if (sel) {
    const icon = assets.itemIcons[sel.icon]
    if (icon) ctx.drawImage(icon, ITEMBOX_X + ICON_DX, ITEMBOX_Y + ICON_DY)
    sel.desc.forEach((line, i) => {
      renderSpans(ctx, [{ text: line }], DESC_X, DESC_Y + i * DESC_LINE_H, {
        glyphs,
        shadow: true,
        forceRgba: COLOR_DESC,
      })
    })
  }
}
