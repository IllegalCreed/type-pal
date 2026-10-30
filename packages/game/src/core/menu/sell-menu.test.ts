/**
 * 全屏卖菜单状态机测试 — sdlpal `uigame.c:1755 PAL_SellMenu` → `PAL_ItemSelectMenu(kItemFlagSellable)`。
 * C9(2026-06-02):卖菜单由紧凑布局补成全屏 picker(复用 InventoryMenu grid)。
 */
import type { Item, ItemFlags } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState, type GameState } from '../game-state.js'
import {
  createSellMenu,
  refreshSellGrid,
  sellCancel,
  sellConfirm,
  sellMoveDown,
  sellMoveLeft,
  sellMoveRight,
  sellMoveUp,
  sellSelectItem,
} from './sell-menu.js'

function flags(over: Partial<ItemFlags> = {}): ItemFlags {
  return {
    usable: false,
    equipable: false,
    throwable: false,
    consuming: false,
    applyToAll: false,
    sellable: false,
    equipableBy: [false, false, false, false, false, false],
    ...over,
  }
}

function mkItem(id: number, price: number, over: Partial<Item> = {}): Item {
  return {
    id,
    _name: `item${id}`,
    bitmap: id,
    price,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: flags(),
    ...over,
  }
}

// 87 不可卖;105/110 可卖(price 50/100 → 售价 25/50)
const CATALOG: Item[] = [
  mkItem(87, 100),
  mkItem(105, 50, { flags: flags({ sellable: true }) }),
  mkItem(110, 100, { flags: flags({ sellable: true }) }),
]

function gsWith(inv: { itemId: number; count: number }[]): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.inventory = inv
  return gs
}

describe('sell-menu 全屏状态机(sdlpal PAL_SellMenu → PAL_ItemSelectMenu kItemFlagSellable)', () => {
  it('createSellMenu:grid 含全部库存(sdlpal 全显示)，保留不可卖项与 sellable filter', () => {
    // sdlpal PAL_ItemSelectMenuInit(itemmenu.c:331-377)不按 kItemFlagSellable 过滤;87 照样列出,
    // 只是 PAL_ItemSelectMenuUpdate 把不可卖项画成 INACTIVE 红色,确认时 itemmenu.c:289 no-op。
    const gs = gsWith([
      { itemId: 87, count: 1 },
      { itemId: 105, count: 2 },
      { itemId: 110, count: 1 },
    ])
    const s = createSellMenu(gs, CATALOG)
    expect(s.phase).toBe('list')
    expect(s.grid.filter).toBe('sellable')
    expect(s.grid.inventory.map((e) => e.itemId)).toEqual([87, 105, 110]) // 87 不可卖仍显示(红色)
    expect(s.confirmYes).toBe(false)
  })

  it('sellSelectItem:选中 sellable cursor → 进 confirm，每轮默认 No', () => {
    const gs = gsWith([{ itemId: 105, count: 2 }])
    const s = createSellMenu(gs, CATALOG)
    expect(sellSelectItem(s, CATALOG)).toBe(true)
    expect(s.phase).toBe('confirm')
    expect(s.selectedItemId).toBe(105)
    expect(s.confirmYes).toBe(false)
    sellMoveDown(s)
    expect(sellConfirm(s)).toEqual({ itemId: 105, yes: true })
    expect(sellSelectItem(s, CATALOG)).toBe(true)
    expect(s.confirmYes).toBe(false)
  })

  it('sellSelectItem:光标停在非可卖项(87,红色)→ 不进 confirm,留 list', () => {
    const gs = gsWith([{ itemId: 87, count: 3 }]) // 87 不可卖 — 列表仍显示(红色)
    const s = createSellMenu(gs, CATALOG)
    expect(s.grid.inventory.map((e) => e.itemId)).toEqual([87]) // 全显示,不被滤
    expect(sellSelectItem(s, CATALOG)).toBe(false) // 确认非可卖项 no-op(itemmenu.c:289)
    expect(s.phase).toBe('list')
  })

  it('grid 导航 right 跨列且末项 clamp', () => {
    const gs = gsWith([
      { itemId: 105, count: 2 },
      { itemId: 110, count: 1 },
    ])
    const s = createSellMenu(gs, CATALOG)
    sellMoveRight(s)
    expect(s.grid.cursor).toBe(1) // 105 → 110
    sellMoveRight(s)
    expect(s.grid.cursor).toBe(1) // clamp(只 2 项)
  })

  it('confirm 期四方向键只 toggle yes/no，不移动 grid', () => {
    for (const move of [sellMoveUp, sellMoveDown, sellMoveLeft, sellMoveRight]) {
      const s = createSellMenu(gsWith([{ itemId: 105, count: 2 }]), CATALOG)
      expect(sellSelectItem(s, CATALOG)).toBe(true)
      move(s)
      expect(s.confirmYes).toBe(true)
      move(s)
      expect(s.confirmYes).toBe(false)
      expect(s.grid.cursor).toBe(0)
    }
  })

  it('sellConfirm yes → 仅返回意图并回 list，实际 cash/inventory 由 caller 持有', () => {
    const gs = gsWith([{ itemId: 110, count: 1 }])
    gs.dwCash = 50
    const inventoryBefore = structuredClone(gs.inventory)
    const s = createSellMenu(gs, CATALOG)
    sellSelectItem(s, CATALOG)
    sellMoveDown(s) // yes
    const r = sellConfirm(s)
    expect(r).toEqual({ itemId: 110, yes: true })
    expect(s.phase).toBe('list')
    expect(s.selectedItemId).toBeUndefined()
    expect(gs.dwCash).toBe(50)
    expect(gs.inventory).toEqual(inventoryBefore)
  })

  it('sellCancel confirm→back 清选择，list→close，实际库存不变', () => {
    const gs = gsWith([{ itemId: 110, count: 1 }])
    const s = createSellMenu(gs, CATALOG)
    expect(sellSelectItem(s, CATALOG)).toBe(true)
    expect(sellCancel(s)).toBe('back')
    expect(s.phase).toBe('list')
    expect(s.selectedItemId).toBeUndefined()
    expect(sellCancel(s)).toBe('close')
    expect(gs.inventory).toEqual([{ itemId: 110, count: 1 }])
  })

  it('refreshSellGrid:卖光物品后 grid 缩短 + cursor clamp(sdlpal while 每轮重跑)', () => {
    const gs = gsWith([
      { itemId: 105, count: 1 },
      { itemId: 110, count: 1 },
    ])
    const s = createSellMenu(gs, CATALOG)
    sellMoveRight(s) // cursor → 1 (110)
    // 模拟卖掉 110(从 inventory 移除)
    gs.inventory = [{ itemId: 105, count: 1 }]
    refreshSellGrid(s, gs, CATALOG)
    expect(s.grid.inventory.map((e) => e.itemId)).toEqual([105])
    expect(s.grid.cursor).toBe(0) // clamp 到新列表末
  })
})
