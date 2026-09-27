/**
 * TEST-GLM-STATE-COMMANDS-1 A03：equip-menu-state 残差
 * 去重：equip-menu-state.test.ts 8+ 例、navigation-boundaries.test.ts B1–B3 已证
 * 基础导航/确认/换装/回列表——本文件只补冻结池内：非 pick-role 阶段 apply no-op、
 * selectedItemId 无 equip 块、casterId 不在 party、cursor 越界确认 no-op、
 * backToList list 阶段 no-op、count 0 过滤、EQUIP_GRID_COLS/closeEquipMenu 完整对象。
 */

import type { ItemDataMap } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  closeEquipMenu,
  EQUIP_GRID_COLS,
  equipApply,
  equipBackToList,
  equipConfirmItem,
  openEquipMenu,
} from './equip-menu-state.js'
import { makeTestItems, makeTestWorld } from './test-fixtures.js'

const items: ItemDataMap = makeTestItems()
const w = makeTestWorld()

describe('A03 equip-menu-state 残差', () => {
  test('非 pick-role 阶段 apply：world 与 state 均原引用', () => {
    const s = openEquipMenu(w, 'li-xiaoyao', items)
    const result = equipApply(s, w, items)
    expect(result.world).toBe(w)
    expect(result.state).toBe(s)
  })

  test('selectedItemId 指向无 equip 块物品：不换装、回 list', () => {
    const s = openEquipMenu(w, 'li-xiaoyao', items)
    s.phase = 'pick-role'
    s.selectedItemId = '61'
    const result = equipApply(s, w, items)
    expect(result.world).toBe(w)
    expect(result.state.phase).toBe('list')
  })

  test('casterId 不在 party：回 list 且 items 为空', () => {
    const s = openEquipMenu(w, 'li-xiaoyao', items)
    s.phase = 'pick-role'
    s.casterId = 'nobody'
    s.selectedItemId = Object.keys(items)[0]!
    const result = equipApply(s, w, items)
    expect(result.state.phase).toBe('list')
    expect(result.state.items).toEqual([])
  })

  test('equipConfirmItem cursor 越界：同引用不变', () => {
    const s = openEquipMenu(w, 'li-xiaoyao', items)
    s.cursor = 99
    const result = equipConfirmItem(s)
    expect(result).toBe(s)
  })

  test('equipBackToList list 阶段 no-op：同引用不变', () => {
    const s = openEquipMenu(w, 'li-xiaoyao', items)
    const result = equipBackToList(s, w, items)
    expect(result).toBe(s)
  })

  test('inventory count=0 不可装', () => {
    const zeroW = makeTestWorld()
    zeroW.inventory = [{ itemId: '267', count: 0 }]
    const s = openEquipMenu(zeroW, 'li-xiaoyao', items)
    expect(s.items).toEqual([])
  })

  test('EQUIP_GRID_COLS === 3；closeEquipMenu 完整对象', () => {
    expect(EQUIP_GRID_COLS).toBe(3)
    const closed = closeEquipMenu()
    expect(closed).toEqual({
      active: false,
      phase: 'list',
      items: [],
      cursor: 0,
      casterId: '',
    })
  })
})
