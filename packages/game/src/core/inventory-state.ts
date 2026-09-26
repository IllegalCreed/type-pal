/** 背包数据操作；菜单和解释器共用，无脚本执行或UI依赖。 */
import type { GameState } from './game-state.js'

/** I-w1.a 共用 helper:inventory 加/减(qty signed)。port sdlpal global.c:1063-1172 PAL_AddItemToInventory。
 *  - **qty == 0 → 1**(sdlpal global.c:1094-1097 真值;giveItem 反编译 count=0 实际给 1 个,
 *    这是 user 2026-05-29 "调查柜子获得净衣符但列表空" 根因之一)
 *  - qty > 0:已有 → count+=qty(max 99 clamp,sdlpal global.c:1123/1128);无则 push 新条目(99 clamp)
 *  - qty < 0:已有 → count clamp 到 0;无则 no-op(简版,不做 sdlpal equipment fallback)
 *  注:当前调用域沿用 OBJECT id，id 0 是空槽哨兵；加载期已修正有明确证据的宝箱脚本。 */
export function addItemToInventory(gs: GameState, itemId: number, qty: number): void {
  // sdlpal global.c PAL_AddItemToInventory 开头:`if (wObjectID == 0) return FALSE` —— id 0 绝不入库。
  //   扬州宝物屋数据含 giveItem itemId=0 的空槽标记(夹在真道具间),漏此守卫会 push 幽灵槽 →
  //   渲染层 fallback「?」+id =「?0」(user 2026-06-13 报)。原版这些是空宝箱,本就不给道具。
  if (itemId === 0) return
  // sdlpal global.c:1094 真值:iNum == 0 → 1
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

/** Export for menu-driver(M5.6 session 3:大世界 PAL_GameUseItem 等价 — 物品消耗 / 装备脚本)。 */
export function consumeItemFromInventory(gs: GameState, itemId: number): void {
  addItemToInventory(gs, itemId, -1)
}
