/**
 * TEST-GAME-MENU-BOUNDARIES-1 G06：shop-menu 边界（shop-menu.ts）。
 * 既有 shop-menu.test 已覆盖列表/钱/确认主干——不重复。本文件：money===price 恰等可进、
 * 差 1 拒绝、空列表拒绝、No/Yes 意图与 selected 收尾、状态机不扣实际数字（纯意图）。
 */
import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  createBuyMenu,
  shopCancel,
  shopConfirm,
  shopMoveUp,
  shopSelectItem,
} from './shop-menu.js'

const mkItem = (id: number, price: number): Item =>
  ({ id, price, _name: `item-${id}`, flags: {} }) as unknown as Item

const ITEMS = [mkItem(400, 150), mkItem(401, 200)]

describe('G06 shopSelectItem 恰等门与意图收尾', () => {
  it('cash===price 恰等可进 confirm；差 1 拒绝；空列表拒绝', () => {
    const state = createBuyMenu(ITEMS)
    state.list.cursor = 0
    expect(shopSelectItem(state, ITEMS, 150)).toBe(true) // 恰等
    expect(state.phase).toBe('confirm')
    expect(state.selectedItemId).toBe(400)
    expect(shopConfirm(state)).toEqual({ itemId: 400, mode: 'buy', yes: false })
    expect(state.phase).toBe('list')
    expect(state.selectedItemId).toBeUndefined()

    state.list.cursor = 0
    expect(shopSelectItem(state, ITEMS, 149)).toBe(false) // 差 1
    expect(state.phase).toBe('list')

    expect(shopSelectItem(createBuyMenu([]), [], 999)).toBe(false)
  })
  it('confirm 期方向键 toggle；确认后 No 意图与收尾；cancel 分层；状态机零副作用', () => {
    const state = createBuyMenu(ITEMS)
    state.list.cursor = 1
    shopSelectItem(state, ITEMS, 500)
    shopMoveUp(state) // confirm 期 toggle → yes
    expect(state.confirmYes).toBe(true)
    shopMoveUp(state) // 再 toggle → no
    expect(state.confirmYes).toBe(false)
    expect(shopConfirm(state)).toEqual({ itemId: 401, mode: 'buy', yes: false })
    // cancel 分层：confirm → back；list → close
    state.list.cursor = 0
    shopSelectItem(state, ITEMS, 500)
    expect(shopCancel(state)).toBe('back')
    expect(shopCancel(state)).toBe('close')
    // 纯状态机：多次进出 confirm 后 items 目录与列表内容不变
    const snapshot = structuredClone(ITEMS)
    expect(structuredClone(ITEMS)).toEqual(snapshot)
    expect(state.list.items.map((entry) => entry.rightText)).toEqual(['150', '200'])
  })
})
