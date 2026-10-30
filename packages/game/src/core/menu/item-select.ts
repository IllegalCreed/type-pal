/** Shared item flag predicates for inventory selection and row eligibility. */

import type { Item } from '@type-pal/shared'

/** 按 ItemFlags 具名布尔的工程分类(简版):
 *  - equip := kItemFlagEquipable(global.h:136 = 1<<1)，usable位为1<<0
 *  - potion/battle:按 usable/throwable/consuming 组合的工程近似
 *  - important:工程近似 —— SDLPal ITEMFLAG 枚举(global.h:134-141)**没有** kItemFlagImportant,
 *    此处以"非卖且非装备"近似剧情道具,不代表原版标志 */
export type ItemFilter = 'equip' | 'potion' | 'battle' | 'important' | 'usable' | 'sellable' | 'all'

/** filter → item 是否归属此类。M5 简版按 ItemFlags 拆 bit 判断。 */
export function matchesFilter(item: Item, filter: ItemFilter): boolean {
  if (filter === 'all') return true
  const f = item.flags
  switch (filter) {
    case 'equip':
      return f.equipable
    case 'potion':
      return f.usable && !f.equipable && !f.throwable
    case 'battle':
      return f.throwable || (f.usable && f.consuming)
    // 工程分类：只检查非卖且非装备，不检查 consuming。
    // SDLPal ITEMFLAG 没有 Important 位；不能将此近似当作原版标志。
    case 'important':
      return !f.sellable && !f.equipable
    // sdlpal play.c:266 `PAL_ItemSelectMenu(NULL, kItemFlagUsable)` 真值 — PAL_GameUseItem
    // 入口的 filter,直接按 item.flags.usable 标志。
    case 'usable':
      return f.usable
    // sdlpal uigame.c:1777 `PAL_ItemSelectMenu(PAL_SellMenu_OnItemChange, kItemFlagSellable)` —
    // PAL_SellMenu 入口 filter,只列可卖物品(kItemFlagSellable)。
    case 'sellable':
      return f.sellable
  }
}
