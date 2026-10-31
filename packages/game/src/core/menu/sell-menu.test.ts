import { describe, expect, it } from 'vitest'
import { createInitialGameState, type GameState } from '../game-state.js'
import {
  refreshInventoryItems,
  sellableInventoryItems,
  singleSaleItems,
} from './__tests__/trading-fixture.js'
import {
  createSellMenu,
  refreshSellGrid,
  sellCancel,
  sellConfirm,
  sellEnd,
  sellHome,
  sellMoveDown,
  sellMoveLeft,
  sellMoveRight,
  sellMoveUp,
  sellPageDown,
  sellPageUp,
  sellSelectItem,
} from './sell-menu.js'

function saleGameState(
  inventory: Array<{ itemId: number; count: number; inUse?: number }>,
): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.inventory = inventory
  return gs
}
describe('Sell grid state and intent', () => {
  describe('List selection, confirmation and grid navigation', () => {
    it('createSellMenu:grid 含全部库存(sdlpal 全显示)，保留不可卖项与 sellable filter', () => {
      // sdlpal PAL_ItemSelectMenuInit(itemmenu.c:331-377)不按 kItemFlagSellable 过滤;87 照样列出,
      // 只是 PAL_ItemSelectMenuUpdate 把不可卖项画成 INACTIVE 红色,确认时 itemmenu.c:289 no-op。
      const gs = saleGameState([
        { itemId: 87, count: 1 },
        { itemId: 105, count: 2 },
        { itemId: 110, count: 1 },
      ])
      const menu = createSellMenu(gs, sellableInventoryItems)
      expect(menu.phase).toBe('list')
      expect(menu.grid.filter).toBe('sellable')
      expect(menu.grid.inventory.map((e) => e.itemId)).toEqual([87, 105, 110]) // 87 不可卖仍显示(红色)
      expect(menu.confirmYes).toBe(false)
    })

    it('sellSelectItem:选中 sellable cursor → 进 confirm，每轮默认 No', () => {
      const gs = saleGameState([{ itemId: 105, count: 2 }])
      const menu = createSellMenu(gs, sellableInventoryItems)
      expect(sellSelectItem(menu, sellableInventoryItems)).toBe(true)
      expect(menu.phase).toBe('confirm')
      expect(menu.selectedItemId).toBe(105)
      expect(menu.confirmYes).toBe(false)
      sellMoveDown(menu)
      expect(sellConfirm(menu)).toEqual({ itemId: 105, yes: true })
      expect(sellSelectItem(menu, sellableInventoryItems)).toBe(true)
      expect(menu.confirmYes).toBe(false)
    })

    it('sellSelectItem:光标停在非可卖项(87,红色)→ 不进 confirm,留 list', () => {
      const gs = saleGameState([{ itemId: 87, count: 3 }]) // 87 不可卖 — 列表仍显示(红色)
      const menu = createSellMenu(gs, sellableInventoryItems)
      expect(menu.grid.inventory.map((e) => e.itemId)).toEqual([87]) // 全显示,不被滤
      expect(sellSelectItem(menu, sellableInventoryItems)).toBe(false) // 确认非可卖项 no-op(itemmenu.c:289)
      expect(menu.phase).toBe('list')
    })

    it('grid 导航 right 跨列且末项 clamp', () => {
      const gs = saleGameState([
        { itemId: 105, count: 2 },
        { itemId: 110, count: 1 },
      ])
      const menu = createSellMenu(gs, sellableInventoryItems)
      sellMoveRight(menu)
      expect(menu.grid.cursor).toBe(1) // 105 → 110
      sellMoveRight(menu)
      expect(menu.grid.cursor).toBe(1) // clamp(只 2 项)
    })

    it('confirm 期四方向键只 toggle yes/no，不移动 grid', () => {
      for (const move of [sellMoveUp, sellMoveDown, sellMoveLeft, sellMoveRight]) {
        const menu = createSellMenu(
          saleGameState([{ itemId: 105, count: 2 }]),
          sellableInventoryItems,
        )
        expect(sellSelectItem(menu, sellableInventoryItems)).toBe(true)
        move(menu)
        expect(menu.confirmYes).toBe(true)
        move(menu)
        expect(menu.confirmYes).toBe(false)
        expect(menu.grid.cursor).toBe(0)
      }
    })

    it('sellConfirm yes → 仅返回意图并回 list，实际 cash/inventory 由 caller 持有', () => {
      const gs = saleGameState([{ itemId: 110, count: 1 }])
      gs.dwCash = 50
      const inventoryBefore = structuredClone(gs.inventory)
      const menu = createSellMenu(gs, sellableInventoryItems)
      sellSelectItem(menu, sellableInventoryItems)
      sellMoveDown(menu) // yes
      const r = sellConfirm(menu)
      expect(r).toEqual({ itemId: 110, yes: true })
      expect(menu.phase).toBe('list')
      expect(menu.selectedItemId).toBeUndefined()
      expect(gs.dwCash).toBe(50)
      expect(gs.inventory).toEqual(inventoryBefore)
    })

    it('sellCancel confirm→back 清选择，list→close，实际库存不变', () => {
      const gs = saleGameState([{ itemId: 110, count: 1 }])
      const menu = createSellMenu(gs, sellableInventoryItems)
      expect(sellSelectItem(menu, sellableInventoryItems)).toBe(true)
      expect(sellCancel(menu)).toBe('back')
      expect(menu.phase).toBe('list')
      expect(menu.selectedItemId).toBeUndefined()
      expect(sellCancel(menu)).toBe('close')
      expect(gs.inventory).toEqual([{ itemId: 110, count: 1 }])
    })

    it('refreshSellGrid:卖光物品后 grid 缩短 + cursor clamp(sdlpal while 每轮重跑)', () => {
      const gs = saleGameState([
        { itemId: 105, count: 1 },
        { itemId: 110, count: 1 },
      ])
      const menu = createSellMenu(gs, sellableInventoryItems)
      sellMoveRight(menu) // cursor → 1 (110)
      // 模拟卖掉 110(从 inventory 移除)
      gs.inventory = [{ itemId: 105, count: 1 }]
      refreshSellGrid(menu, gs, sellableInventoryItems)
      expect(menu.grid.inventory.map((e) => e.itemId)).toEqual([105])
      expect(menu.grid.cursor).toBe(0) // clamp 到新列表末
    })
  })
  describe('Availability and snapshot refresh', () => {
    it('inUse 耗尽拒绝；少占用正控进 confirm 并返回 No 意图', () => {
      const gs = saleGameState([
        { itemId: 105, count: 3, inUse: 3 }, // 耗尽
        { itemId: 110, count: 2, inUse: 1 }, // 少占用
      ])
      const state = createSellMenu(gs, refreshInventoryItems)
      state.grid.cursor = 0
      expect(sellSelectItem(state, refreshInventoryItems)).toBe(false) // count===inUse 拒绝
      expect(state.phase).toBe('list')
      state.grid.cursor = 1
      expect(sellSelectItem(state, refreshInventoryItems)).toBe(true)
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
        saleGameState([
          { itemId: 105, count: 1 },
          { itemId: 110, count: 1 },
        ]),
        refreshInventoryItems,
      )
      state.grid.cursor = 1
      expect(sellSelectItem(state, refreshInventoryItems)).toBe(true)
      const before = structuredClone(state)
      for (const move of [sellPageDown, sellPageUp, sellHome, sellEnd]) {
        move(state)
        expect(state).toEqual(before)
      }
    })
    it('等长刷新：保非零 cursor 并更新数量，snapshot 不别名实际库存', () => {
      const gs = saleGameState([
        { itemId: 105, count: 2 },
        { itemId: 110, count: 1 },
      ])
      const state = createSellMenu(gs, refreshInventoryItems)
      state.grid.cursor = 1
      // 等长刷新：保 cursor，slot 是新副本
      gs.inventory[0]!.count = 9
      refreshSellGrid(state, gs, refreshInventoryItems)
      expect(state.grid.cursor).toBe(1)
      expect(state.grid.inventory).toHaveLength(2)
      expect(state.grid.inventory[0]!.count).toBe(9)
      state.grid.inventory[0]!.count = 7
      expect(gs.inventory[0]!.count).toBe(9) // 不别名
    })
    it('刷新空表：非零 cursor 归 0', () => {
      const state = createSellMenu(
        saleGameState([
          { itemId: 105, count: 1 },
          { itemId: 110, count: 1 },
        ]),
        refreshInventoryItems,
      )
      state.grid.cursor = 1
      refreshSellGrid(state, saleGameState([]), refreshInventoryItems)
      expect(state.grid.inventory).toEqual([])
      expect(state.grid.cursor).toBe(0)
    })
    it('增表刷新：保非零 cursor，不复用 GameState 记忆光标', () => {
      const state = createSellMenu(
        saleGameState([
          { itemId: 105, count: 1 },
          { itemId: 110, count: 1 },
        ]),
        refreshInventoryItems,
      )
      state.grid.cursor = 1
      const grown = saleGameState([
        { itemId: 105, count: 1 },
        { itemId: 110, count: 1 },
        { itemId: 87, count: 1 },
      ])
      refreshSellGrid(state, grown, refreshInventoryItems)
      expect(state.grid.inventory.map((slot) => slot.itemId)).toEqual([105, 110, 87])
      expect(state.grid.cursor).toBe(1)
    })
  })
  describe('Empty and repeated requests', () => {
    it('空库存 !slot 防御不进 confirm', () => {
      const state = createSellMenu(saleGameState([]), singleSaleItems)
      expect(state.phase).toBe('list')
      expect(sellSelectItem(state, singleSaleItems)).toBe(false)
      expect(state.selectedItemId).toBeUndefined()
    })

    it('真实确认态重复选择和 list 相重复确认零请求', () => {
      const gs = saleGameState([{ itemId: 105, count: 1 }])
      const state = createSellMenu(gs, singleSaleItems)
      expect(sellSelectItem(state, singleSaleItems)).toBe(true)
      const before = structuredClone(state)
      expect(sellSelectItem(state, singleSaleItems)).toBe(false)
      expect(state).toEqual(before)
      expect(sellConfirm(state)).toEqual({ itemId: 105, yes: false })
      expect(sellConfirm(state)).toBeNull()
      expect(state.phase).toBe('list')
    })
  })
})
