import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import { inventoryItem, selectionItems } from './__tests__/inventory-fixture.js'
import {
  createInventoryMenu,
  inventoryEnd,
  inventoryHome,
  inventoryMoveDown,
  inventoryMoveLeft,
  inventoryMoveRight,
  inventoryMoveUp,
  inventoryPageDown,
  inventoryPageUp,
} from './inventory-menu.js'

describe('Inventory grid navigation', () => {
  describe('inventoryMove* navigation', () => {
    function gridMenuState(n: number) {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.inventory = Array.from({ length: n }, (_, i) => ({ itemId: 105 + i, count: 1 }))
      // 加足够 items 让 createInventoryMenu visible n 个
      const items: Item[] = Array.from({ length: n }, (_, i) =>
        inventoryItem(105 + i, { name: `item${i}`, flags: { equipable: true } }),
      )
      return createInventoryMenu(gs, items, 'equip')
    }

    it('Up = -3(iItemsPerLine);clamp 0', () => {
      const menu = gridMenuState(10)
      menu.cursor = 5
      inventoryMoveUp(menu)
      expect(menu.cursor).toBe(2)
      inventoryMoveUp(menu)
      expect(menu.cursor).toBe(0)
      inventoryMoveUp(menu) // 再 up 不 wrap
      expect(menu.cursor).toBe(0)
    })

    it('Down = +3(iItemsPerLine);clamp inventory.length - 1', () => {
      const menu = gridMenuState(10)
      menu.cursor = 0
      inventoryMoveDown(menu)
      expect(menu.cursor).toBe(3)
      inventoryMoveDown(menu)
      expect(menu.cursor).toBe(6)
      inventoryMoveDown(menu)
      expect(menu.cursor).toBe(9)
      inventoryMoveDown(menu) // 不 wrap
      expect(menu.cursor).toBe(9)
    })

    it('Left/Right = ±1', () => {
      const menu = gridMenuState(10)
      menu.cursor = 5
      inventoryMoveLeft(menu)
      expect(menu.cursor).toBe(4)
      inventoryMoveRight(menu)
      expect(menu.cursor).toBe(5)
      menu.cursor = 0
      inventoryMoveLeft(menu) // 不 wrap
      expect(menu.cursor).toBe(0)
    })

    it('PgUp/PgDn = ±(3 * 7);clamp [0, length-1]', () => {
      const menu = gridMenuState(50) // 足够多让 +21 不被 clamp
      menu.cursor = 15
      inventoryPageDown(menu)
      expect(menu.cursor).toBe(15 + 21)
      menu.cursor = 25
      inventoryPageUp(menu)
      expect(menu.cursor).toBe(25 - 21)
      // Clamp 验证
      menu.cursor = 45
      inventoryPageDown(menu)
      expect(menu.cursor).toBe(49) // clamp to length-1
      menu.cursor = 5
      inventoryPageUp(menu)
      expect(menu.cursor).toBe(0)
    })

    it('Home/End = 0 / length - 1', () => {
      const menu = gridMenuState(10)
      menu.cursor = 5
      inventoryHome(menu)
      expect(menu.cursor).toBe(0)
      inventoryEnd(menu)
      expect(menu.cursor).toBe(9)
    })

    it('inventory 空时 cursor 保 0', () => {
      const menu = gridMenuState(0)
      expect(menu.cursor).toBe(0)
      inventoryMoveDown(menu)
      expect(menu.cursor).toBe(0)
    })
  })
  describe('Item use and target requests', () => {
    it('inventoryMoveDown 按 sdlpal 真值跨行(±iItemsPerLine=3)— 2 个 item 时 +3 clamp 到 last=1', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.inventory = [
        { itemId: 105, count: 3 },
        { itemId: 106, count: 1 },
      ]
      const menu = createInventoryMenu(gs, selectionItems, 'all')
      expect(menu.cursor).toBe(0)
      // sdlpal itemmenu.c:67-69 真值:Down → item_delta = +iItemsPerLine(3),clamp 到 inventory.length-1=1
      inventoryMoveDown(menu)
      expect(menu.cursor).toBe(1)
    })
  })
})
