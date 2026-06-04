/**
 * EquipMenu state machine 防回归单测 — sdlpal uigame.c:1793-2056 真值。
 *
 * 覆盖:
 *  - createEquipMenu .list 必须是 InventoryMenuState(防退回简版 SelectionMenu)
 *  - confirmEquipItem list → pick-role
 *  - confirmEquipRole 返回 {itemId, roleId}
 *  - cancelEquipMenu pick-role → list / list → done
 *  - equipMoveUp/Down playerCursor wrap(sdlpal uigame.c:2021-2035)
 *
 * Integration(scriptOnEquip 真接通 → rgEquipmentEffect 写)留 menu-driver.test.ts。
 */

import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import {
  cancelEquipMenu,
  confirmEquipItem,
  confirmEquipRole,
  createEquipMenu,
  equipMoveDown,
  equipMoveUp,
} from './equip-menu.js'

function mkItem(id: number, name: string, equipable: boolean, equipableBy: boolean[]): Item {
  return {
    id,
    bitmap: id,
    price: 0,
    scriptOnUse: 0,
    scriptOnEquip: 39000 + id,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false, equipable, throwable: false, consuming: false,
      applyToAll: false, sellable: true, equipableBy,
    },
    _name: name,
  } as unknown as Item
}

const ITEMS: Item[] = [
  mkItem(105, '木剑', true, [true, false, true, false, false, false]),  // 李逍遥/林月如
  mkItem(106, '短刀', true, [true, false, true, false, false, false]),
  mkItem(200, '观音符', false, [false, false, false, false, false, false]), // not equipable
  mkItem(201, '玉佛珠', true, [false, true, false, false, false, false]),    // 赵灵儿 only
]

function mkGs() {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.inventory = [
    { itemId: 105, count: 1 },
    { itemId: 106, count: 1 },
    { itemId: 200, count: 1 },
    { itemId: 201, count: 1 },
  ]
  gs.partyMembers = [0, 1, 2] // 李逍遥 / 赵灵儿 / 林月如
  return gs
}

describe('createEquipMenu', () => {
  it('.list 是 InventoryMenuState(非简版 SelectionMenu)— 防 grid 退化 bug', () => {
    // 2026-05-29 session 2 user 怒怼"[简版,M6 grid]"— 当时 .list = SelectionMenuState 简版。
    // 修后必须复用 InventoryMenuState 全套(grid + 8 key + 6-case color rule)。
    const gs = mkGs()
    const state = createEquipMenu(gs, ITEMS)
    // InventoryMenuState 特征字段:phase / inventory / filter / cursor
    expect(state.list.phase).toBe('list')
    expect(state.list.filter).toBe('equip')
    expect(state.list.inventory).toBeInstanceOf(Array)
    // 不可有 SelectionMenuState 的 pageSize/pageOffset 字段(会撞 type)
    expect('pageSize' in state.list).toBe(false)
  })

  it("非可装备项(观音符 200)仍入列表(sdlpal 全显示,渲染成红色)", () => {
    // sdlpal PAL_ItemSelectMenuInit(itemmenu.c:331-377)不按 wItemFlags 过滤;观音符照样列出,
    // 只是 PAL_ItemSelectMenuUpdate 把不匹配 filter 的项画成 INACTIVE 红色。
    const gs = mkGs()
    const state = createEquipMenu(gs, ITEMS)
    const ids = state.list.inventory.map((e) => e.itemId)
    expect(ids).toEqual([105, 106, 200, 201])
  })

  it('初始 phase=list,playerCursor=0', () => {
    const state = createEquipMenu(mkGs(), ITEMS)
    expect(state.phase).toBe('list')
    expect(state.playerCursor).toBe(0)
    expect(state.selectedItemId).toBeUndefined()
  })

  it('partyMembers snapshot 不会因 gs.partyMembers 后续变化被改', () => {
    const gs = mkGs()
    const state = createEquipMenu(gs, ITEMS)
    gs.partyMembers.push(99)
    expect(state.partyMembers).toEqual([0, 1, 2])
  })
})

describe('confirmEquipItem list → pick-role', () => {
  it('从 list cursor 取 itemId 进 pick-role', () => {
    const state = createEquipMenu(mkGs(), ITEMS)
    state.list.cursor = 1 // 短刀 id 106
    confirmEquipItem(state, ITEMS, {} as never, [])
    expect(state.phase).toBe('pick-role')
    expect(state.selectedItemId).toBe(106)
    expect(state.playerCursor).toBe(0)
  })

  it('cursor 停在非可装备项(观音符 200,红色)→ Confirm no-op,停 list', () => {
    // sdlpal itemmenu.c:287-291 真值:确认时 `wFlags & g_wItemFlags` 不命中 → 返回 0xFFFF(未确认),
    // 留在菜单。列表全显示后,光标可落在非可装备项上,但确认它不该进 pick-role。
    const gs = mkGs()
    const state = createEquipMenu(gs, ITEMS)
    // 列表 = [105, 106, 200, 201];观音符 200 在 index 2
    state.list.cursor = 2
    confirmEquipItem(state, ITEMS, {} as never, [])
    expect(state.phase).toBe('list')
    expect(state.selectedItemId).toBeUndefined()
  })

  it('从空 list noop(防 cursor 越界 crash)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = []
    gs.partyMembers = [0]
    const state = createEquipMenu(gs, ITEMS)
    confirmEquipItem(state, ITEMS, {} as never, [])
    expect(state.phase).toBe('list')
  })

  it('phase=pick-role 时 confirmEquipItem 不再变 phase', () => {
    const state = createEquipMenu(mkGs(), ITEMS)
    state.phase = 'pick-role'
    state.selectedItemId = 999
    confirmEquipItem(state, ITEMS, {} as never, [])
    expect(state.phase).toBe('pick-role')
    expect(state.selectedItemId).toBe(999) // 没被覆盖
  })
})

describe('confirmEquipRole', () => {
  it('返回 {itemId, roleId} 由 dispatcher 跑 scriptOnEquip', () => {
    const state = createEquipMenu(mkGs(), ITEMS)
    state.phase = 'pick-role'
    state.selectedItemId = 105
    state.playerCursor = 1 // 赵灵儿(roleId=1)
    const picked = confirmEquipRole(state)
    expect(picked).toEqual({ itemId: 105, roleId: 1 })
  })

  it('phase=list 时返回 null(防过早调用)', () => {
    const state = createEquipMenu(mkGs(), ITEMS)
    expect(confirmEquipRole(state)).toBeNull()
  })

  it('selectedItemId=undefined 时返回 null', () => {
    const state = createEquipMenu(mkGs(), ITEMS)
    state.phase = 'pick-role'
    expect(confirmEquipRole(state)).toBeNull()
  })
})

describe('cancelEquipMenu', () => {
  it('pick-role → list,reset selectedItemId + playerCursor(sdlpal Menu key 真值)', () => {
    const state = createEquipMenu(mkGs(), ITEMS)
    state.phase = 'pick-role'
    state.selectedItemId = 105
    state.playerCursor = 2
    cancelEquipMenu(state)
    expect(state.phase).toBe('list')
    expect(state.selectedItemId).toBeUndefined()
    expect(state.playerCursor).toBe(0)
  })

  it('list → done(关菜单)', () => {
    const state = createEquipMenu(mkGs(), ITEMS)
    cancelEquipMenu(state)
    expect(state.phase).toBe('done')
  })
})

describe('equipMoveUp/Down playerCursor wrap(sdlpal uigame.c:2021-2035)', () => {
  it('Up wrap to wMaxPartyMemberIndex', () => {
    const state = createEquipMenu(mkGs(), ITEMS)
    state.phase = 'pick-role'
    state.playerCursor = 0
    equipMoveUp(state)
    expect(state.playerCursor).toBe(2) // partyMembers.length - 1
  })

  it('Down wrap to 0', () => {
    const state = createEquipMenu(mkGs(), ITEMS)
    state.phase = 'pick-role'
    state.playerCursor = 2
    equipMoveDown(state)
    expect(state.playerCursor).toBe(0)
  })

  it('Up/Down 在 phase=list 时 noop(dispatcher 走 inventoryMove*)', () => {
    const state = createEquipMenu(mkGs(), ITEMS)
    expect(state.phase).toBe('list')
    state.playerCursor = 0
    equipMoveUp(state)
    expect(state.playerCursor).toBe(0) // 没变
    equipMoveDown(state)
    expect(state.playerCursor).toBe(0)
  })

  it('多次 Up/Down 循环 wrap', () => {
    const state = createEquipMenu(mkGs(), ITEMS)
    state.phase = 'pick-role'
    state.playerCursor = 0
    for (let i = 0; i < 5; i++) equipMoveDown(state)
    // 0 → 1 → 2 → 0 → 1 → 2
    expect(state.playerCursor).toBe(2)
  })
})
