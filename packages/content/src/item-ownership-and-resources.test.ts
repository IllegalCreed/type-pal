/** Inventory and resource queries, including the in-place removal API. */
import { describe, expect, test } from 'vitest'
import { expectInputsUnchanged, hero, world } from './__tests__/glm-item-logic-fixtures.js'
import { expectExactError } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { WorldState } from './character.js'
import { ownedItemCount, removeOwnedItems, worldResourceValue } from './item.js'

const beadRing = (): WorldState => {
  const w = world([
    { itemId: 'bead', count: 1 },
    { itemId: 'potion', count: 3 },
  ])
  const leader = w.party[0]!
  leader.equipment = {
    head: 'bead',
    body: 'bead',
    cloak: 'other',
    weapon: 'swordX',
    accessory: 'bead',
  }
  return w
}

describe('removeOwnedItems 原地合同', () => {
  test('不在包也不在装备：返回 0，world 无任何变化', () => {
    const w = world([{ itemId: 'potion', count: 2 }])
    const before = deepSnapshot(w)
    expect(removeOwnedItems(w, 'bead', 3)).toBe(0)
    expect(w).toEqual(before)
  })

  test('需求 0/负数/非整数：floor+max 语义', () => {
    const w = world([{ itemId: 'bead', count: 5 }])
    expect(removeOwnedItems(w, 'bead', 0)).toBe(0)
    expect(removeOwnedItems(w, 'bead', -3)).toBe(0)
    expect(w.inventory[0]?.count).toBe(5)
    expect(removeOwnedItems(w, 'bead', 1.9)).toBe(1)
    expect(w.inventory[0]?.count).toBe(4)
  })

  test('供给不足自然走完：背包 1 + 装备 3 件扣 5，返回 4', () => {
    const w = beadRing()
    const removed = removeOwnedItems(w, 'bead', 5)
    expect(removed).toBe(4)
    expect(w.inventory.some((e) => e.itemId === 'bead')).toBe(false)
    expect(w.inventory).toEqual([{ itemId: 'potion', count: 3 }])
    const leader = w.party[0]!
    expect(Object.keys(leader.equipment)).toEqual(['cloak', 'weapon'])
    expect(leader.equipment.accessory).toBeUndefined()
    expect(leader.equipment.cloak).toBe('other')
  })

  test('跨队员 continue：第一名无该件时进入第二名按槽序卸', () => {
    const w = world([{ itemId: 'potion', count: 1 }])
    const second = hero(90, 40, 'mage')
    second.equipment = { accessory: 'bead', body: 'bead' }
    w.party = [w.party[0]!, second]
    const removed = removeOwnedItems(w, 'bead', 2)
    expect(removed).toBe(2)
    expect(second.equipment).toEqual({})
    expect(w.party[0]?.equipment).toEqual({ accessory: 'oldRing' })
  })

  test('旁对象保真：非空 potion 哨兵与其它装备槽不被触碰', () => {
    const w = beadRing()
    const potionSnapshot = deepSnapshot(w.inventory.find((e) => e.itemId === 'potion'))
    const beforeCloak = w.party[0]!.equipment.cloak
    removeOwnedItems(w, 'bead', 3)
    expect(w.party[0]!.equipment.cloak).toBe(beforeCloak)
    const potionAfter = w.inventory.find((e) => e.itemId === 'potion')
    expect(potionAfter).toEqual(potionSnapshot)
    expect(potionAfter?.count).toBe(3)
  })
})

describe('ownedItemCount / worldResourceValue', () => {
  test('count:0 条目不计入；装备槽计数照常', () => {
    const w = world([
      { itemId: 'bead', count: 0 },
      { itemId: 'potion', count: 3 },
    ])
    w.party[0]!.equipment = { accessory: 'bead', weapon: 'bead' }
    let beadCount = 0
    let potionCount = 0
    expectInputsUnchanged(() => {
      beadCount = ownedItemCount(w, 'bead')
      potionCount = ownedItemCount(w, 'potion')
    }, [w])
    expect(beadCount).toBe(2)
    expect(potionCount).toBe(3)
  })

  test('reads named resources independently of collectValue without writing missing keys', () => {
    const input: WorldState = { ...world([]), resources: { herb: 7, empty: 0 }, collectValue: 9 }
    const before = deepSnapshot(input)
    expect(worldResourceValue(input, 'herb')).toBe(7)
    expect(worldResourceValue(input, 'empty')).toBe(0)
    expect(worldResourceValue(input, 'missing')).toBe(0)
    expect(worldResourceValue(input, 'collectValue')).toBe(9)
    expect(input).toEqual(before)
    expect(worldResourceValue(world([]), 'collectValue')).toBe(0)
  })

  test('rejects a blank resource key', () => {
    const input = world([])
    const before = deepSnapshot(input)
    expectExactError(() => worldResourceValue(input, '  '), 'worldResourceValue: 资源键不能为空')
    expect(input).toEqual(before)
  })

  test.each([-1, 1.5])('rejects the invalid resource amount %s and retains the input', (amount) => {
    const input: WorldState = { ...world([]), resources: { herb: amount } }
    const before = deepSnapshot(input)
    expectExactError(
      () => worldResourceValue(input, 'herb'),
      'worldResourceValue: 资源 "herb" 必须是非负安全整数',
    )
    expect(input).toEqual(before)
  })
})
