import type { ItemDataMap, WorldState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { openShopUi, shopInput } from './shop-box.js'

const items: ItemDataMap = {
  a: { id: 'a', name: '药', desc: [], buyPrice: 50, sellPrice: 7, sellable: true },
  free: { id: 'free', name: '赠品', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
}
const world = (money: number): WorldState => ({
  money,
  party: [],
  inventory: [],
  learnedSkills: {},
})

describe('formal shop input', () => {
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
