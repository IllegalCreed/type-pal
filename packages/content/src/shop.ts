/**
 * 商店/当铺(openShop 指令的数据与结算)。
 * 原版真值:买 = 店铺货单(store.rgwItems)按 buyPrice 购入,每次 1 个、钱不够不能买;
 * 卖 = 背包 sellable 物品按 **sellPrice** 售出(pal 数据 = 原版 price/2,作者可自定义),
 * 穿戴中的不卖(在装备槽不在背包)。结算是纯函数,UI/宿主只管调。
 */
import type { WorldState } from './character.js'
import type { ItemDataMap } from './item.js'

/** 店铺定义(货单 = 物品 id 列表;买价显示/结算都取 item.buyPrice)。 */
export interface ShopDef {
  id: number
  items: string[]
}

/** 买 1 个:钱够 → 扣钱 + 入包(新 WorldState);钱不够/物品不存在 → null(UI 播错音/不动)。 */
export function shopBuy(world: WorldState, itemId: string, items: ItemDataMap): WorldState | null {
  const it = items[itemId]
  if (!it || world.money < it.buyPrice) return null
  const inv = world.inventory.some((x) => x.itemId === itemId)
    ? world.inventory.map((x) => (x.itemId === itemId ? { ...x, count: x.count + 1 } : x))
    : [...world.inventory, { itemId, count: 1 }]
  return { ...world, money: world.money - it.buyPrice, inventory: inv }
}

/** 卖 1 个:背包有且 sellable → 出包 + 得 sellPrice;否则 null。 */
export function shopSell(world: WorldState, itemId: string, items: ItemDataMap): WorldState | null {
  const it = items[itemId]
  if (!it?.sellable) return null
  if (!world.inventory.some((x) => x.itemId === itemId && x.count > 0)) return null
  const inv = world.inventory
    .map((x) => (x.itemId === itemId ? { ...x, count: x.count - 1 } : x))
    .filter((x) => x.count > 0)
  return { ...world, money: world.money + it.sellPrice, inventory: inv }
}

/** 背包里可卖物品(卖菜单列表;穿戴中的不含 —— 它们不在背包)。 */
export function sellableItems(world: WorldState, items: ItemDataMap): string[] {
  return world.inventory
    .filter((x) => x.count > 0 && items[x.itemId]?.sellable)
    .map((x) => x.itemId)
}
