/**
 * M5.M-w3.a:BuyMenu / SellMenu + openShop opcode(sdlpal `uigame.c:1781` 真值,
 * script.c:0x0026 buy / 0x0027 sell)。
 *
 * 流程:openShop opcode 给 inventory list(shop 卖什么 item)→ BuyMenu 选 item →
 * 确认数量 → 扣 cash + 加 inventory。SellMenu 反向(从 player inventory 选)。
 *
 * 数据 state machine,真 cash 扣 + inventory 改由 caller 在 confirm 时做。
 */

import type { Item } from '@type-pal/shared'
import type { GameState, InventoryEntry } from '../game-state.js'
import { createItemSelectMenu } from './item-select.js'
import {
  type SelectionMenuState,
  moveSelectionDown,
  moveSelectionUp,
} from './primitives.js'

export type ShopMode = 'buy' | 'sell'
export type ShopPhase = 'list' | 'confirm-qty' | 'done'

export interface ShopMenuState {
  mode: ShopMode
  phase: ShopPhase
  list: SelectionMenuState
  selectedItemId?: number
  /** 购买 / 卖出 数量(默认 1)。 */
  qty: number
  /** 最大可买数 = floor(cash / price),最大可卖 = inventory count。 */
  qtyMax: number
}

/** BuyMenu — items 是 shop inventory(openShop opcode 提供)。 */
export function createBuyMenu(items: Item[], gsCash: number): ShopMenuState {
  // BuyMenu 显示全部 shop items;数量字段补 inventory-count(但 buy 不需要 — count
  // 占位为 1)。reuse createItemSelectMenu 用 buy mode 显价格。
  const shopInventory: InventoryEntry[] = items.map((i) => ({ itemId: i.id, count: 1 }))
  return {
    mode: 'buy',
    phase: 'list',
    list: createItemSelectMenu({ inventory: shopInventory, items, filter: 'all', mode: 'buy' }),
    qty: 1,
    qtyMax: gsCash, // 进 confirm-qty 时再按 price 重算
  }
}

/** SellMenu — 从玩家 inventory 选可卖物品(item.flags.sellable=true)。 */
export function createSellMenu(gs: GameState, items: Item[]): ShopMenuState {
  return {
    mode: 'sell',
    phase: 'list',
    list: createItemSelectMenu({
      inventory: gs.inventory,
      items: items.filter((i) => i.flags.sellable),
      filter: 'all',
      mode: 'sell',
    }),
    qty: 1,
    qtyMax: 1,
  }
}

/** confirm list → 进 confirm-qty;计算 qtyMax(buy = cash/price,sell = inventory count)。 */
export function confirmShopItem(
  state: ShopMenuState,
  items: Item[],
  gsCash: number,
  gsInventory: InventoryEntry[],
): void {
  if (state.phase !== 'list') return
  const sel = state.list.items[state.list.cursor]
  if (!sel) return
  const item = items.find((i) => i.id === sel.id)
  if (!item) return
  state.selectedItemId = item.id
  state.qty = 1
  if (state.mode === 'buy') {
    state.qtyMax = item.price > 0 ? Math.floor(gsCash / item.price) : 99
  } else {
    const inv = gsInventory.find((e) => e.itemId === item.id)
    state.qtyMax = inv?.count ?? 0
  }
  if (state.qtyMax === 0) {
    // sdlpal 真值:emit "钱不够" / "没有此物品";M5 简版直接 cancel 回 list
    return
  }
  state.phase = 'confirm-qty'
}

export function adjustQty(state: ShopMenuState, delta: number): void {
  if (state.phase !== 'confirm-qty') return
  state.qty = Math.max(1, Math.min(state.qtyMax, state.qty + delta))
}

/** confirm-qty → 返回 { itemId, qty, mode } 让 caller 真做 cash 扣 + inventory 改。 */
export function confirmShopQty(
  state: ShopMenuState,
): { itemId: number; qty: number; mode: ShopMode } | null {
  if (state.phase !== 'confirm-qty' || state.selectedItemId === undefined) return null
  state.phase = 'done'
  return { itemId: state.selectedItemId, qty: state.qty, mode: state.mode }
}

export function cancelShopMenu(state: ShopMenuState): void {
  if (state.phase === 'confirm-qty') {
    state.phase = 'list'
    state.selectedItemId = undefined
  } else if (state.phase === 'list') {
    state.phase = 'done'
  }
}

export function shopMoveUp(s: ShopMenuState): void {
  if (s.phase === 'list') moveSelectionUp(s.list)
  else if (s.phase === 'confirm-qty') adjustQty(s, 1)
}

export function shopMoveDown(s: ShopMenuState): void {
  if (s.phase === 'list') moveSelectionDown(s.list)
  else if (s.phase === 'confirm-qty') adjustQty(s, -1)
}

