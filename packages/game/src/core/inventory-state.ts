/** 背包数据操作；菜单和解释器共用，无脚本执行或UI依赖。 */
import type { GameState } from './game-state.js'

/**
 * Apply a signed quantity to this game's inventory. OBJECT id 0 is the empty sentinel;
 * quantity 0 adds one, and additions cap at 99 (SDLPal PAL_AddItemToInventory).
 * TS removes an exhausted entry instead of retaining C's zero-amount slot. Equipment
 * fallback belongs to the remove-item opcode caller, not this inventory-only helper.
 */
export function addItemToInventory(gs: GameState, itemId: number, qty: number): void {
  if (itemId === 0) return
  if (qty === 0) qty = 1
  const entry = gs.inventory.find((e) => e.itemId === itemId)
  if (entry) {
    entry.count = Math.min(99, Math.max(0, entry.count + qty))
    if (entry.count === 0) {
      gs.inventory = gs.inventory.filter((e) => e.itemId !== itemId)
    }
  } else if (qty > 0) {
    gs.inventory.push({ itemId, count: Math.min(99, qty) })
  }
}

/** Equipment-script callers remove one new item before returning the previous equipment. */
export function consumeItemFromInventory(gs: GameState, itemId: number): void {
  addItemToInventory(gs, itemId, -1)
}
