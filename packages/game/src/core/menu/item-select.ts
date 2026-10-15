/**
 * M5.M-w0.2:ItemSelectMenu — 物品列表(sdlpal `itemmenu.c:380` 真值)。
 *
 * 分类标签:equip / potion / battle / important 4 类切换;数量 / 价格列开关
 * (mode='inventory'/'buy'/'sell')。
 *
 * 数据层只生成 visible SelectionMenuItem 列表(本身 reuse primitives.SelectionMenu);
 * 渲染层 draw-item-select.ts 后续接入。
 */

import type { Item } from '@type-pal/shared'
import type { InventoryEntry } from '../game-state.js'
import type { SelectionMenuState } from './primitives.js'
import { createSelectionMenu } from './primitives.js'

/** 按 ItemFlags 具名布尔的工程分类(简版):
 *  - equip := kItemFlagEquipable(global.h:136 = 1<<1;注意 1<<0 是 kItemFlagUsable,
 *    旧注"0x01 是装备类"位序写反,2026-10-15 更正)
 *  - potion/battle:按 usable/throwable/consuming 组合的工程近似
 *  - important:工程近似 —— SDLPal ITEMFLAG 枚举(global.h:134-141)**没有** kItemFlagImportant,
 *    此处以"非卖且非装备"近似剧情道具,不代表原版标志 */
export type ItemFilter = 'equip' | 'potion' | 'battle' | 'important' | 'usable' | 'sellable' | 'all'

/** 显示模式:inventory(默认无价格)/ buy(显价)/ sell(显卖价 = 价格 / 2). */
export type ItemDisplayMode = 'inventory' | 'buy' | 'sell'

export interface ItemSelectMenuConfig {
  /** 玩家 inventory(数量从这里取)。 */
  inventory: InventoryEntry[]
  /** 全部 items.json(查 item meta:flags / price / _name)。 */
  items: Item[]
  filter: ItemFilter
  mode: ItemDisplayMode
  /** 一屏行数(SelectionMenu pageSize)。 */
  pageSize?: number
}

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

/** sell 价 = 卖价(sdlpal `itemmenu.c` 真值:price / 2)。 */
function sellPrice(itemPrice: number): number {
  return Math.floor(itemPrice / 2)
}

/** 构造 ItemSelectMenu 的底层 SelectionMenu state。 */
export function createItemSelectMenu(cfg: ItemSelectMenuConfig): SelectionMenuState {
  const visible = cfg.inventory
    .map((entry) => ({ entry, item: cfg.items.find((i) => i.id === entry.itemId) }))
    .filter((x): x is { entry: InventoryEntry; item: Item } => x.item !== undefined)
    .filter(({ item }) => matchesFilter(item, cfg.filter))

  const menuItems = visible.map(({ entry, item }) => {
    const name = item._name ?? `item#${item.id}`
    let rightText = `×${entry.count}`
    if (cfg.mode === 'buy') {
      rightText = `$${item.price}`
    } else if (cfg.mode === 'sell') {
      rightText = `×${entry.count}  $${sellPrice(item.price)}`
    }
    return {
      id: item.id,
      label: name,
      rightText,
      // M5 简版 — 全可选;sell mode 下 important 类应该 disabled,买卖菜单 follow-up 精细
      disabled: false,
    }
  })

  return createSelectionMenu(menuItems, cfg.pageSize ?? 8)
}
