/**
 * InventoryActionMenu 1 级子菜单(装备/使用) — sdlpal uigame.c:878-919 真值。
 */

import { describe, expect, it } from 'vitest'
import {
  createInventoryActionMenu,
  inventoryActionChoice,
  inventoryActionMenuDown,
  inventoryActionMenuUp,
} from './inventory-action-menu.js'

describe('InventoryActionMenu(物品 / 装备 / 使用)', () => {
  it('2 项真值顺序:装备 / 使用(sdlpal uigame.c:898-902)', () => {
    const s = createInventoryActionMenu()
    expect(s.selection.items.map((it) => it.label)).toEqual(['装备', '使用'])
    expect(inventoryActionChoice(s)).toBe('equip')
  })

  it('defaultCursor=1 → 起手 use(sdlpal `static WORD w = 0` 跨调用记忆)', () => {
    const s = createInventoryActionMenu(1)
    expect(inventoryActionChoice(s)).toBe('use')
  })

  it('Down → use,Up → equip', () => {
    const s = createInventoryActionMenu()
    inventoryActionMenuDown(s)
    expect(inventoryActionChoice(s)).toBe('use')
    inventoryActionMenuUp(s)
    expect(inventoryActionChoice(s)).toBe('equip')
  })
})
