/**
 * TEST-GAME-MENU-BOUNDARIES-1 G07：sell-menu 确认门与刷新（sell-menu.ts）。
 * 既有 sell-menu.test（状态机层）已覆盖门/导航/刷新 clamp 主干——不重复。
 * 本文件：inUse 耗尽拒绝、confirm 期 Page/Home/End 不改 grid、刷新空/等长/增表精确
 * cursor 与内容且不别名实际库存、sellConfirm/sellCancel 状态收尾。
 */
import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import {
  createSellMenu,
  refreshSellGrid,
  sellConfirm,
  sellEnd,
  sellHome,
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
  }
}

// 合成 typed catalog 使用真实物品 OBJECT id；此处只验证菜单合同，不宣称原始价格/flag。
const ITEMS = [mkItem(105, {}), mkItem(87, { sellable: false }), mkItem(110, {})]

function gsWith(inventory: Array<{ itemId: number; count: number; inUse?: number }>) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.inventory = inventory
  return gs
}

describe('G07 sellSelectItem 确认门与 confirm 期导航', () => {
  it('inUse 耗尽拒绝；少占用正控进 confirm 并返回 No 意图', () => {
    const gs = gsWith([
      { itemId: 105, count: 3, inUse: 3 }, // 耗尽
      { itemId: 110, count: 2, inUse: 1 }, // 少占用
    ])
    const state = createSellMenu(gs, ITEMS)
    state.grid.cursor = 0
    expect(sellSelectItem(state, ITEMS)).toBe(false) // count===inUse 拒绝
    expect(state.phase).toBe('list')
    state.grid.cursor = 1
    expect(sellSelectItem(state, ITEMS)).toBe(true)
    expect(state.phase).toBe('confirm')
    expect(state.confirmYes).toBe(false) // 默认 No
    expect(state.selectedItemId).toBe(110)
    // 确认 → 意图并回 list 收尾
    expect(sellConfirm(state)).toEqual({ itemId: 110, yes: false })
    expect(state.phase).toBe('list')
    expect(state.selectedItemId).toBeUndefined()
  })
  it('confirm 期 Page/Home/End 不改 grid 或确认选择', () => {
    const state = createSellMenu(
      gsWith([
        { itemId: 105, count: 1 },
        { itemId: 110, count: 1 },
      ]),
      ITEMS,
    )
    state.grid.cursor = 1
    expect(sellSelectItem(state, ITEMS)).toBe(true)
    const before = structuredClone(state)
    for (const move of [sellPageDown, sellPageUp, sellHome, sellEnd]) {
      move(state)
      expect(state).toEqual(before)
    }
  })
  it('等长刷新：保非零 cursor 并更新数量，snapshot 不别名实际库存', () => {
    const gs = gsWith([
      { itemId: 105, count: 2 },
      { itemId: 110, count: 1 },
    ])
    const state = createSellMenu(gs, ITEMS)
    state.grid.cursor = 1
    // 等长刷新：保 cursor，slot 是新副本
    gs.inventory[0]!.count = 9
    refreshSellGrid(state, gs, ITEMS)
    expect(state.grid.cursor).toBe(1)
    expect(state.grid.inventory).toHaveLength(2)
    expect(state.grid.inventory[0]!.count).toBe(9)
    state.grid.inventory[0]!.count = 7
    expect(gs.inventory[0]!.count).toBe(9) // 不别名
  })
  it('刷新空表：非零 cursor 归 0', () => {
    const state = createSellMenu(
      gsWith([
        { itemId: 105, count: 1 },
        { itemId: 110, count: 1 },
      ]),
      ITEMS,
    )
    state.grid.cursor = 1
    refreshSellGrid(state, gsWith([]), ITEMS)
    expect(state.grid.inventory).toEqual([])
    expect(state.grid.cursor).toBe(0)
  })
  it('增表刷新：保非零 cursor，不复用 GameState 记忆光标', () => {
    const state = createSellMenu(
      gsWith([
        { itemId: 105, count: 1 },
        { itemId: 110, count: 1 },
      ]),
      ITEMS,
    )
    state.grid.cursor = 1
    const grown = gsWith([
      { itemId: 105, count: 1 },
      { itemId: 110, count: 1 },
      { itemId: 87, count: 1 },
    ])
    refreshSellGrid(state, grown, ITEMS)
    expect(state.grid.inventory.map((slot) => slot.itemId)).toEqual([105, 110, 87])
    expect(state.grid.cursor).toBe(1)
  })
})
