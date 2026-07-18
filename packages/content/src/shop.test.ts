import { describe, expect, test } from 'vitest'
import type { WorldState } from './character.js'
import type { ItemDataMap } from './item.js'
import { sellableItems, shopBuy, shopSell } from './shop.js'

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
  test('钱够:扣 buyPrice + 入包(已有叠加/新条目);源不变', () => {
    const w0 = world(100, [{ itemId: '166', count: 1 }])
    const w1 = shopBuy(w0, '166', ITEMS)!
    expect(w1.money).toBe(50)
    expect(w1.inventory).toEqual([{ itemId: '166', count: 2 }])
    expect(w0.money).toBe(100) // 源不变
    const w2 = shopBuy(w1, '61', ITEMS)
    expect(w2).toBeNull() // 50 < 150 钱不够
  })
  test('新物品入包为新条目', () => {
    const w1 = shopBuy(world(200, []), '61', ITEMS)!
    expect(w1.inventory).toEqual([{ itemId: '61', count: 1 }])
    expect(w1.money).toBe(50)
  })
})

describe('shopSell(按 sellPrice;不可卖/没货 null)', () => {
  test('卖 1 个得 sellPrice;数量归零移除条目', () => {
    const w0 = world(0, [{ itemId: '166', count: 1 }])
    const w1 = shopSell(w0, '166', ITEMS)!
    expect(w1.money).toBe(25)
    expect(w1.inventory).toEqual([])
  })
  test('不可卖(sellable=false)/背包没有 → null', () => {
    expect(shopSell(world(0, [{ itemId: '267', count: 1 }]), '267', ITEMS)).toBeNull()
    expect(shopSell(world(0, []), '166', ITEMS)).toBeNull()
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
