// 装备面板 Canvas UI(D17)。两阶段:
//   list      物品列表(布局取自一阶段 draw-inventory.ts / sdlpal itemmenu.c),只含可装物。
//   pick-role 确认面板:状态板 bg + 全 UI 元素拼装 + 字体画 label(原版烤进 FBP 背景的字,这里改字体画)。
// 320 逻辑坐标,调用方已 ctx.scale。
import {
  type CombatStat,
  DEMO_ITEMS,
  EQUIP_SLOT_IDS,
  effectiveStat,
  type Locale,
  lookupText,
  type TextId,
  type WorldState,
} from '@type-pal/content'
import { EQUIP_GRID_COLS, type EquipMenuState } from '../equip-menu-state.js'
import type { GlyphTable } from '../text/glyph.js'
import { measureSpans, renderSpans } from '../text/text-render.js'
import { drawNumber, drawSlicedBox, type MenuAssets } from './menu-box.js'

// 列表框(itemmenu.c:117 PAL_CreateBoxWithShadow(2,0) rows6 cols17 style1=红框)
const LIST_X = 2
const LIST_Y = 0
const LIST_W = 317 // 22 + 16×17 + 23
const LIST_H = 148 // 22 + 18×7
const ITEM_X0 = 15
const ITEM_Y0 = 12
const ITEM_DX = 100 // 列宽 INV_ITEM_TEXT_WIDTH
const ITEM_DY = 18
const AMOUNT_DX = 81 // 数量右对齐 = ITEM_X0 + 81 + k×DX(INV_AMOUNT_X_OFFSET)
const CURSOR_DX = 25 // INV_CURSOR_X_OFFSET
const CURSOR_DY = 10 // cursor y = 22 + j×18 = ITEM_Y0 + 10 + j×18
// 底部:itembox + 选中物图标 + 描述
const ITEMBOX_X = 0
const ITEMBOX_Y = 140
const ICON_DX = 8
const ICON_DY = 7
const DESC_X = 71
const DESC_Y = 151
const COLOR_NORMAL = [199, 186, 174] as const // 0x4F 米白
const COLOR_DESC = [243, 239, 93] as const // 0x3C 浅黄
const COLOR_GOLD = [255, 203, 113] as const // 名字/目标槽高亮(MENUITEM_COLOR_CONFIRMED 0x2C 金黄)
const SELECTED_COLORS = [
  [247, 231, 109],
  [235, 211, 97],
  [227, 190, 89],
  [219, 174, 81],
  [231, 195, 93],
  [243, 219, 105],
] as const

// ── pick-role 确认面板布局(状态板 bg;label x 取自一阶段 draw-equip.ts EquipLabels/EquipStatus)──
const PR_ITEMBOX_X = 8
const PR_ITEMBOX_Y = 8
const PR_ITEMBOX_SIZE = 64
const PR_ITEM_NAME_Y = 78 // 选中物名(框下,居中于框)
const PR_CHAR_BOX_X = 6
const PR_CHAR_BOX_Y = 98
const PR_CHAR_BOX_W = 68
const PR_CHAR_BOX_H = 24
const PR_EQUIP_LABEL_X = 92 // 槽位 label(phase-1 EquipLabels x)
const PR_EQUIP_NAME_X = 130 // 当前装备名(phase-1 EquipNames x)
const PR_ROW_Y0 = 12
const PR_ROW_DY = 22
const PR_STAT_LABEL_X = 226 // 属性 label(phase-1 EquipStatusLabels x)
const PR_STAT_VAL_RIGHT = 296 // 属性值右对齐(青)
const PR_NUM_DY = 4

/** pick-role 槽位(EQUIP_SLOT_IDS 单一真值 + equip.<slot> label;与状态板同套)。 */
const PR_SLOTS: { slot: string; label: TextId }[] = EQUIP_SLOT_IDS.map((slot) => ({
  slot,
  label: `equip.${slot}`,
}))
/** pick-role 右栏 5 战斗属性(装备影响的项,= effectiveStat)。 */
const PR_STATS: { stat: CombatStat; label: TextId }[] = [
  { stat: 'attack', label: 'stat.attack' },
  { stat: 'magicAttack', label: 'stat.magicAttack' },
  { stat: 'defense', label: 'stat.defense' },
  { stat: 'speed', label: 'stat.speed' },
  { stat: 'luck', label: 'stat.luck' },
]

/** list 阶段:可装列表(3 列网格 + 数量)+ 选中物详情(框/图标/描述)。 */
function drawEquipList(
  ctx: CanvasRenderingContext2D,
  state: EquipMenuState,
  world: WorldState,
  assets: MenuAssets,
  glyphs: GlyphTable,
  now: number,
): void {
  // ① 列表红框
  drawSlicedBox(ctx, assets.redBox, LIST_X, LIST_Y, LIST_W, LIST_H)

  // ② 3 列网格:名(米白/选中黄闪)+ 数量(>1)+ 选中光标(光标画在字之上)
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL
  state.items.forEach((item, i) => {
    const k = i % EQUIP_GRID_COLS
    const j = Math.floor(i / EQUIP_GRID_COLS)
    const x = ITEM_X0 + k * ITEM_DX
    const y = ITEM_Y0 + j * ITEM_DY
    const selected = i === state.cursor
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

  // ③ 底部:itembox + 选中物图标 + 描述(浅黄)
  if (assets.itembox) ctx.drawImage(assets.itembox, ITEMBOX_X, ITEMBOX_Y)
  const sel = state.items[state.cursor]
  if (sel) {
    const icon = assets.itemIcons[sel.icon]
    if (icon) ctx.drawImage(icon, ITEMBOX_X + ICON_DX, ITEMBOX_Y + ICON_DY)
    renderSpans(ctx, [{ text: sel.desc }], DESC_X, DESC_Y, {
      glyphs,
      shadow: true,
      forceRgba: COLOR_DESC,
    })
  }
}

/** pick-role 阶段:确认面板(状态板 bg + 选中物 + 角色 + 6 槽当前装备 + 5 属性;目标槽高亮金)。 */
function drawEquipPickRole(
  ctx: CanvasRenderingContext2D,
  state: EquipMenuState,
  world: WorldState,
  assets: MenuAssets,
  glyphs: GlyphTable,
  locale: Locale,
): void {
  if (assets.statusBg) ctx.drawImage(assets.statusBg, 0, 0, 320, 200)
  const caster = world.party.find((c) => c.id === state.casterId)
  if (!caster) return
  const sel = state.selectedItemId ? DEMO_ITEMS[state.selectedItemId] : undefined
  const targetSlot = sel?.equip?.slot

  // ① 左:选中物框(复用装备格)+ 图标(内凹居中)+ 数量(>1)+ 名(金,居中)
  if (assets.equipSlot)
    ctx.drawImage(assets.equipSlot, PR_ITEMBOX_X, PR_ITEMBOX_Y, PR_ITEMBOX_SIZE, PR_ITEMBOX_SIZE)
  if (sel) {
    const icon = assets.itemIcons[sel.icon]
    if (icon) {
      const inner = PR_ITEMBOX_SIZE - 16
      const scale = Math.min(inner / icon.width, inner / icon.height, 1)
      const iw = icon.width * scale
      const ih = icon.height * scale
      ctx.drawImage(
        icon,
        Math.round(PR_ITEMBOX_X + (PR_ITEMBOX_SIZE - iw) / 2),
        Math.round(PR_ITEMBOX_Y + (PR_ITEMBOX_SIZE - ih) / 2),
        Math.round(iw),
        Math.round(ih),
      )
    }
    const count = world.inventory.find((e) => e.itemId === sel.id)?.count ?? 0
    if (count > 1)
      drawNumber(
        ctx,
        count,
        PR_ITEMBOX_X + PR_ITEMBOX_SIZE - 4,
        PR_ITEMBOX_Y + PR_ITEMBOX_SIZE - 12,
        assets.numsCyan,
      )
    const nameSpan = [{ text: sel.name }]
    renderSpans(
      ctx,
      nameSpan,
      PR_ITEMBOX_X + (PR_ITEMBOX_SIZE - measureSpans(nameSpan, glyphs)) / 2,
      PR_ITEM_NAME_Y,
      { glyphs, shadow: true, forceRgba: COLOR_GOLD },
    )
  }
  // 角色名框(小红框)+ 名(金,居中)
  drawSlicedBox(ctx, assets.redBox, PR_CHAR_BOX_X, PR_CHAR_BOX_Y, PR_CHAR_BOX_W, PR_CHAR_BOX_H)
  const cnSpan = [{ text: lookupText(`name.${caster.template}` as TextId, locale) }]
  renderSpans(
    ctx,
    cnSpan,
    PR_CHAR_BOX_X + (PR_CHAR_BOX_W - measureSpans(cnSpan, glyphs)) / 2,
    PR_CHAR_BOX_Y + 5,
    { glyphs, shadow: true, forceRgba: COLOR_GOLD },
  )

  // ② 中:6 槽 label + 当前装备名(目标槽高亮金,标出将替换哪格)
  PR_SLOTS.forEach(({ slot, label }, i) => {
    const y = PR_ROW_Y0 + i * PR_ROW_DY
    const color = slot === targetSlot ? COLOR_GOLD : COLOR_NORMAL
    renderSpans(ctx, [{ text: lookupText(label, locale) }], PR_EQUIP_LABEL_X, y, {
      glyphs,
      shadow: true,
      forceRgba: color,
    })
    const equippedId = caster.equipment[slot]
    const nm = equippedId
      ? (DEMO_ITEMS[equippedId]?.name ?? '?')
      : lookupText('equip.empty', locale)
    renderSpans(ctx, [{ text: nm }], PR_EQUIP_NAME_X, y, { glyphs, shadow: true, forceRgba: color })
  })

  // ③ 右:5 战斗属性 label + 有效值(青右对齐)
  PR_STATS.forEach(({ stat, label }, i) => {
    const y = PR_ROW_Y0 + i * PR_ROW_DY
    renderSpans(ctx, [{ text: lookupText(label, locale) }], PR_STAT_LABEL_X, y, {
      glyphs,
      shadow: true,
      forceRgba: COLOR_NORMAL,
    })
    drawNumber(
      ctx,
      effectiveStat(caster, stat, DEMO_ITEMS),
      PR_STAT_VAL_RIGHT,
      y + PR_NUM_DY,
      assets.numsCyan,
    )
  })
}

/** 大世界装备面板:phase 分流(list 列表 / pick-role 确认面板)。 */
export function drawEquipMenu(
  ctx: CanvasRenderingContext2D,
  state: EquipMenuState,
  world: WorldState,
  assets: MenuAssets,
  glyphs: GlyphTable,
  now: number,
  locale: Locale,
): void {
  if (state.phase === 'pick-role') {
    drawEquipPickRole(ctx, state, world, assets, glyphs, locale)
    return
  }
  drawEquipList(ctx, state, world, assets, glyphs, now)
}
