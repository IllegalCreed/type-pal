/**
 * TEST-GLM-PHASE1-LEAVES-3 L05（sell-menu.ts）— 去重表：
 *  - sell-menu.test（全显示 grid/选中门/confirm toggle/sellConfirm/cancel 分层/卖光 clamp）→ 不重复
 *  - sell-menu.boundaries.test（inUse 耗尽/confirm 期翻页/空表-等长-增表刷新/不别名）→ 不重复
 *  - 新差异：空库存 !slot 防御、真实确认态重复选择与 list 相 sellConfirm 零请求。
 *  - 缩表 clamp 与主测试同合同，CODE93 删除重复；filter 已由主测试验证。
 * 只测状态机意图；cash += price/2 与出包由 dispatcher 做（现有调用链测试已证）。
 */
import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import { createSellMenu, sellConfirm, sellSelectItem } from './sell-menu.js'

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

const ITEMS: Item[] = [mkItem(105, { sellable: true })]

function gsWith(counts: number[]): ReturnType<typeof createInitialGameState> {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.inventory = counts.map((count, i) => ({ itemId: ITEMS[i]!.id, count }))
  return gs
}

describe('L05 sell-menu 剩余合同', () => {
  it('空库存 !slot 防御不进 confirm', () => {
    const state = createSellMenu(gsWith([]), ITEMS)
    expect(state.phase).toBe('list')
    expect(sellSelectItem(state, ITEMS)).toBe(false)
    expect(state.selectedItemId).toBeUndefined()
  })

  it('真实确认态重复选择和 list 相重复确认零请求', () => {
    const gs = gsWith([1])
    const state = createSellMenu(gs, ITEMS)
    expect(sellSelectItem(state, ITEMS)).toBe(true)
    const before = structuredClone(state)
    expect(sellSelectItem(state, ITEMS)).toBe(false)
    expect(state).toEqual(before)
    expect(sellConfirm(state)).toEqual({ itemId: 105, yes: false })
    expect(sellConfirm(state)).toBeNull()
    expect(state.phase).toBe('list')
  })
})
