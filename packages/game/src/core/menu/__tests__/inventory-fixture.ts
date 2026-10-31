import type { Item } from '@type-pal/shared'
/** Shared item records only; callers own game state and menu lifecycle. */
export function inventoryItem(
  id: number,
  options: { name?: string; bitmap?: number; price?: number; flags?: Partial<Item['flags']> } = {},
): Item {
  return {
    id,
    _name: options.name ?? `item-${id}`,
    bitmap: options.bitmap ?? id,
    price: options.price ?? 0,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
      ...options.flags,
    },
  }
}

export const mixedInventoryItems: Item[] = [
  inventoryItem(105, {
    name: '木剑',
    flags: { equipable: true, equipableBy: [true, false, true, false, false, false] },
  }),
  inventoryItem(106, {
    name: '短刀',
    flags: { equipable: true, equipableBy: [true, false, true, false, false, false] },
  }),
  // R4(2026-10-15):单体检伤类合成 fixture —— 真实 caller(menu-driver dispatchInventoryMenu)
  // 只对非 applyToAll 物品进 use-target 选人(applyToAll 直接跑脚本,play.c:268-323 同);
  // 名字/flags 为合成示意,不声明是 items.json 原始物品属性。
  inventoryItem(200, { name: '观音符', flags: { usable: true, consuming: true } }),
  inventoryItem(201, {
    name: '玉佛珠',
    flags: {
      equipable: true,
      equipableBy: [false, true, false, false, false, false],
    },
  }),
  inventoryItem(202, {
    name: '风灵珠',
    flags: {
      usable: true,
      equipable: true,
      applyToAll: true,
      equipableBy: [true, false, false, false, false, false],
    },
  }),
]
export const usableRequestItems = [
  inventoryItem(200, { flags: { usable: true } }), // 观音符式可用物
  inventoryItem(202, {
    flags: {
      usable: true,
      equipable: true,
      equipableBy: [true, false, false, false, false, false],
    },
  }), // 合成可用装备
  inventoryItem(105, { flags: { equipable: true } }), // 不可用
]
export const targetMemoryItems: Item[] = [
  inventoryItem(200, { bitmap: 0, price: 10, flags: { usable: true, consuming: true } }),
  inventoryItem(201, { bitmap: 0, price: 10, flags: { usable: true, consuming: true } }),
]
export const selectionItems: Item[] = [
  inventoryItem(105, {
    name: 'item105',
    bitmap: 0,
    flags: { sellable: true, usable: true, consuming: true },
  }), // 药品
  inventoryItem(106, {
    name: 'item106',
    bitmap: 0,
    flags: { sellable: true, equipable: true },
  }), // 装备(不可用)
]
