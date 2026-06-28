import { describe, expect, test } from 'vitest'
import { DEMO_ITEMS, EQUIP_SLOT_IDS } from './item.js'

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
