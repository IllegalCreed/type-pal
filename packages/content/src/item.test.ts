import { describe, expect, test } from 'vitest'
import { initialWorld } from './character.js'
import {
  DEMO_ITEMS,
  EQUIP_SLOT_IDS,
  equipItem,
  equippableItems,
  equippedItemIds,
  usableItems,
  useItem,
} from './item.js'

describe('ItemData / 装备数据', () => {
  test('6 槽对齐原版 body part', () => {
    expect(EQUIP_SLOT_IDS).toEqual(['weapon', 'head', 'body', 'cloak', 'feet', 'accessory'])
  })
  test('木剑(166):武器槽,攻击+2 身法+3', () => {
    const it = DEMO_ITEMS['166']
    expect(it?.name).toBe('木剑')
    expect(it?.equip?.slot).toBe('weapon')
    expect(it?.equip?.effects).toEqual([
      { kind: 'statBonus', stat: 'attack', delta: 2 },
      { kind: 'statBonus', stat: 'speed', delta: 3 },
    ])
    expect(it?.buyPrice).toBe(50)
    expect(it?.sellPrice).toBe(25)
  })
  test('布袍(208):身体槽 defense+3(非"运气")', () => {
    expect(DEMO_ITEMS['208']?.equip?.slot).toBe('body')
    expect(DEMO_ITEMS['208']?.equip?.effects).toEqual([
      { kind: 'statBonus', stat: 'defense', delta: 3 },
    ])
  })
  test('土灵珠(267):双重身份 —— 既可装(土抗+授山神)又可用', () => {
    const it = DEMO_ITEMS['267']
    expect(it?.equip?.slot).toBe('accessory')
    expect(it?.equip?.effects).toContainEqual({ kind: 'resistance', element: 'earth', percent: 50 })
    expect(it?.equip?.effects).toContainEqual({ kind: 'grantSkill', skillId: '336' }) // 山神
    expect(it?.use).toBeDefined() // 可用 → 也进使用菜单
  })
})

describe('装备世界操作', () => {
  test('equippableItems:背包里该角色可装的(土灵珠)', () => {
    const w = initialWorld() // 背包 = [土灵珠 267]
    const list = equippableItems(w, 'li-xiaoyao', DEMO_ITEMS)
    expect(list.map((i) => i.id)).toEqual(['267'])
  })
  test('equipItem:装土灵珠 → 入 accessory 槽,旧件 护腕 回包', () => {
    const w0 = initialWorld()
    const w1 = equipItem(w0, 'li-xiaoyao', '267', DEMO_ITEMS)
    expect(w1.party[0]?.equipment.accessory).toBe('267') // 土灵珠 入槽
    expect(w1.inventory.find((e) => e.itemId === '249')?.count).toBe(1) // 护腕 回包
    expect(w1.inventory.find((e) => e.itemId === '267')).toBeUndefined() // 土灵珠 出包
    expect(w0.party[0]?.equipment.accessory).toBe('249') // 原 world 不变(不可变)
  })
  test('equipItem:不可装(非该角色/不在包)→ 原样返回', () => {
    const w = initialWorld()
    expect(equipItem(w, 'li-xiaoyao', '999', DEMO_ITEMS)).toBe(w) // 未知物
    expect(equipItem(w, 'nobody', '267', DEMO_ITEMS)).toBe(w) // 未知角色
  })
})

describe('使用世界操作', () => {
  test('usableItems:背包里有 use 能力块的(土灵珠/观音符/茶叶蛋)', () => {
    const ids = usableItems(initialWorld(), DEMO_ITEMS).map((i) => i.id)
    expect(ids.sort()).toEqual(['267', '61', '78'].sort())
  })
  test('useItem:观音符回 HP 夹上限 + 消耗 -1', () => {
    const w0 = initialWorld() // 李逍遥 hp 100/150
    const w1 = useItem(w0, 'li-xiaoyao', '61', DEMO_ITEMS)
    expect(w1.party[0]?.hp).toBe(150) // 100+150 夹 maxHP 150
    expect(w1.inventory.find((e) => e.itemId === '61')?.count).toBe(1) // 2→1
    expect(w0.party[0]?.hp).toBe(100) // 原 world 不变(不可变)
  })
  test('useItem:茶叶蛋同时回 HP+MP', () => {
    const w0 = initialWorld() // hp100 mp30
    const w1 = useItem(w0, 'li-xiaoyao', '78', DEMO_ITEMS)
    expect(w1.party[0]?.hp).toBe(115)
    expect(w1.party[0]?.mp).toBe(45) // 30+15
    expect(w1.inventory.find((e) => e.itemId === '78')).toBeUndefined() // 1→0 出包
  })
  test('useItem:非法(无 use / 不在包 / 未知角色)→ 原样返回', () => {
    const w = initialWorld()
    expect(useItem(w, 'li-xiaoyao', '166', DEMO_ITEMS)).toBe(w) // 木剑无 use
    expect(useItem(w, 'nobody', '61', DEMO_ITEMS)).toBe(w)
  })
  test('穿戴中的灵珠仍可用(原版 itemmenu.c:136-145):土灵珠装上后仍在 usableItems + 可 useItem', () => {
    const w = equipItem(initialWorld(), 'li-xiaoyao', '267', DEMO_ITEMS) // 土灵珠 入手饰槽(出背包)
    expect(equippedItemIds(w).has('267')).toBe(true)
    expect(w.inventory.some((e) => e.itemId === '267')).toBe(false) // 已不在背包
    expect(usableItems(w, DEMO_ITEMS).map((i) => i.id)).toContain('267') // 但使用菜单仍列出(穿着可用)
    const after = useItem(w, 'li-xiaoyao', '267', DEMO_ITEMS) // 对穿戴件施用(triggerScript 桩,不消耗)
    expect(after.party[0]?.equipment.accessory).toBe('267') // 仍穿着,不报错
  })
})
