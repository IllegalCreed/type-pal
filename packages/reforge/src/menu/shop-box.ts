/**
 * 商店(买)/ 当铺(卖)—— openShop 指令的 UI(阻塞脚本至关店)。
 * 忠实一阶段/原版形态(UX 真值,坐标 1:1):
 * - 买 = sdlpal uigame.c:1615 PAL_BuyMenu 紧凑布局:列表框(122,8)8 行滚动窗 +
 *   名@(150,21+i*18) + 价右@(238,26+i*18);预览 = ITEMBOX@(40,8)+图标@(48,15)、
 *   「现有」框@(20,100)、「金钱」框@(20,141)。每次买 1 个、买完留在菜单;钱不够不进确认。
 * - 卖 = uigame.c:1755 PAL_SellMenu 全屏物品 picker(drawItemGridList noDesc)+
 *   金钱框@(100,150) + 售价框@(224,150);按 item.sellPrice(pal 数据 = 原版半价)。
 * - 确认 = PAL_ConfirmMenu(否/是,默认否)—— drawConfirmBox 原版坐标(130/205,100)。
 */
import type { ItemData, ItemDataMap, WorldState } from '@type-pal/content'
import { shopBuy, shopSell } from '@type-pal/content'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'
import { drawItemGridList } from './item-list.js'
import {
  drawConfirmBox,
  drawNumber,
  drawScroll,
  drawSlicedBox,
  type MenuAssets,
} from './menu-box.js'

// ── 买菜单坐标(uigame.c PAL_BuyMenu / OnItemChange 真值)──
const LIST_BOX = { x: 122, y: 8, w: 190, h: 190 } // PAL_CreateBox(122,8,8行,8列,style1);定高撑到底(货少也空着,对照原版截图:底缘 ~198)
const NAME_X = 150
const NAME_Y0 = 21
const LINE_H = 18
const PRICE_RIGHT_X = 286 // 价个位右缘(原版 DrawNumber(price,6,x=238,right):6 位场左缘 238 → 个位缘 238+48;对照原版截图校准)
const PRICE_Y0 = 26
const VISIBLE_ROWS = 8
const PREVIEW_ITEMBOX = { x: 40, y: 8 }
const PREVIEW_ICON = { x: 48, y: 15 }
const OWNED_BOX = { x: 20, y: 100, len: 5 }
const CASH_BOX = { x: 20, y: 141, len: 5 }
// ── 卖 overlay 坐标(uigame.c PAL_SellMenu_OnItemChange 真值)──
const SELL_CASH_BOX = { x: 100, y: 150, len: 5 }
const SELL_PRICE_BOX = { x: 224, y: 150, len: 5 }

const COLOR_NORMAL = [199, 186, 174] as const // 0x4F 米白
const COLOR_LABEL = [26, 30, 22] as const // 卷轴纸上标签(原版 color0 黑,无影)
const SELECTED_COLORS = [
  [247, 231, 109],
  [235, 211, 97],
  [227, 190, 89],
  [219, 174, 81],
  [231, 195, 93],
  [243, 219, 105],
] as const

export interface ShopUiState {
  mode: 'buy' | 'sell'
  phase: 'list' | 'confirm'
  /** 买:店货单物品 id;卖:背包可卖物品 id(每次结算后重算)。 */
  list: string[]
  cursor: number
  scrollTop: number // 买列表滚动窗顶(8 行窗)
  confirmYes: boolean
}

export function openShopUi(mode: 'buy' | 'sell', list: string[]): ShopUiState {
  return { mode, phase: 'list', list, cursor: 0, scrollTop: 0, confirmYes: false }
}

/** 「现有」数 = 背包 + 全队已装备(uigame.c:1554-1577)。 */
function ownedCount(world: WorldState, itemId: string): number {
  let n = world.inventory.find((e) => e.itemId === itemId)?.count ?? 0
  for (const c of world.party) for (const id of Object.values(c.equipment)) if (id === itemId) n++
  return n
}

/** 输入处理。返回 'close' = 关店(调用方 resolve 脚本);'changed' = world 已被结算换新。 */
export function shopInput(
  s: ShopUiState,
  pressed: Set<string>,
  world: WorldState,
  items: ItemDataMap,
  apply: (next: WorldState) => void,
): 'close' | 'changed' | undefined {
  const confirm = pressed.has(' ') || pressed.has('Enter')
  const esc = pressed.has('Escape')
  if (s.phase === 'confirm') {
    if (pressed.has('ArrowLeft') || pressed.has('ArrowRight') || pressed.has('ArrowUp') || pressed.has('ArrowDown'))
      s.confirmYes = !s.confirmYes
    if (esc) {
      s.phase = 'list'
      s.confirmYes = false
      return
    }
    if (confirm) {
      const itemId = s.list[s.cursor]
      s.phase = 'list'
      const yes = s.confirmYes
      s.confirmYes = false
      if (!yes || !itemId) return
      const next = s.mode === 'buy' ? shopBuy(world, itemId, items) : shopSell(world, itemId, items)
      if (!next) return
      apply(next)
      if (s.mode === 'sell') {
        // 卖光一种 → 列表重算 + cursor 收敛
        s.list = next.inventory
          .filter((x) => x.count > 0 && items[x.itemId]?.sellable)
          .map((x) => x.itemId)
        if (s.cursor >= s.list.length) s.cursor = Math.max(0, s.list.length - 1)
      }
      return 'changed'
    }
    return
  }
  // list 相
  if (esc) return 'close'
  if (s.mode === 'buy') {
    if (pressed.has('ArrowUp')) s.cursor = Math.max(0, s.cursor - 1)
    if (pressed.has('ArrowDown')) s.cursor = Math.min(s.list.length - 1, s.cursor + 1)
    if (s.cursor < s.scrollTop) s.scrollTop = s.cursor
    if (s.cursor >= s.scrollTop + VISIBLE_ROWS) s.scrollTop = s.cursor - VISIBLE_ROWS + 1
  } else {
    // 卖 = 3 列 grid(同 use 菜单键位)
    if (pressed.has('ArrowLeft')) s.cursor = Math.max(0, s.cursor - 1)
    if (pressed.has('ArrowRight')) s.cursor = Math.min(s.list.length - 1, s.cursor + 1)
    if (pressed.has('ArrowUp')) s.cursor = Math.max(0, s.cursor - 3)
    if (pressed.has('ArrowDown')) s.cursor = Math.min(s.list.length - 1, s.cursor + 3)
  }
  if (confirm && s.list.length > 0) {
    const it = items[s.list[s.cursor]!]
    if (!it) return
    if (s.mode === 'buy' && world.money < it.buyPrice) return // 钱不够:不进确认(原版 if price<=cash)
    s.phase = 'confirm'
    s.confirmYes = false // 默认否(PAL_ConfirmMenu nDefault=0)
  }
  return
}

export function drawShop(
  ctx: CanvasRenderingContext2D,
  s: ShopUiState,
  world: WorldState,
  items: ItemDataMap,
  assets: MenuAssets,
  glyphs: GlyphTable,
  now: number,
  locale: { no: string; yes: string },
): void {
  if (s.mode === 'sell') {
    // 全屏 picker(noDesc)+ 金钱/售价框
    const list: ItemData[] = s.list.map((id) => items[id]).filter((x): x is ItemData => !!x)
    drawItemGridList(ctx, list, s.cursor, world, assets, glyphs, now, undefined, { noDesc: true })
    drawScroll(ctx, assets.scroll, SELL_CASH_BOX.x, SELL_CASH_BOX.y, SELL_CASH_BOX.len)
    renderSpans(ctx, [{ text: '金钱' }], SELL_CASH_BOX.x + 10, SELL_CASH_BOX.y + 10, {
      glyphs,
      forceRgba: COLOR_LABEL,
    })
    drawNumber(ctx, world.money, SELL_CASH_BOX.x + 48 + 30, SELL_CASH_BOX.y + 15, assets.nums)
    drawScroll(ctx, assets.scroll, SELL_PRICE_BOX.x, SELL_PRICE_BOX.y, SELL_PRICE_BOX.len)
    const sel = s.list[s.cursor] ? items[s.list[s.cursor]!] : undefined
    if (sel?.sellable) {
      renderSpans(ctx, [{ text: '售价' }], SELL_PRICE_BOX.x + 10, SELL_PRICE_BOX.y + 10, {
        glyphs,
        forceRgba: COLOR_LABEL,
      })
      drawNumber(ctx, sel.sellPrice, SELL_PRICE_BOX.x + 48 + 30, SELL_PRICE_BOX.y + 15, assets.nums)
    }
  } else {
    // 买:列表框(**红框** —— 原版 PAL_CreateBox iStyle=1 红底,作者对照原版截图纠正)+ 滚动窗 8 行
    drawSlicedBox(ctx, assets.redBox, LIST_BOX.x, LIST_BOX.y, LIST_BOX.w, LIST_BOX.h)
    const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL
    const win = s.list.slice(s.scrollTop, s.scrollTop + VISIBLE_ROWS)
    win.forEach((id, i) => {
      const it = items[id]
      if (!it) return
      const idx = s.scrollTop + i
      const y = NAME_Y0 + i * LINE_H
      renderSpans(ctx, [{ text: it.name }], NAME_X, y, {
        glyphs,
        shadow: true,
        forceRgba: idx === s.cursor ? blink : COLOR_NORMAL,
      })
      drawNumber(ctx, it.buyPrice, PRICE_RIGHT_X, PRICE_Y0 + i * LINE_H, assets.nums)
    })
    // 预览:itembox + 图标 + 现有/金钱框
    // ITEMBOX 带阴影(原版 itemmenu.c:196 shadow(+5,+5)+正色两笔;作者报缺影)
    drawSlicedBox(ctx, assets.itembox, PREVIEW_ITEMBOX.x, PREVIEW_ITEMBOX.y, 64, 64)
    const sel = s.list[s.cursor] ? items[s.list[s.cursor]!] : undefined
    if (sel) {
      const icon = assets.itemIcons[sel.icon]
      if (icon) ctx.drawImage(icon, PREVIEW_ICON.x, PREVIEW_ICON.y)
    }
    drawScroll(ctx, assets.scroll, OWNED_BOX.x, OWNED_BOX.y, OWNED_BOX.len)
    renderSpans(ctx, [{ text: '现有' }], OWNED_BOX.x + 10, OWNED_BOX.y + 10, {
      glyphs,
      forceRgba: COLOR_LABEL,
    })
    drawNumber(ctx, sel ? ownedCount(world, sel.id) : 0, OWNED_BOX.x + 49 + 30, OWNED_BOX.y + 15, assets.nums)
    drawScroll(ctx, assets.scroll, CASH_BOX.x, CASH_BOX.y, CASH_BOX.len)
    renderSpans(ctx, [{ text: '金钱' }], CASH_BOX.x + 10, CASH_BOX.y + 10, {
      glyphs,
      forceRgba: COLOR_LABEL,
    })
    drawNumber(ctx, world.money, CASH_BOX.x + 49 + 30, CASH_BOX.y + 15, assets.nums)
  }

  if (s.phase === 'confirm') {
    drawConfirmBox(
      ctx,
      assets.scroll,
      { leftText: locale.no, rightText: locale.yes, rightSelected: s.confirmYes },
      glyphs,
      now,
    )
  }
}
