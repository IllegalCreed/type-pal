import { describe, expect, test } from 'vitest'
import type { CharacterInstance, WorldState } from './character.js'
import {
  equipItem,
  equippableItems,
  equippedItemIds,
  type ItemDataMap,
  usableItems,
  useItem,
} from './item.js'

// 内联 fixture(不再依赖已删的 DEMO_ITEMS/initialWorld —— 测逻辑用最小数据)
// weapon 攻+2 / body 防+3 / accessory 土灵珠(可装可用,双重身份)/ potion 回 HP
const items: ItemDataMap = {
  sword: {
    id: 'sword',
    name: '剑',
    desc: [],
    icon: 0,
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
    equip: {
      slot: 'weapon',
      equipableBy: ['hero'],
      effects: [{ kind: 'statBonus', stat: 'attack', delta: 2 }],
    },
  },
  bead: {
    id: 'bead',
    name: '灵珠',
    desc: [],
    icon: 0,
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    equip: {
      slot: 'accessory',
      equipableBy: ['hero'],
      effects: [{ kind: 'resistance', element: 'earth', percent: 50 }],
    },
  },
  potion: {
    id: 'potion',
    name: '药',
    desc: [],
    icon: 0,
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
    use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 50 }] },
  },
  noEquip: {
    id: 'noEquip',
    name: 'x',
    desc: [],
    icon: 0,
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
  },
}
function hero(hp = 100, mp = 50): CharacterInstance {
  return {
    id: 'hero',
    template: 'hero',
    level: 1,
    exp: 0,
    hp,
    maxHP: 150,
    mp,
    maxMP: 100,
    attack: 10,
    defense: 10,
    magicAttack: 10,
    speed: 10,
    luck: 10,
    equipment: { accessory: 'oldRing' },
    tags: [],
  }
}
function world(inv: { itemId: string; count: number }[], partyHp = 100, partyMp = 50): WorldState {
  return { party: [hero(partyHp, partyMp)], money: 0, learnedSkills: {}, inventory: inv }
}

describe('equippableItems', () => {
  test('背包里该角色可装的(equipableBy 命中 + 有 equip 块)', () => {
    const w = world([
      { itemId: 'bead', count: 1 },
      { itemId: 'potion', count: 1 },
      { itemId: 'noEquip', count: 1 },
    ])
    expect(equippableItems(w, 'hero', items).map((i) => i.id)).toEqual(['bead']) // potion 无 equip,noEquip 无 equip
  })
  test('equipableBy 不含该角色 → 不列', () => {
    const w = world([{ itemId: 'bead', count: 1 }])
    expect(equippableItems(w, 'someone-else', items)).toEqual([])
  })
})

describe('equipItem', () => {
  test('装 bead → 入 accessory 槽,旧件回包,原 world 不变(不可变)', () => {
    const w0 = world([{ itemId: 'bead', count: 1 }])
    const w1 = equipItem(w0, 'hero', 'bead', items)
    expect(w1.party[0]?.equipment.accessory).toBe('bead')
    expect(w1.inventory.find((e) => e.itemId === 'oldRing')?.count).toBe(1) // 旧件回包
    expect(w1.inventory.find((e) => e.itemId === 'bead')).toBeUndefined() // 出包
    expect(w0.party[0]?.equipment.accessory).toBe('oldRing') // 原 world 不变
  })
  test('不可装(未知物/非该角色/不在包)→ 原样返回', () => {
    const w = world([{ itemId: 'bead', count: 1 }])
    expect(equipItem(w, 'hero', 'noSuchItem', items)).toBe(w)
    expect(equipItem(w, 'nobody', 'bead', items)).toBe(w)
    expect(equipItem(w, 'hero', 'sword', items)).toBe(w) // sword 不在背包
  })
})

describe('usableItems + useItem', () => {
  test('usableItems:背包里有 use 能力块的', () => {
    const w = world([
      { itemId: 'potion', count: 2 },
      { itemId: 'bead', count: 1 },
      { itemId: 'noEquip', count: 1 },
    ])
    expect(usableItems(w, items).map((i) => i.id)).toEqual(['potion']) // 只有 potion 有 use
  })
  test('useItem:回 HP 夹上限 + 消耗 -1', () => {
    const w0 = world([{ itemId: 'potion', count: 2 }], 120, 50) // hp120,药+50 → 夹 maxHP150
    const w1 = useItem(w0, 'hero', 'potion', items)
    expect(w1.party[0]?.hp).toBe(150) // 120+50 夹满
    expect(w1.inventory.find((e) => e.itemId === 'potion')?.count).toBe(1) // 2→1
    expect(w0.party[0]?.hp).toBe(120) // 原 world 不变
  })
  test('useItem:用光 → 出包', () => {
    const w0 = world([{ itemId: 'potion', count: 1 }])
    expect(
      useItem(w0, 'hero', 'potion', items).inventory.find((e) => e.itemId === 'potion'),
    ).toBeUndefined()
  })
  test('useItem:非法(无 use/不在包/未知角色)→ 原样', () => {
    const w = world([{ itemId: 'potion', count: 1 }])
    expect(useItem(w, 'hero', 'bead', items)).toBe(w) // bead 无 use
    expect(useItem(w, 'hero', 'noSuch', items)).toBe(w)
    expect(useItem(w, 'nobody', 'potion', items)).toBe(w)
  })
  test('穿戴中的可用品仍可用(原版 itemmenu.c:穿着灵珠能用):bead 装上后 useItem 不消耗、不报错', () => {
    // bead 装 accessory(出背包),它无 use → useItem 应原样返回(不报错)
    const w = equipItem(world([{ itemId: 'bead', count: 1 }]), 'hero', 'bead', items)
    expect(equippedItemIds(w).has('bead')).toBe(true)
    expect(useItem(w, 'hero', 'bead', items)).toBe(w) // bead 无 use,原样
  })
})
