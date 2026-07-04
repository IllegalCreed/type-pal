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

// ── 指令菜单框(布局同 D17 主菜单:边框 22+18/行,项距边 +13)──────────
const MENU_PAD_X = 13
const MENU_PAD_Y = 13
const MENU_ITEM_H = 18
const MENU_H_BASE = 22

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
 * 框式竖排菜单(战斗指令/仙术/物品通用)。返回框宽(级联定位用)。
 * style black=黄框(一级) red=红框(战斗子菜单,一阶段 iStyle1 观感)。
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
  style: 'yellow' | 'red' = 'yellow',
): number {
  const hasRight = rows.some((r) => r.right !== undefined)
  const textW = Math.max(32, ...rows.map((r) => measureSpans([{ text: r.label }], glyphs)))
  const w = MENU_PAD_X + textW + (hasRight ? 8 + 24 : 0) + 35 // 右列数字区 + 右边框(卷轴头)
  const h = MENU_H_BASE + MENU_ITEM_H * rows.length
  drawSlicedBox(ctx, style === 'red' ? menu.redBox : menu.box, x, y, w, h)
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL
  rows.forEach((r, i) => {
    const selected = i === cursor
    let color: readonly [number, number, number]
    if (r.disabled) color = selected ? COLOR_DISABLED_SEL : COLOR_DISABLED
    else color = selected ? blink : COLOR_NORMAL
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
