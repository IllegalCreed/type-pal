/**
 * TEST-GLM-ITEM-LOGIC-1 I2：背包/装备列表与换装残差（item.inventory.background.test.ts）。
 * 去重：item.test.ts 已证 equippableItems 命中/不命中、equipItem 换装+旧件回包 happy path
 * 与未知物/非该角色/不在包原样返回、usableItems 背包侧——本文件只补冻结池内：
 * 旧件回包的合并臂、无关条目保留臂、equipableBy 不含模板的拒绝、非 caster 成员不受影响、
 * 无旧件换装、equippedItemIds 的 falsy-id 臂、usableItems 的装备侧可用品/去重/battleOnly 排除。
 * equipItem 为不可变 API：原 world 引用前后快照比较；非法时结果 toBe 原 world。
 */
import { describe, expect, test } from 'vitest'
import { hero, item as makeItem, world } from './__tests__/glm-item-logic-fixtures.js'
import { expectAcceptsUnchanged } from './__tests__/guard-leaf-fixtures.js'
import type { CharacterInstance, WorldState } from './character.js'
import {
  equipItem,
  equippableItems,
  equippedItemIds,
  type ItemDataMap,
  usableItems,
} from './item.js'

const items: ItemDataMap = {
  bead: makeItem({
    id: 'bead',
    name: '灵珠',
    equip: {
      slot: 'accessory',
      equipableBy: ['hero'],
      effects: [{ kind: 'resistance', element: 'earth', percent: 50 }],
    },
  }),
  potion: makeItem({
    id: 'potion',
    name: '药',
    sellable: true,
    use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 50 }] },
  }),
  talisman: makeItem({
    id: 'talisman',
    name: '护符',
    equip: {
      slot: 'accessory',
      equipableBy: ['hero'],
      effects: [{ kind: 'resistance', element: 'wind', percent: 10 }],
    },
    use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healMp', amount: 20 }] },
  }),
  battleTalisman: makeItem({
    id: 'battleTalisman',
    name: '战斗符',
    equip: {
      slot: 'accessory',
      equipableBy: ['hero'],
      effects: [{ kind: 'resistance', element: 'water', percent: 10 }],
    },
    use: {
      target: 'oneAlly',
      consuming: true,
      battleOnly: true,
      effects: [{ kind: 'healMp', amount: 20 }],
    },
  }),
  mareArmor: makeItem({
    id: 'mareArmor',
    name: '夜行衣',
    equip: { slot: 'body', equipableBy: ['mage'], effects: [] },
  }),
}

describe('I2 equipItem 残差', () => {
  test('旧件回包走合并臂（已有条目 count+1 不新增）；无关条目原样保留', () => {
    const w = world([
      { itemId: 'bead', count: 1 },
      { itemId: 'oldRing', count: 1 },
      { itemId: 'potion', count: 3 },
    ])
    let next: WorldState | undefined
    expectAcceptsUnchanged((value) => {
      next = equipItem(value, 'hero', 'bead', items)
    }, w)
    expect(next).not.toBe(w)
    expect(next?.inventory).toEqual([
      { itemId: 'oldRing', count: 2 },
      { itemId: 'potion', count: 3 },
    ])
    expect(next?.party[0]?.equipment).toEqual({ accessory: 'bead' })
  })

  test('equipableBy 不含成员模板时原引用返回', () => {
    const w = world([{ itemId: 'mareArmor', count: 1 }])
    let next: WorldState | undefined
    expectAcceptsUnchanged((value) => {
      next = equipItem(value, 'hero', 'mareArmor', items)
    }, w)
    expect(next).toBe(w)
  })

  test('非 caster 成员的成员对象引用与内容都不受换装影响', () => {
    const base = world([{ itemId: 'bead', count: 1 }])
    const mage = hero(80, 40, 'mage')
    const withTwo = { ...base, party: [base.party[0]!, mage] } satisfies WorldState
    let next: WorldState | undefined
    expectAcceptsUnchanged((value) => {
      next = equipItem(value, 'hero', 'bead', items)
    }, withTwo)
    expect(next?.party[1]).toBe(mage)
    expect(next?.party[1]?.equipment).toEqual({ accessory: 'oldRing' })
  })

  test('原槽位为空时无旧件回包，包里只少所装件', () => {
    const base = world([{ itemId: 'bead', count: 1 }])
    const bare = {
      ...base,
      party: [{ ...hero(), equipment: {} } as CharacterInstance],
    } satisfies WorldState
    let next: WorldState | undefined
    expectAcceptsUnchanged((value) => {
      next = equipItem(value, 'hero', 'bead', items)
    }, bare)
    expect(next?.inventory).toEqual([])
    expect(next?.party[0]?.equipment).toEqual({ accessory: 'bead' })
  })
})

describe('I2 equippedItemIds / equippableItems / usableItems 残差', () => {
  test('equippedItemIds 多成员多槽聚合去重', () => {
    const w: WorldState = {
      ...world([]),
      party: [
        { ...hero(), equipment: { accessory: 'oldRing', weapon: 'talisman' } },
        { ...hero(90, 40, 'mage'), equipment: { accessory: 'talisman' } },
      ],
    }
    let ids: Set<string> | undefined
    expectAcceptsUnchanged((value) => {
      ids = equippedItemIds(value)
    }, w)
    expect(ids).toEqual(new Set(['oldRing', 'talisman']))
  })

  test('equippableItems 过滤 count>0 与模板（count 0 不列）', () => {
    const w: WorldState = world([
      { itemId: 'bead', count: 2 },
      { itemId: 'mareArmor', count: 1 },
      { itemId: 'bead', count: 0 },
    ])
    let list: string[] = []
    expectAcceptsUnchanged((value) => {
      list = equippableItems(value, 'hero', items).map((it) => it.id)
    }, w)
    expect(list).toEqual(['bead'])
  })

  test('usableItems：装备中且可用的物品入列、与背包去重、battleOnly 装备被排除', () => {
    const w: WorldState = {
      ...world([{ itemId: 'talisman', count: 2 }]),
      party: [{ ...hero(), equipment: { accessory: 'battleTalisman', weapon: 'talisman' } }],
    }
    let list: string[] = []
    expectAcceptsUnchanged((value) => {
      list = usableItems(value, items).map((it) => it.id)
    }, w)
    expect(list).toEqual(['talisman'])
  })
})
