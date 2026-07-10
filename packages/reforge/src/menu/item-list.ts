// 物品列表网格(装备/使用/投掷 共享):红框 3 列网格 + 数量 + 选中光标 + 底部 itembox + 图标 + 多行描述。
// 布局取自一阶段 draw-inventory.ts / sdlpal itemmenu.c PAL_ItemSelectMenu。320 逻辑坐标,调用方已 ctx.scale。
// items/cursor 由调用方传(装备过 equippableItems、使用过 usableItems,各自过滤)。
import { describeEquipEffects, equippedItemIds, type ItemData, type WorldState } from '@type-pal/content'
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
const DESC_RIGHT = 316 // 说明区右缘(裁剪滚动用)
const DESC_VISIBLE = 3 // 详情框可见行数(高度所限);超出 → 自动上滚
const COLOR_NORMAL = [199, 186, 174] as const // 0x4F 米白(物品名)
const COLOR_DESC = [243, 239, 93] as const // 0x3C 浅黄(描述)
const COLOR_EQUIPPED = [81, 93, 44] as const // 0xC8 橄榄绿(穿戴中的物品;原版 MENUITEM_COLOR_EQUIPPEDITEM)
// 选中闪烁 6 色 = palette 0xF9..0xFE(原版 ui.h MENUITEM_COLOR_SELECTED + tick/100%6;已逐个核对,非自填)
const SELECTED_COLORS = [
  [247, 231, 109],
  [235, 211, 97],
  [227, 190, 89],
  [219, 174, 81],
  [231, 195, 93],
  [243, 219, 105],
] as const

/** 详情框多行说明:≤ 可见行数 → 静态;超出 → 裁剪到可见区 + 垂直无缝上滚(marquee),
 *  首尾各画一遍无缝衔接。风味 + 派生效果都可能撑爆 3 行(灵珠系),滚动保证机制全看得到。 */
function drawDescLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  glyphs: GlyphTable,
  now: number,
): void {
  const draw = (line: string, y: number): void => {
    renderSpans(ctx, [{ text: line }], DESC_X, Math.round(y), {
      glyphs,
      shadow: true,
      forceRgba: COLOR_DESC,
    })
  }
  if (lines.length <= DESC_VISIBLE) {
    lines.forEach((line, i) => draw(line, DESC_Y + i * DESC_LINE_H))
    return
  }
  const visH = DESC_VISIBLE * DESC_LINE_H
  const gap = DESC_LINE_H * 2 // 一轮读完到重播的停顿间隔
  const period = lines.length * DESC_LINE_H + gap
  const scroll = ((now / 50) % period) // 约 50ms/px 上滚
  ctx.save()
  ctx.beginPath()
  ctx.rect(DESC_X - 2, DESC_Y - 2, DESC_RIGHT - DESC_X + 2, visH)
  ctx.clip()
  for (const base of [0, period]) {
    // 画两遍(相隔一个周期)→ 上滚到底时下一轮无缝接上
    for (let i = 0; i < lines.length; i++) {
      const y = DESC_Y - scroll + base + i * DESC_LINE_H
      if (y > DESC_Y - DESC_LINE_H && y < DESC_Y + visH) draw(lines[i]!, y)
    }
  }
  ctx.restore()
}

/** 物品列表(3 列网格 + 数量 + 选中光标)+ 选中物详情(itembox + 图标 + 多行描述)。 */
export function drawItemGridList(
  ctx: CanvasRenderingContext2D,
  items: ItemData[],
  cursor: number,
  world: WorldState,
  assets: MenuAssets,
  glyphs: GlyphTable,
  now: number,
  skillNameOf?: (id: string) => string | undefined, // grantSkill 派生效果显技能名(缺省回退 id)
): void {
  drawSlicedBox(ctx, assets.redBox, LIST_X, LIST_Y, LIST_W, LIST_H)

  // 3 列网格:名(穿戴中绿 / 选中黄闪 / 普通米白)+ 数量(>1)+ 选中光标(光标画在字之上)
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL
  const equipped = equippedItemIds(world) // 穿戴中的物品标绿(原版 itemmenu.c equipped 色,优先于选中闪烁)
  items.forEach((item, i) => {
    const k = i % GRID_COLS
    const j = Math.floor(i / GRID_COLS)
    const x = ITEM_X0 + k * ITEM_DX
    const y = ITEM_Y0 + j * ITEM_DY
    const selected = i === cursor
    const color = equipped.has(item.id) ? COLOR_EQUIPPED : selected ? blink : COLOR_NORMAL
    renderSpans(ctx, [{ text: item.name }], x, y, {
      glyphs,
      shadow: true,
      forceRgba: color,
    })
    const count = world.inventory.find((e) => e.itemId === item.id)?.count ?? 0
    if (count > 1) drawNumber(ctx, count, ITEM_X0 + AMOUNT_DX + k * ITEM_DX, y + 5, assets.numsCyan)
    if (selected && assets.cursorGrid)
      ctx.drawImage(assets.cursorGrid, x + CURSOR_DX, y + CURSOR_DY)
  })

  // 底部:itembox + 选中物图标 + 多行描述(浅黄)
  drawSlicedBox(ctx, assets.itembox, ITEMBOX_X, ITEMBOX_Y, 64, 64, { shadow: false }) // 9-slice;64×64 与原图一致
  const sel = items[cursor]
  if (sel) {
    const icon = assets.itemIcons[sel.icon]
    if (icon) ctx.drawImage(icon, ITEMBOX_X + ICON_DX, ITEMBOX_Y + ICON_DY)
    // 风味说明 + 装备效果派生行(数值单一真相源 = equip.effects;desc 只写风味,防脱节)
    const lines = sel.equip
      ? [...sel.desc, ...describeEquipEffects(sel.equip.effects, { skillName: skillNameOf })]
      : sel.desc
    drawDescLines(ctx, lines, glyphs, now)
  }
}
