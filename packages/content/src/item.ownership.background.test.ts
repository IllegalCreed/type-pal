/**
 * TEST-GLM-ITEM-LOGIC-1 I4：所有权计数/原地扣除/世界资源读取残差
 * （item.ownership.background.test.ts）。
 * 去重：item.test.ts '材料计数覆盖背包与装备，扣除顺序固定…' 已证 ownedItemCount=5 与
 * 背包→head/body→accessory 顺序——本文件只补冻结池内：扣除需求为 0/负/非整数的 floor 语义、
 * 供给不足的自然走完、跨队员 continue、不在包不在装备时零变化、worldResourceValue 的
 * 空键/collectValue 回退/非法值三条合同。
 * ⚠ removeOwnedItems 是**原地修改 API**（合同如此）：entry.count 就地扣减、不足时按固定槽序
 * 换新 equipment 对象并 splice inventory 数组——断言写**精确差值**（计数/键集/数组长度/返回值）
 * 与旁对象保真，不施加不可变合同。
 */
import { describe, expect, test } from 'vitest'
import { hero, world } from './__tests__/glm-item-logic-fixtures.js'
import { expectAcceptsUnchanged } from './__tests__/guard-leaf-fixtures.js'
import type { WorldState } from './character.js'
import { ownedItemCount, removeOwnedItems, worldResourceValue } from './item.js'

const beadRing = (): WorldState => {
  const w = world([{ itemId: 'bead', count: 1 }])
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

describe('I4 removeOwnedItems 原地合同', () => {
  test('不在包也不在装备：返回 0，world 无任何变化', () => {
    const w = world([{ itemId: 'potion', count: 2 }])
    const before = JSON.parse(JSON.stringify(w))
    let removed = -1
    expectAcceptsUnchanged((value) => {
      removed = removeOwnedItems(value, 'bead', 3)
    }, w)
    expect(removed).toBe(0)
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
    expect(w.inventory).toEqual([])
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

  test('旁对象保真：无关条目与其它装备槽不被触碰', () => {
    const w = beadRing()
    const beforeCloak = w.party[0]!.equipment.cloak
    const beforeOther = w.inventory.find((e) => e.itemId === 'other')
    removeOwnedItems(w, 'bead', 3)
    expect(w.party[0]!.equipment.cloak).toBe(beforeCloak)
    expect(w.inventory.find((e) => e.itemId === 'other')).toEqual(beforeOther)
  })
})

describe('I4 ownedItemCount / worldResourceValue 残差', () => {
  test('count:0 条目不计入；装备槽计数照常', () => {
    const w = world([
      { itemId: 'bead', count: 0 },
      { itemId: 'potion', count: 3 },
    ])
    w.party[0]!.equipment = { accessory: 'bead', weapon: 'bead' }
    let beadCount = 0
    let potionCount = 0
    expectAcceptsUnchanged((value) => {
      beadCount = ownedItemCount(value, 'bead')
      potionCount = ownedItemCount(value, 'potion')
    }, w)
    expect(beadCount).toBe(2)
    expect(potionCount).toBe(3)
  })

  test('空键恰抛；collectValue 缺省回退 0；resources 命中返回', () => {
    const w = world([])
    expect(() => worldResourceValue(w, '  ')).toThrow('worldResourceValue: 资源键不能为空')
    let collect = 0
    expectAcceptsUnchanged((value) => {
      collect = worldResourceValue(value, 'collectValue')
    }, w)
    expect(collect).toBe(0)
    const withResources = { ...world([]), resources: { herb: 7 } } as WorldState
    let herb = 0
    expectAcceptsUnchanged((value) => {
      herb = worldResourceValue(value, 'herb')
    }, withResources)
    expect(herb).toBe(7)
  })

  test('负数/非整数资源值恰抛且信息含键名', () => {
    const negative = { ...world([]), resources: { herb: -1 } } as WorldState
    expect(() => worldResourceValue(negative, 'herb')).toThrow(
      'worldResourceValue: 资源 "herb" 必须是非负安全整数',
    )
    const fractional = { ...world([]), resources: { herb: 1.5 } } as WorldState
    expect(() => worldResourceValue(fractional, 'herb')).toThrow(
      'worldResourceValue: 资源 "herb" 必须是非负安全整数',
    )
  })
})
