import { describe, expect, test } from 'vitest'
import { WAVE2_SHOP_ITEMS as remainderItems } from './__tests__/cursor-pure-wave2-fixtures.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { WorldState } from './character.js'
import type { ItemDataMap } from './item.js'
import { sellableItems, shopBuy, shopSell, validateShops } from './shop.js'

describe('validateShops current table', () => {
  test('empty tables, id0 and repeated stock occurrences remain intact', () => {
    expect(validateShops([])).toEqual([])
    const table = [
      { id: 0, items: ['a', 'b', 'a'] },
      { id: 2, items: [] },
    ]
    expect(validateShops(table)).toEqual(table)
  })
  test.each<[unknown, string]>([
    [null, 'shops 期望数组'],
    [{}, 'shops 期望数组'],
    [[null], 'shops[0] 期望商店对象'],
    [[{ id: -1, items: [] }], 'shops[0].id 必须为非负安全整数'],
    [[{ id: 0.5, items: [] }], 'shops[0].id 必须为非负安全整数'],
    [[{ id: Number.MAX_SAFE_INTEGER + 1, items: [] }], 'shops[0].id 必须为非负安全整数'],
    [[{ id: '0', items: [] }], 'shops[0].id 必须为非负安全整数'],
    [
      [
        { id: 0, items: [] },
        { id: 0, items: [] },
      ],
      'shops 重复 id 0',
    ],
    [[{ id: 0, items: [''] }], 'shops[0].items 必须为物品 id 数组（非空字符串）'],
    [[{ id: 0, items: [1] }], 'shops[0].items 必须为物品 id 数组（非空字符串）'],
    [[{ id: 0, items: null }], 'shops[0].items 必须为物品 id 数组（非空字符串）'],
  ])('rejects malformed current tables %j', (value, message) => {
    expect(() => validateShops(value)).toThrow(message)
  })
})

const ITEMS: ItemDataMap = {
  '166': {
    id: '166',
    name: '木剑',
    desc: [],
    buyPrice: 50,
    sellPrice: 25,
    sellable: true,
  },
  '61': {
    id: '61',
    name: '观音符',
    desc: [],
    buyPrice: 150,
    sellPrice: 75,
    sellable: true,
  },
  '267': {
    id: '267',
    name: '土灵珠',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  }, // 剧情品不可卖
}

function world(money: number, inv: { itemId: string; count: number }[]): WorldState {
  return { party: [], money, learnedSkills: {}, inventory: inv }
}

describe('shopBuy(每次 1 个;钱不够 null)', () => {
  test('继承属性不算物品定义，购买未知 constructor 不改变世界', () => {
    const before = world(100, [])
    expect(shopBuy(before, 'constructor', {})).toBeNull()
    expect(before).toEqual({ party: [], money: 100, learnedSkills: {}, inventory: [] })
  })

  test('工程真正定义的 constructor 物品正常扣钱入包', () => {
    const items: ItemDataMap = {
      constructor: {
        id: 'constructor',
        name: '同名物品',
        desc: [],
        buyPrice: 50,
        sellPrice: 25,
        sellable: true,
      },
    }
    expect(shopBuy(world(100, []), 'constructor', items)).toEqual({
      party: [],
      money: 50,
      learnedSkills: {},
      inventory: [{ itemId: 'constructor', count: 1 }],
    })
  })

  test('钱够:扣 buyPrice + 入包(已有叠加/新条目);源不变', () => {
    const w0 = world(100, [{ itemId: '166', count: 1 }])
    const w1 = shopBuy(w0, '166', ITEMS)!
    expect(w1.money).toBe(50)
    expect(w1.inventory).toEqual([{ itemId: '166', count: 2 }])
    expect(w0).toEqual({
      party: [],
      money: 100,
      learnedSkills: {},
      inventory: [{ itemId: '166', count: 1 }],
    }) // Source world and inventory remain unchanged
    const w2 = shopBuy(w1, '61', ITEMS)
    expect(w2).toBeNull() // 50 < 150 钱不够
  })
  test('新物品入包为新条目', () => {
    const w1 = shopBuy(world(200, []), '61', ITEMS)!
    expect(w1.inventory).toEqual([{ itemId: '61', count: 1 }])
    expect(w1.money).toBe(50)
  })

  test('钱够但未知物买为 null，源世界不动', () => {
    const rich = world(999, [])
    const richSnap = deepSnapshot(rich)
    expect(shopBuy(rich, 'item.ghost', remainderItems)).toBeNull()
    expect(rich).toEqual(richSnap)
  })
})

describe('shopSell(按 sellPrice;不可卖/没货 null)', () => {
  test('卖 1 个得 sellPrice;数量归零移除条目', () => {
    const w0 = world(0, [{ itemId: '166', count: 1 }])
    const w1 = shopSell(w0, '166', ITEMS)!
    expect(w1.money).toBe(25)
    expect(w1.inventory).toEqual([])
    expect(w0).toEqual({
      party: [],
      money: 0,
      learnedSkills: {},
      inventory: [{ itemId: '166', count: 1 }],
    })
  })
  test('不可卖(sellable=false)/背包没有 → null', () => {
    expect(shopSell(world(0, [{ itemId: '267', count: 1 }]), '267', ITEMS)).toBeNull()
    expect(shopSell(world(0, []), '166', ITEMS)).toBeNull()
  })

  test('卖 2 件剩 1，保留其它物品且源世界不动', () => {
    const packed = world(0, [
      { itemId: 'item.sword', count: 2 },
      { itemId: 'item.charm', count: 1 },
    ])
    const packedSnap = deepSnapshot(packed)
    expect(shopSell(packed, 'item.sword', remainderItems)).toEqual({
      party: [],
      money: 25,
      learnedSkills: {},
      inventory: [
        { itemId: 'item.sword', count: 1 },
        { itemId: 'item.charm', count: 1 },
      ],
    })
    expect(packed).toEqual(packedSnap)
    expect(packed.inventory[0]?.count).toBe(2)
  })
})

test('sellableItems:背包中可卖过滤(剧情品/零数排除)', () => {
  const w = world(0, [
    { itemId: '166', count: 1 },
    { itemId: '267', count: 1 },
    { itemId: '61', count: 0 },
  ])
  expect(sellableItems(w, ITEMS)).toEqual(['166'])
})
