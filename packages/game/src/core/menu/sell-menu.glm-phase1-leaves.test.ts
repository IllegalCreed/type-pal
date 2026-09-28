/**
 * TEST-GLM-PHASE1-LEAVES-3 L05（sell-menu.ts）— 去重表：
 *  - sell-menu.test（全显示 grid/选中门/confirm toggle/sellConfirm/cancel 分层/卖光 clamp）→ 不重复
 *  - sell-menu.boundaries.test（inUse 耗尽/confirm 期翻页/空表-等长-增表刷新/不别名）→ 不重复
 *  - 新差异：grid 固定 filter='sellable'、空库存 !slot 防御、错相 sellSelectItem/sellConfirm
 *    零请求、刷新缩表（非空）clamp 到末项分支。
 * 只测状态机意图；cash += price/2 与出包由 dispatcher 做（现有调用链测试已证）。
 */
import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import { createSellMenu, refreshSellGrid, sellConfirm, sellSelectItem } from './sell-menu.js'

function mkItem(id: number, flags: Partial<Item['flags']>): Item {
  return {
    id,
    _name: `item-${id}`,
    bitmap: 0,
    price: 40,
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
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
      ...flags,
    },
  }
}

const ITEMS: Item[] = [
  mkItem(300, { sellable: true }),
  mkItem(301, { sellable: true }),
  mkItem(302, { sellable: true }),
]

function gsWith(counts: number[]): ReturnType<typeof createInitialGameState> {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.inventory = counts.map((count, i) => ({ itemId: ITEMS[i]!.id, count }))
  return gs
}

describe('L05 sell-menu 剩余合同', () => {
  it('grid 固定 filter=sellable 入口；空库存 !slot 防御不进 confirm', () => {
    const state = createSellMenu(gsWith([]), ITEMS)
    expect(state.grid.filter).toBe('sellable')
    expect(state.phase).toBe('list')
    expect(sellSelectItem(state, ITEMS)).toBe(false)
    expect(state.selectedItemId).toBeUndefined()
  })

  it('错相 sellSelectItem / list 相 sellConfirm 零请求', () => {
    const gs = gsWith([1])
    const state = createSellMenu(gs, ITEMS)
    state.phase = 'confirm' // 直造错相（防御分支）
    expect(sellSelectItem(state, ITEMS)).toBe(false)
    state.phase = 'list'
    expect(sellConfirm(state)).toBeNull()
    expect(state.phase).toBe('list')
  })

  it('刷新缩表（非空）：prevCursor 越新末项 → clamp 到 length-1', () => {
    const before = gsWith([1, 1, 1])
    const state = createSellMenu(before, ITEMS)
    state.grid.cursor = 2
    const after = gsWith([1, 1]) // 3 → 2 条
    refreshSellGrid(state, after, ITEMS)
    expect(state.grid.inventory.map((slot) => slot.itemId)).toEqual([300, 301])
    expect(state.grid.cursor).toBe(1) // clamp 分支
  })
})
