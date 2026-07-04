/**
 * 战斗 UI 绘制(M4d-1)—— 队员信息框 / 框式指令菜单 / 当前行动者手指。
 *
 * UX 形态参照一阶段战斗 UI(playerbox+头像+黄青错落数字,91+77i,165),实现全部
 * 复用 D17 菜单基建(drawSlicedBox 九宫格 / renderSpans 字模 / drawNumber 预烘数字);
 * 320 逻辑坐标,调用方已 ctx.scale。资产缺省时调用方走文字兜底(单测/加载失败容错)。
 */

import {
  COLOR_DISABLED,
  COLOR_DISABLED_SEL,
  COLOR_NORMAL,
  drawNumber,
  drawScroll,
  drawSlicedBox,
  type MenuAssets,
  SELECTED_COLORS,
} from '../menu/menu-box.js'
import type { GlyphTable } from '../text/glyph.js'
import { measureSpans, renderSpans } from '../text/text-render.js'

// ── 队员信息框(一阶段 91+77i,165;playerbox 75×35 贴屏底)──────────────
const INFO_X_BASE = 91
const INFO_X_STEP = 77
const INFO_Y = 165
// HP/MP 错落布局(一阶段 uibattle 考证):cur 右缘 x+50 / slash x+49 / max 右缘 x+71
const NUM_CUR_RIGHT = 50
const NUM_MAX_RIGHT = 71
const SLASH_X = 49
const HP_CUR_Y = 5
const HP_SLASH_Y = 6
const HP_MAX_Y = 8
const MP_CUR_Y = 21
const MP_SLASH_Y = 22
const MP_MAX_Y = 24

// ── 竖排小盒(杂项盒/使用投掷盒;一阶段杂项盒 box(2,20) 项(16,32) → 盒内偏移 14,12)──
const MENU_PAD_X = 14
const MENU_PAD_Y = 12
const MENU_ITEM_H = 18
const MENU_H_BASE = 22
/** 已确认父项固定色(一阶段 MENUITEM_COLOR_CONFIRMED 0x2C 金黄)。 */
const COLOR_CONFIRMED = [255, 203, 113] as const

// ── 主菜单 4 图标(一阶段 uibattle 真值:攻击/法术/合击/杂项,菱形布局)──
const MAIN_ICON_POS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 27, y: 140 }, // 攻击
  { x: 0, y: 155 }, // 法术
  { x: 54, y: 155 }, // 合击
  { x: 27, y: 170 }, // 杂项
]

// ── 3 列分页网格(一阶段 magicmenu/itemmenu 真值)──
export interface GridLayout {
  box: { x: number; y: number; w: number; h: number }
  item0: { x: number; y: number }
  colW: number
  rowH: number
  rows: number
  /** 分页偏移行数(pageStart = floor(cursor/3)*3 − 3*offset)。 */
  pageOffset: number
  /** 数量数字相对 item x 的右缘偏移;undefined = 不画(法术网格)。 */
  amountX?: number
}
/** 法术网格:box(10,42) 4 行中段 → 300×114;项 (35,54)+col*87+row*18,显示 5 行。 */
export const MAGIC_GRID: GridLayout = {
  box: { x: 10, y: 42, w: 300, h: 114 },
  item0: { x: 35, y: 54 },
  colW: 87,
  rowH: 18,
  rows: 5,
  pageOffset: 2,
}
/** 物品网格:box(2,0) 6 行中段 → 316×150;项 (15,12)+col*100+row*18,显示 7 行,数量 @+81。 */
export const ITEM_GRID: GridLayout = {
  box: { x: 2, y: 0, w: 316, h: 150 },
  item0: { x: 15, y: 12 },
  colW: 100,
  rowH: 18,
  rows: 7,
  pageOffset: 4,
  amountX: 81,
}

export interface InfoBoxPlayer {
  roleId: string
  hp: number
  maxHp: number
  mp: number
  maxMp: number
}

/** 队员信息框一枚:框 + 头像(死亡灰化)+ HP 黄 / MP 青错落数字。 */
export function drawPlayerInfoBox(
  ctx: CanvasRenderingContext2D,
  menu: MenuAssets,
  face: ImageBitmap | undefined,
  p: InfoBoxPlayer,
  slot: number,
): void {
  const x = INFO_X_BASE + slot * INFO_X_STEP
  const y = INFO_Y
  if (menu.magicPlayerBox) ctx.drawImage(menu.magicPlayerBox, x, y)
  if (face) {
    if (p.hp <= 0) {
      ctx.save()
      ctx.filter = 'grayscale(1) brightness(0.6)' // 死亡:一阶段 mono 黑白的 RGBA 等价
      ctx.drawImage(face, x - 2, y - 4)
      ctx.restore()
    } else {
      ctx.drawImage(face, x - 2, y - 4)
    }
  }
  if (menu.slash) {
    ctx.drawImage(menu.slash, x + SLASH_X, y + HP_SLASH_Y)
    ctx.drawImage(menu.slash, x + SLASH_X, y + MP_SLASH_Y)
  }
  drawNumber(ctx, p.hp, x + NUM_CUR_RIGHT, y + HP_CUR_Y, menu.nums)
  drawNumber(ctx, p.maxHp, x + NUM_MAX_RIGHT, y + HP_MAX_Y, menu.nums)
  drawNumber(ctx, p.mp, x + NUM_CUR_RIGHT, y + MP_CUR_Y, menu.numsCyan)
  drawNumber(ctx, p.maxMp, x + NUM_MAX_RIGHT, y + MP_MAX_Y, menu.numsCyan)
}

export interface BattleMenuRow {
  label: string
  disabled?: boolean
  /** 行右侧数值(仙术 MP / 物品数量);黄数字右对齐。 */
  right?: number
}

/**
 * 竖排小盒菜单(杂项盒/使用投掷盒,一阶段 uibattle 杂项盒布局)。返回框宽。
 * confirmed=true:当前项固定金黄(已进二级,父项确认色 0x2C),其余不闪。
 */
export function drawBattleMenuBox(
  ctx: CanvasRenderingContext2D,
  menu: MenuAssets,
  glyphs: GlyphTable,
  rows: BattleMenuRow[],
  cursor: number,
  now: number,
  x: number,
  y: number,
  confirmed = false,
): number {
  const hasRight = rows.some((r) => r.right !== undefined)
  const textW = Math.max(32, ...rows.map((r) => measureSpans([{ text: r.label }], glyphs)))
  const w = MENU_PAD_X + textW + (hasRight ? 8 + 24 : 0) + 31 // 一阶段 cols 换算:22+textW+23
  const h = MENU_H_BASE + MENU_ITEM_H * rows.length
  drawSlicedBox(ctx, menu.box, x, y, w, h)
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL
  rows.forEach((r, i) => {
    const selected = i === cursor
    let color: readonly [number, number, number]
    if (r.disabled) color = selected ? COLOR_DISABLED_SEL : COLOR_DISABLED
    else if (selected) color = confirmed ? COLOR_CONFIRMED : blink
    else color = COLOR_NORMAL
    const ry = y + MENU_PAD_Y + i * MENU_ITEM_H
    renderSpans(ctx, [{ text: r.label }], x + MENU_PAD_X, ry, {
      glyphs,
      shadow: true,
      forceRgba: color,
    })
    if (r.right !== undefined) {
      drawNumber(ctx, r.right, x + w - 14, ry + 5, r.disabled ? menu.numsBlue : menu.nums)
    }
  })
  return w
}

/**
 * 主菜单 4 图标(一阶段:选中=全彩,可用未选=灰阶,不可用=深灰;highlight=false 全灰)。
 * icons 序 = 0攻击 1法术 2合击 3杂项。
 */
export function drawMainIcons(
  ctx: CanvasRenderingContext2D,
  icons: (ImageBitmap | undefined)[],
  selected: number,
  valid: readonly boolean[],
  highlight: boolean,
): void {
  MAIN_ICON_POS.forEach((pos, i) => {
    const img = icons[i]
    if (!img) return
    if (highlight && i === selected) {
      ctx.drawImage(img, pos.x, pos.y) // 选中 = 全彩
      return
    }
    ctx.save()
    // 一阶段 MonoColor(0,-4)/(0x10,-4) 的 RGBA 近似:可用灰阶 / 不可用更暗
    ctx.filter = valid[i] ? 'grayscale(1) brightness(0.8)' : 'grayscale(1) brightness(0.45)'
    ctx.drawImage(img, pos.x, pos.y)
    ctx.restore()
  })
}

/**
 * 3 列分页网格(一阶段 magicmenu/itemmenu):红框 + 逐格上色 + 手指光标 + (物品)数量。
 */
export function drawBattleGrid(
  ctx: CanvasRenderingContext2D,
  menu: MenuAssets,
  glyphs: GlyphTable,
  rows: BattleMenuRow[],
  cursor: number,
  now: number,
  lay: GridLayout,
): void {
  drawSlicedBox(ctx, menu.redBox, lay.box.x, lay.box.y, lay.box.w, lay.box.h)
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL
  let pageStart = Math.floor(cursor / 3) * 3 - 3 * lay.pageOffset
  if (pageStart < 0) pageStart = 0
  let i = pageStart
  outer: for (let row = 0; row < lay.rows; row++) {
    for (let col = 0; col < 3; col++) {
      if (i >= rows.length) break outer
      const r = rows[i]!
      const selected = i === cursor
      let color: readonly [number, number, number]
      if (selected) color = r.disabled ? COLOR_DISABLED_SEL : blink
      else color = r.disabled ? COLOR_DISABLED : COLOR_NORMAL
      const x = lay.item0.x + col * lay.colW
      const y = lay.item0.y + row * lay.rowH
      renderSpans(ctx, [{ text: r.label }], x, y, { glyphs, shadow: true, forceRgba: color })
      if (lay.amountX !== undefined && r.right !== undefined && r.right > 1) {
        drawNumber(ctx, r.right, x + lay.amountX, y + 5, menu.numsCyan)
      }
      if (selected && menu.cursorGrid) ctx.drawImage(menu.cursorGrid, x + 25, y + 10)
      i++
    }
  }
}

/** 法术网格左上 MP 框(一阶段 WIN95 布局):卷轴(0,0)len5 + needed 黄 / slash / current 青。 */
export function drawMpBox(
  ctx: CanvasRenderingContext2D,
  menu: MenuAssets,
  needed: number,
  current: number,
): void {
  drawScroll(ctx, menu.scroll, 0, 0, 5)
  if (menu.slash) ctx.drawImage(menu.slash, 45, 14)
  drawNumber(ctx, needed, 39, 14, menu.nums)
  drawNumber(ctx, current, 74, 14, menu.numsCyan)
}

/** 物品网格左下选中物详情框(一阶段 ITEMBOX@0,140 + 图标 @+8,+7)。 */
export function drawItemDetailBox(
  ctx: CanvasRenderingContext2D,
  menu: MenuAssets,
  icon: ImageBitmap | undefined,
): void {
  drawSlicedBox(ctx, menu.itembox, 0, 140, 64, 64)
  if (icon) ctx.drawImage(icon, 8, 147)
}

/** 当前行动队员头顶手指(一阶段 68红/69常 闪烁;x = 精灵中心,topY = 精灵头顶)。 */
export function drawCurrentFinger(
  ctx: CanvasRenderingContext2D,
  menu: MenuAssets,
  centerX: number,
  topY: number,
  now: number,
): void {
  const img = Math.floor(now / 160) % 2 === 0 ? menu.cursorDown : menu.cursorGrid
  if (img) ctx.drawImage(img, centerX - 4, topY - 10)
}
