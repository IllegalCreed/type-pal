import type { ItemData, ItemDataMap, WorldState } from '@type-pal/content'
import { sellableItems } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { openShopUi, shopInput } from './shop-box.js'

const pricedItem = (id: string, sellPrice = 7): ItemData => ({
  id,
  name: '药',
  desc: [],
  buyPrice: 50,
  sellPrice,
  sellable: true,
})
const items: ItemDataMap = {
  a: pricedItem('a'),
  free: { id: 'free', name: '赠品', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
}
const world = (money: number, inventory: WorldState['inventory'] = []): WorldState => ({
  money,
  party: [],
  inventory,
  learnedSkills: {},
})

describe('商店买入输入与结算', () => {
  test('confirming an undefined constructor item preserves the current world', () => {
    const ui = openShopUi('buy', ['constructor'])
    let current = world(100)
    const input = (key: string) =>
      shopInput(ui, new Set([key]), current, {}, (next) => {
        current = next
      })
    input('Enter')
    expect(ui.phase).toBe('list')
    input('ArrowRight')
    expect(input('Enter')).toBeUndefined()
    expect(current).toEqual(world(100))
    expect(ui.phase).toBe('list')
    expect(ui.confirmYes).toBe(false)
  })

  test('an explicitly defined constructor item remains purchasable', () => {
    const namedItem = pricedItem('constructor')
    const catalog: ItemDataMap = { constructor: namedItem }
    const ui = openShopUi('buy', [namedItem.id])
    let current = world(50)
    const input = (key: string) =>
      shopInput(ui, new Set([key]), current, catalog, (next) => {
        current = next
      })

    input('Enter')
    expect(ui.phase).toBe('confirm')
    input('ArrowRight')
    expect(input('Enter')).toBe('changed')
    expect(current).toEqual({ ...world(0), inventory: [{ itemId: namedItem.id, count: 1 }] })
  })

  test.each(['ArrowUp', 'ArrowDown', 'Enter', 'Escape'])('empty stock %s is safe', (key) => {
    const ui = openShopUi('buy', [])
    const before = world(100)
    const result = shopInput(ui, new Set([key]), before, items, () => {
      throw new Error('empty purchase')
    })
    expect(ui.cursor).toBe(0)
    expect(ui.scrollTop).toBe(0)
    expect(result).toBe(key === 'Escape' ? 'close' : undefined)
  })
  test('default no, confirm Escape, repeated rows, exact funds and insufficient funds use real settlement', () => {
    const ui = openShopUi('buy', ['a', 'a'])
    let current = world(100)
    const input = (key: string) =>
      shopInput(ui, new Set([key]), current, items, (next) => {
        current = next
      })
    input('Enter')
    expect(ui.confirmYes).toBe(false)
    input('Enter')
    expect(current).toEqual(world(100))
    input('Enter')
    input('ArrowRight')
    input('Escape')
    expect(ui.phase).toBe('list')
    expect(current.money).toBe(100)
    input('Enter')
    input('ArrowRight')
    expect(input('Enter')).toBe('changed')
    expect(current.money).toBe(50)
    expect(current.inventory).toEqual([{ itemId: 'a', count: 1 }])
    input('ArrowDown')
    expect(ui.cursor).toBe(1)
    input('Enter')
    input('ArrowRight')
    input('Enter')
    expect(current.money).toBe(0)
    expect(current.inventory).toEqual([{ itemId: 'a', count: 2 }])
    const before = structuredClone(current)
    input('Enter')
    expect(ui.phase).toBe('list')
    expect(current).toEqual(before)
    expect(input('Escape')).toBe('close')
  })
  test('zero-price stock is purchasable, while funded navigation keeps the existing 8-row window', () => {
    const ui = openShopUi(
      'buy',
      Array.from({ length: 12 }, () => 'free'),
    )
    let current = world(0)
    const input = (key: string) =>
      shopInput(ui, new Set([key]), current, items, (next) => {
        current = next
      })
    for (let i = 0; i < 30; i++) input('ArrowDown')
    expect(ui.cursor).toBe(11)
    expect(ui.scrollTop).toBe(4)
    input('Enter')
    input('ArrowRight')
    input('Enter')
    expect(current.money).toBe(0)
    expect(current.inventory).toEqual([{ itemId: 'free', count: 1 }])
    for (let i = 0; i < 30; i++) input('ArrowUp')
    expect(ui.cursor).toBe(0)
    expect(ui.scrollTop).toBe(0)
  })
})

describe('商店卖出输入与结算', () => {
  test('卖出按三列导航、确认后走真实结算，卖光后重算列表并收敛游标', () => {
    const items: ItemDataMap = { ring: pricedItem('ring', 11), potion: pricedItem('potion') }
    const original = world(100, [
      { itemId: 'ring', count: 1 },
      { itemId: 'potion', count: 2 },
    ])
    const ui = openShopUi('sell', sellableItems(original, items))
    let current = original
    const apply = vi.fn((next: WorldState) => {
      current = next
    })
    const input = (key: string) => shopInput(ui, new Set([key]), current, items, apply)
    input('ArrowRight')
    expect(ui.cursor).toBe(1)
    input('ArrowDown')
    expect(ui.cursor).toBe(1)
    const before = structuredClone(current)
    input('Enter')
    expect(ui.phase).toBe('confirm')
    expect(ui.confirmYes).toBe(false)
    input('ArrowLeft')
    expect(input('Enter')).toBe('changed')
    expect(current.money).toBe(107)
    expect(current.inventory).toEqual([
      { itemId: 'ring', count: 1 },
      { itemId: 'potion', count: 1 },
    ])
    expect(original).toEqual(before)
    expect(ui.list).toEqual(['ring', 'potion'])
    expect(ui.cursor).toBe(1)

    input('Enter')
    input('ArrowRight')
    expect(input('Enter')).toBe('changed')
    expect(current.money).toBe(114)
    expect(current.inventory).toEqual([{ itemId: 'ring', count: 1 }])
    expect(ui.list).toEqual(['ring'])
    expect(ui.cursor).toBe(0)
    expect(ui.phase).toBe('list')
    expect(apply).toHaveBeenCalledTimes(2)
  })

  test('卖出网格三列步进钳边界，方向键不结算也不改世界', () => {
    const stock = Array.from({ length: 8 }, (_, index) => `stock${index}`)
    const current = world(
      90,
      stock.map((itemId) => ({ itemId, count: 1 })),
    )
    const before = structuredClone(current)
    const apply = vi.fn()
    const items = Object.fromEntries(stock.map((id) => [id, pricedItem(id)])) satisfies ItemDataMap
    const ui = openShopUi('sell', sellableItems(current, items))
    const input = (key: string) => shopInput(ui, new Set([key]), current, items, apply)
    for (const [key, expected] of [
      ['ArrowDown', 3],
      ['ArrowDown', 6],
      ['ArrowRight', 7],
      ['ArrowDown', 7],
      ['ArrowLeft', 6],
      ['ArrowUp', 3],
      ['ArrowUp', 0],
      ['ArrowLeft', 0],
    ] as const) {
      expect(input(key)).toBeUndefined()
      expect(ui.cursor).toBe(expected)
    }
    expect(current).toEqual(before)
    expect(apply).not.toHaveBeenCalled()
  })
})
