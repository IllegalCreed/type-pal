/**
 * 商店卖菜单(全屏)— sdlpal `uigame.c:1755 PAL_SellMenu` 1:1 状态机。
 *
 * sdlpal 真值:`PAL_SellMenu` 不是紧凑列表(那是 `PAL_BuyMenu`),而是
 * `while (TRUE) { w = PAL_ItemSelectMenu(PAL_SellMenu_OnItemChange, kItemFlagSellable);
 *   if (w == 0) break; if (PAL_ConfirmMenu()) if (PAL_AddItemToInventory(w, -1)) cash += price/2; }`
 * —— 即**全屏物品 picker**(`itemmenu.c:28-466 PAL_ItemSelectMenuUpdate`,3 列 grid + ITEMBOX
 * 预览 + 数量),filter=kItemFlagSellable,叠 `PAL_SellMenu_OnItemChange` 的两个单行框
 * (金钱 @100,150 / 售价 @224,150)。带 callback 时 `g_fNoDesc=TRUE`(itemmenu.c:413)→ **不画物品描述**。
 *
 * 本状态机复用 InventoryMenu grid(同 PAL_ItemSelectMenuUpdate 的 cursor / 8-key 导航);
 * 渲染走 draw-inventory.ts(noDesc=true)+ draw-shop.ts drawSellOverlay。买菜单仍用紧凑
 * `shop-menu.ts`(sdlpal PAL_BuyMenu 本就是紧凑布局,忠实)。
 *
 * 2026-06-02:C9 由"紧凑卖菜单(视觉非 fullscreen)"补成全屏,user 决策不简化(对抗复核 high-conf REAL-WORK)。
 */

import type { Item } from '@type-pal/shared'
import type { GameState } from '../game-state.js'
import {
  type InventoryMenuState,
  createInventoryMenu,
  inventoryEnd,
  inventoryHome,
  inventoryMoveDown,
  inventoryMoveLeft,
  inventoryMoveRight,
  inventoryMoveUp,
  inventoryPageDown,
  inventoryPageUp,
} from './inventory-menu.js'
import { matchesFilter } from './item-select.js'

export type SellPhase = 'list' | 'confirm'

export interface SellMenuState {
  phase: SellPhase
  /** 全屏物品 grid(sdlpal PAL_ItemSelectMenu(kItemFlagSellable),filter='sellable')。 */
  grid: InventoryMenuState
  /** confirm 阶段选中的物品 OBJECT id(= items.json id)。 */
  selectedItemId?: number
  /** confirm yes/no — sdlpal PAL_ConfirmMenu 默认 No(false)。 */
  confirmYes: boolean
}

export function createSellMenu(gs: GameState, items: Item[]): SellMenuState {
  return { phase: 'list', grid: createInventoryMenu(gs, items, 'sellable'), confirmYes: false }
}

// ── 导航:list 阶段 delegate 到 grid(8-key);confirm 阶段方向键 toggle yes/no ──────────

export function sellMoveUp(s: SellMenuState): void {
  if (s.phase === 'confirm') s.confirmYes = !s.confirmYes
  else inventoryMoveUp(s.grid)
}

export function sellMoveDown(s: SellMenuState): void {
  if (s.phase === 'confirm') s.confirmYes = !s.confirmYes
  else inventoryMoveDown(s.grid)
}

export function sellMoveLeft(s: SellMenuState): void {
  if (s.phase === 'confirm') s.confirmYes = !s.confirmYes
  else inventoryMoveLeft(s.grid)
}

export function sellMoveRight(s: SellMenuState): void {
  if (s.phase === 'confirm') s.confirmYes = !s.confirmYes
  else inventoryMoveRight(s.grid)
}

export function sellPageUp(s: SellMenuState): void {
  if (s.phase === 'list') inventoryPageUp(s.grid)
}

export function sellPageDown(s: SellMenuState): void {
  if (s.phase === 'list') inventoryPageDown(s.grid)
}

export function sellHome(s: SellMenuState): void {
  if (s.phase === 'list') inventoryHome(s.grid)
}

export function sellEnd(s: SellMenuState): void {
  if (s.phase === 'list') inventoryEnd(s.grid)
}

/**
 * list 阶段 Confirm:选中 grid cursor 物品 → 进 confirm。
 * sdlpal itemmenu.c:287-307 真值:仅当 `(item.flags & kItemFlagSellable) && amount > amountInUse`
 * 才返回 wObject(否则该项 inactive 色,不可选,留 list 无反应)。
 * @returns true 若进了 confirm。
 */
export function sellSelectItem(s: SellMenuState, items: Item[]): boolean {
  if (s.phase !== 'list') return false
  const slot = s.grid.inventory[s.grid.cursor]
  if (!slot) return false
  const item = items.find((it) => it.id === slot.itemId)
  if (!item || !matchesFilter(item, 'sellable') || slot.count - slot.inUse <= 0) return false
  s.selectedItemId = slot.itemId
  s.confirmYes = false // sdlpal PAL_ConfirmMenu nDefault=0=No
  s.phase = 'confirm'
  return true
}

/**
 * confirm 阶段 Confirm:返回交易意图 → 回 list(caller 真做 cash/inventory + 重建 grid)。
 * @returns { itemId, yes } 或 null(非 confirm)。
 */
export function sellConfirm(s: SellMenuState): { itemId: number; yes: boolean } | null {
  if (s.phase !== 'confirm' || s.selectedItemId === undefined) return null
  const result = { itemId: s.selectedItemId, yes: s.confirmYes }
  s.phase = 'list'
  s.selectedItemId = undefined
  return result
}

/** Cancel/Menu:confirm → 回 list;list → 'close'(关商店 + resume 脚本)。 */
export function sellCancel(s: SellMenuState): 'close' | 'back' {
  if (s.phase === 'confirm') {
    s.phase = 'list'
    s.selectedItemId = undefined
    return 'back'
  }
  return 'close'
}

/**
 * 刷新 grid snapshot(卖出后 inventory 变 / 每帧 live)— sdlpal PAL_SellMenu while 每轮重跑
 * PAL_ItemSelectMenu。保 cursor(clamp 到新列表;物品卖光后列表缩短)。
 */
export function refreshSellGrid(s: SellMenuState, gs: GameState, items: Item[]): void {
  const prevCursor = s.grid.cursor
  const refreshed = createInventoryMenu(gs, items, 'sellable')
  s.grid.inventory = refreshed.inventory
  if (s.grid.inventory.length === 0) s.grid.cursor = 0
  else if (prevCursor >= s.grid.inventory.length) s.grid.cursor = s.grid.inventory.length - 1
  else s.grid.cursor = prevCursor
}
