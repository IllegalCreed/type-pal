// 装备面板 Canvas UI(D17)。两阶段:
//   list      物品列表(布局取自一阶段 draw-inventory.ts / sdlpal itemmenu.c),只含可装物。
//   pick-role 换装面板:状态板 bg + 全 UI 元素拼装 + 字体画 label。
//             坐标 = 一阶段 draw-equip.ts 的 sdlpal ScreenLayout 真值;原版烤进 FBP 的黑色槽位/属性
//             label(頭戴/披掛… 武術…)这里改字体画(纯黑无阴影),物品框用 frame-70 纵向卷轴,
//             角色名牌用红框镂空(露木纹)+ 选中名 6 色炫彩。
// 320 逻辑坐标,调用方已 ctx.scale。
import {
  type CombatStat,
  DEMO_ITEMS,
  effectiveStat,
  type Locale,
  lookupText,
  type TextId,
  type WorldState,
} from '@type-pal/content'
import { EQUIP_GRID_COLS, type EquipMenuState } from '../equip-menu-state.js'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'
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
const COLOR_NORMAL = [199, 186, 174] as const // 0x4F 米白(物品名)
const COLOR_DESC = [243, 239, 93] as const // 0x3C 浅黄(描述)
const COLOR_GOLD = [255, 203, 113] as const // 选中物名(MENUITEM_COLOR_CONFIRMED 0x2C 金黄)
const COLOR_DARK = [0, 0, 0] as const // 槽位/属性 label(原版烤进 FBP 的纯黑字,无阴影)
const SELECTED_COLORS = [
  [247, 231, 109],
  [235, 211, 97],
  [227, 190, 89],
  [219, 174, 81],
  [231, 195, 93],
  [243, 219, 105],
] as const

// ── pick-role 换装面板布局(状态板 bg;坐标 = 一阶段 draw-equip.ts sdlpal ScreenLayout 真值)──
const PR_IMAGE_BOX = { x: 8, y: 8 } // EquipImageBox — frame-70 纵向卷轴框(64×64)
const PR_ITEM_NAME = { x: 5, y: 73 } // EquipItemName(金,左对齐)
const PR_ITEM_AMOUNT_RIGHT = 62 // EquipItemAmount(青,右对齐;卷面右下)
const PR_ITEM_AMOUNT_Y = 52
const PR_ROLE_BOX = { x: 2, y: 95 } // EquipRoleListBox(主菜单九宫格黄框,draw-equip style 0)
const PR_ROLE_BOX_W = 92
const PR_ROLE_BOX_H = 40 // 主菜单 9-slice 单行最小高(MENU_H_BASE 22 + ITEM_H 18)
const PR_ROLE_NAME = { dx: 13, dy: 13 } // 名 = 框 + (13,13)(sdlpal uigame.c:1952)
const PR_LABEL_X = 92 // EquipLabels(深色)
const PR_NAME_X = 130 // EquipNames(白)
const PR_ROW_Y0 = 11
const PR_ROW_DY = 22
const PR_STAT_LABEL_X = 226 // EquipStatusLabels(深色)
const PR_STAT_LABEL_Y0 = 10
const PR_STAT_VAL_RIGHT = 292 // EquipStatusValues(青,右对齐)
const PR_STAT_VAL_Y0 = 14

/** pick-role 6 槽显示序 + 动词 label(对齐原版 FBP:头戴/披挂/身穿/手持/脚穿/配带 = head/cloak/body/weapon/feet/accessory)。 */
const PR_SLOTS: { slot: string; label: TextId }[] = [
  { slot: 'head', label: 'equip.head' },
  { slot: 'cloak', label: 'equip.cloak' },
  { slot: 'body', label: 'equip.body' },
  { slot: 'weapon', label: 'equip.weapon' },
  { slot: 'feet', label: 'equip.feet' },
  { slot: 'accessory', label: 'equip.accessory' },
]
/** pick-role 右栏 5 战斗属性(装备影响项,= effectiveStat)。 */
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

/** pick-role 阶段:换装面板(状态板 bg + 卷轴选中物 + 红名牌角色 + 6 槽当前装备 + 5 属性)。 */
function drawEquipPickRole(
  ctx: CanvasRenderingContext2D,
  state: EquipMenuState,
  world: WorldState,
  assets: MenuAssets,
  glyphs: GlyphTable,
  locale: Locale,
  now: number,
): void {
  if (assets.statusBg) ctx.drawImage(assets.statusBg, 0, 0, 320, 200)
  const caster = world.party.find((c) => c.id === state.casterId)
  if (!caster) return
  const sel = state.selectedItemId ? DEMO_ITEMS[state.selectedItemId] : undefined

  // ① 左:选中物 — 纵向卷轴框(frame-70)+ 图标(卷面居中)+ 数量(青)+ 名(金,左对齐)
  if (assets.itembox) ctx.drawImage(assets.itembox, PR_IMAGE_BOX.x, PR_IMAGE_BOX.y)
  if (sel) {
    const icon = assets.itemIcons[sel.icon]
    if (icon) {
      // 卷轴顶有滚杆 → 图标在卷面(略偏下)居中
      const cx = PR_IMAGE_BOX.x + 32
      const cy = PR_IMAGE_BOX.y + 36
      ctx.drawImage(icon, Math.round(cx - icon.width / 2), Math.round(cy - icon.height / 2))
    }
    const count = world.inventory.find((e) => e.itemId === sel.id)?.count ?? 0
    if (count > 1) drawNumber(ctx, count, PR_ITEM_AMOUNT_RIGHT, PR_ITEM_AMOUNT_Y, assets.numsCyan)
    renderSpans(ctx, [{ text: sel.name }], PR_ITEM_NAME.x, PR_ITEM_NAME.y, {
      glyphs,
      shadow: true,
      forceRgba: COLOR_GOLD,
    })
  }
  // 角色名牌(主菜单九宫格黄框,sdlpal draw-equip role list box style 0)+ 名(6 色炫彩 = 选中角色)
  drawSlicedBox(ctx, assets.box, PR_ROLE_BOX.x, PR_ROLE_BOX.y, PR_ROLE_BOX_W, PR_ROLE_BOX_H)
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_GOLD
  renderSpans(
    ctx,
    [{ text: lookupText(`name.${caster.template}` as TextId, locale) }],
    PR_ROLE_BOX.x + PR_ROLE_NAME.dx,
    PR_ROLE_BOX.y + PR_ROLE_NAME.dy,
    { glyphs, shadow: true, forceRgba: blink },
  )

  // ② 中:6 槽 label(纯黑无阴影,原版 FBP 黑字)+ 当前装备名(白)
  PR_SLOTS.forEach(({ slot, label }, i) => {
    const y = PR_ROW_Y0 + i * PR_ROW_DY
    renderSpans(ctx, [{ text: lookupText(label, locale) }], PR_LABEL_X, y, {
      glyphs,
      shadow: false,
      forceRgba: COLOR_DARK,
    })
    const equippedId = caster.equipment[slot]
    const nm = equippedId
      ? (DEMO_ITEMS[equippedId]?.name ?? '?')
      : lookupText('equip.empty', locale)
    renderSpans(ctx, [{ text: nm }], PR_NAME_X, y, {
      glyphs,
      shadow: true,
      forceRgba: COLOR_NORMAL,
    })
  })

  // ③ 右:5 属性 label(纯黑无阴影)+ 有效值(青,右对齐)
  PR_STATS.forEach(({ stat, label }, i) => {
    renderSpans(
      ctx,
      [{ text: lookupText(label, locale) }],
      PR_STAT_LABEL_X,
      PR_STAT_LABEL_Y0 + i * PR_ROW_DY,
      {
        glyphs,
        shadow: false,
        forceRgba: COLOR_DARK,
      },
    )
    drawNumber(
      ctx,
      effectiveStat(caster, stat, DEMO_ITEMS),
      PR_STAT_VAL_RIGHT,
      PR_STAT_VAL_Y0 + i * PR_ROW_DY,
      assets.numsCyan,
    )
  })
}

/** 大世界装备面板:phase 分流(list 列表 / pick-role 换装面板)。 */
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
    drawEquipPickRole(ctx, state, world, assets, glyphs, locale, now)
    return
  }
  drawEquipList(ctx, state, world, assets, glyphs, now)
}
