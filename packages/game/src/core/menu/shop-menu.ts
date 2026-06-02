/**
 * 商店**买**菜单(紧凑布局)— sdlpal `uigame.c:1615 PAL_BuyMenu` 1:1 状态机。
 *
 * sdlpal 真值流程(**无数量选择** — 每次确认买 1 个,然后 loop 留在菜单):
 *  买(PAL_BuyMenu, store.rgwItems):
 *    while: 选 item → if price<=cash: PAL_ConfirmMenu() → yes: cash-=price; AddItem(w,1) → loop
 *    cancel → break(关菜单)
 *
 * 注:PAL_BuyMenu 在 sdlpal 本就是紧凑列表布局(`PAL_CreateBox(122,8)` + 预览窗),忠实保留。
 * **卖**菜单走全屏 picker(sdlpal PAL_SellMenu → PAL_ItemSelectMenu)→ 见 [sell-menu.ts](./sell-menu.ts)。
 *
 * confirm 默认 No(sdlpal `PAL_ConfirmMenu` → `PAL_SelectionMenu(2, 0, {No,Yes})`,nDefault=0=No)。
 * cash 扣 / inventory 改由 menu-driver 在 confirm-yes 时做(本文件纯状态机)。
 */

import type { Item } from '@type-pal/shared'
import {
  type SelectionMenuState,
  createSelectionMenu,
  getSelected,
  moveSelectionDown,
  moveSelectionUp,
} from './primitives.js'

export type ShopMode = 'buy' | 'sell'
export type ShopPhase = 'list' | 'confirm'

export interface ShopMenuState {
  mode: ShopMode
  phase: ShopPhase
  /** 物品列表(买:店铺出售物品;卖:玩家 inventory 中 sellable 物品)。 */
  list: SelectionMenuState
  /** confirm 阶段选中的物品 OBJECT id(= items.json id)。 */
  selectedItemId?: number
  /** confirm 阶段 yes/no — sdlpal PAL_ConfirmMenu 默认 No(false)。 */
  confirmYes: boolean
}

/** 把 Item 转成 list 项(label=名字,rightText=价)。 */
function toListItem(it: Item, price: number) {
  return { id: it.id, label: it._name ?? `?${it.id}`, rightText: String(price) }
}

/** 买菜单 list = 店铺出售物品(sdlpal `lprgStore[storeNum].rgwItems`,显原价)。 */
export function createBuyMenu(shopItems: Item[]): ShopMenuState {
  const items = shopItems.map((it) => toListItem(it, it.price))
  return { mode: 'buy', phase: 'list', list: createSelectionMenu(items, 8), confirmYes: false }
}

export function shopMoveUp(s: ShopMenuState): void {
  if (s.phase === 'list') moveSelectionUp(s.list)
  else s.confirmYes = !s.confirmYes
}

export function shopMoveDown(s: ShopMenuState): void {
  if (s.phase === 'list') moveSelectionDown(s.list)
  else s.confirmYes = !s.confirmYes
}

/**
 * list 阶段 Confirm:选中物品 → 进 confirm。
 * sdlpal 买:`if (price <= cash)` 才弹 confirm,买不起则什么都不做留 list(uigame.c:1683)。
 * @returns true 若进了 confirm;false 留 list(空列表 / 买不起)。
 */
export function shopSelectItem(s: ShopMenuState, items: Item[], gsCash: number): boolean {
  if (s.phase !== 'list') return false
  const sel = getSelected(s.list)
  if (!sel) return false
  if (s.mode === 'buy') {
    const item = items.find((it) => it.id === sel.id)
    if (!item || item.price > gsCash) return false // 买不起:不弹 confirm
  }
  s.selectedItemId = sel.id
  s.confirmYes = false // sdlpal PAL_ConfirmMenu 默认 No
  s.phase = 'confirm'
  return true
}

/**
 * confirm 阶段 Confirm:返回交易意图(yes 时 caller 真做 cash/inventory)→ 回 list。
 * @returns { itemId, mode, yes } 或 null(非 confirm)。
 */
export function shopConfirm(
  s: ShopMenuState,
): { itemId: number; mode: ShopMode; yes: boolean } | null {
  if (s.phase !== 'confirm' || s.selectedItemId === undefined) return null
  const result = { itemId: s.selectedItemId, mode: s.mode, yes: s.confirmYes }
  s.phase = 'list'
  s.selectedItemId = undefined
  return result
}

/**
 * Cancel/Menu:confirm → 回 list;list → 'close'(关商店 + resume 脚本)。
 */
export function shopCancel(s: ShopMenuState): 'close' | 'back' {
  if (s.phase === 'confirm') {
    s.phase = 'list'
    s.selectedItemId = undefined
    return 'back'
  }
  return 'close'
}
