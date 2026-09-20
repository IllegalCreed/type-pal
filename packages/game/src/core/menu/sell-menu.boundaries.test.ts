/**
 * TEST-GAME-MENU-BOUNDARIES-1 G07：sell-menu 确认门与刷新（sell-menu.ts）。
 * 既有 sell-menu.test（menu-driver 层）已覆盖门/导航/刷新 clamp 主干——不重复。
 * 本文件：inUse 耗尽拒绝、confirm 期 Page/Home/End 不改 grid、刷新空/等长/增表精确
 * cursor 与内容且不别名实际库存、sellConfirm/sellCancel 状态收尾。
 */
import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import {
  createSellMenu,
  refreshSellGrid,
  sellCancel,
  sellConfirm,
  sellEnd,
  sellPageDown,
  sellPageUp,
  sellSelectItem,
} from './sell-menu.js'

function mkItem(id: number, flagsPart: Partial<Item['flags']>): Item {
  return {
    id,
    bitmap: id,
    price: 100,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: true,
      equipableBy: [false, false, false, false, false, false],
      ...flagsPart,
    },
    _name: `item-${id}`,
  } as unknown as Item
}

const ITEMS = [mkItem(300, {}), mkItem(301, { sellable: false }), mkItem(302, {})]

function gsWith(inventory: Array<{ itemId: number; count: number; inUse?: number }>) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.inventory = inventory
  return gs
}

describe('G07 sellSelectItem 确认门与 confirm 期导航', () => {
  it('inUse 耗尽拒绝；少占用正控进 confirm；confirm 期 Page/Home/End 不改 grid', () => {
    const gs = gsWith([
      { itemId: 300, count: 3, inUse: 3 }, // 耗尽
      { itemId: 302, count: 2, inUse: 1 }, // 少占用
    ])
    const state = createSellMenu(gs, ITEMS)
    state.grid.cursor = 0
    expect(sellSelectItem(state, ITEMS)).toBe(false) // count===inUse 拒绝
    expect(state.phase).toBe('list')
    state.grid.cursor = 1
    expect(sellSelectItem(state, ITEMS)).toBe(true)
    expect(state.phase).toBe('confirm')
    expect(state.confirmYes).toBe(false) // 默认 No
    expect(state.selectedItemId).toBe(302)
    // confirm 期翻页/首尾不改 grid
    const cursorBefore = state.grid.cursor
    sellPageDown(state)
    sellPageUp(state)
    sellEnd(state)
    expect(state.grid.cursor).toBe(cursorBefore)
    // 确认 → 意图并回 list 收尾
    expect(sellConfirm(state)).toEqual({ itemId: 302, yes: false })
    expect(state.phase).toBe('list')
    expect(state.selectedItemId).toBeUndefined()
    // cancel 收尾
    state.grid.cursor = 1
    expect(sellSelectItem(state, ITEMS)).toBe(true) // 302 再选（仍有 1 可卖）
    expect(sellCancel(state)).toBe('back')
    expect(state.phase).toBe('list')
    expect(sellCancel(state)).toBe('close')
  })
  it('刷新：空表归 0、等长保 cursor、增表保 cursor；内容不别名实际库存', () => {
    const gs = gsWith([
      { itemId: 300, count: 2 },
      { itemId: 302, count: 1 },
    ])
    const state = createSellMenu(gs, ITEMS)
    state.grid.cursor = 1
    // 等长刷新：保 cursor，slot 是新副本
    gs.inventory[0]!.count = 9
    refreshSellGrid(state, gs, ITEMS)
    expect(state.grid.cursor).toBe(1)
    expect(state.grid.inventory).toHaveLength(2)
    state.grid.inventory[0]!.count = 777
    expect(gs.inventory[0]!.count).toBe(9) // 不别名
    // 卖空 → 空表 cursor 0
    const emptied = gsWith([])
    refreshSellGrid(state, emptied, ITEMS)
    expect(state.grid.inventory).toEqual([])
    expect(state.grid.cursor).toBe(0)
    // 增表：cursor 越界前值保住（仍 0 < 新长度）
    const grown = gsWith([
      { itemId: 300, count: 1 },
      { itemId: 302, count: 1 },
    ])
    refreshSellGrid(state, grown, ITEMS)
    expect(state.grid.inventory.map((slot) => slot.itemId)).toEqual([300, 302])
    expect(state.grid.cursor).toBe(0)
  })
})
