/**
 * TEST-GAME-MENU-BOUNDARIES-1 G02：inventory-menu 确认门与保真（inventory-menu.ts）。
 * 既有 inventory-menu.test 已覆盖 filter 列表/装备槽追加/八键导航/切相位/色彩——不重复。
 * 本文件：count===inUse 拒绝与少占用正控、追加装备 count0/inUse-1 可确认、
 * 菜单 slot 不别名实际 gs.inventory、party[2,0] 目标返回 roleId 而非 cursor、错 phase 零请求。
 */
import type { Item, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import {
  confirmInventoryItem,
  confirmInventoryTarget,
  createInventoryMenu,
} from './inventory-menu.js'

function mkItem(id: number, flagsPart: Partial<Item['flags']>): Item {
  return {
    id,
    bitmap: id,
    price: 0,
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
      ...flagsPart,
    },
    _name: `item-${id}`,
  } as unknown as Item
}

const ITEMS = [
  mkItem(200, { usable: true }), // 观音符式可用物
  mkItem(202, { usable: true }), // 风灵珠式可用装备
  mkItem(105, { equipable: true }), // 不可用
]

function roles(...ids: number[]): PlayerRoles {
  return {
    roles: Object.fromEntries(ids.map((id) => [id, { id, _name: `role-${id}` }])),
  } as unknown as PlayerRoles
}

describe('G02 confirmInventoryItem 确认门', () => {
  it('count===inUse 拒绝留在 list；少占用正控进 use-target；追加装备 count0/inUse-1 可确认', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.inventory = [
      { itemId: 200, count: 2, inUse: 2 }, // 全部占用 → 拒绝（inUse 为运行时字段）
      { itemId: 202, count: 1, inUse: 0 }, // 少占用 → 正控
    ] as unknown as typeof gs.inventory
    const state = createInventoryMenu(gs, ITEMS, 'usable')
    state.cursor = 0
    confirmInventoryItem(state, ITEMS, roles(0), [0])
    expect(state.phase).toBe('list') // 全占用 no-op
    expect(state.selectedItemId).toBeUndefined()
    state.cursor = 1
    confirmInventoryItem(state, ITEMS, roles(0), [0])
    expect(state.phase).toBe('use-target')
    expect(state.selectedItemId).toBe(202)

    // 追加装备（count0/inUse-1）：filter usable 会追加装备槽 usable 物，可确认
    const gsEquipped = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gsEquipped.partyMembers = [0]
    gsEquipped.inventory = []
    gsEquipped.PlayerRolesRuntime.rgwEquipment[3]![0] = 202
    const equippedState = createInventoryMenu(gsEquipped, ITEMS, 'usable')
    expect(equippedState.inventory).toEqual([{ itemId: 202, count: 0, inUse: -1 }])
    confirmInventoryItem(equippedState, ITEMS, roles(0), [0]) // 0-(-1)=1 → 可确认
    expect(equippedState.phase).toBe('use-target')
  })
  it('party[2,0]：use-target 光标停在第二位时 confirm 返回 roleId 2 而非 cursor 位；错 phase 零请求', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 200, count: 1 }]
    const state = createInventoryMenu(gs, ITEMS, 'usable')
    confirmInventoryItem(state, ITEMS, roles(2, 0), [2, 0])
    expect(state.targetMenu!.items.map((entry) => entry.id)).toEqual([2, 0])
    state.targetMenu!.cursor = 1
    expect(confirmInventoryTarget(state)).toEqual({ itemId: 200, roleId: 0 }) // roleId 非 cursor
    expect(state.phase).toBe('done')
    // 错 phase：list 阶段 confirmTarget 无请求；done 阶段 confirmItem 无副作用
    const fresh = createInventoryMenu(gs, ITEMS, 'usable')
    expect(confirmInventoryTarget(fresh)).toBeNull()
    fresh.phase = 'done'
    confirmInventoryItem(fresh, ITEMS, roles(0), [0])
    expect(fresh.phase).toBe('done')
  })
  it('菜单 slot 不别名实际 gs.inventory；入参 items 数组不变', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 200, count: 5 }]
    const state = createInventoryMenu(gs, ITEMS, 'usable')
    state.inventory[0]!.count = 999
    expect(gs.inventory[0]!.count).toBe(5) // 菜单副本不写回真实库存
    const itemsSnapshot = structuredClone(ITEMS)
    confirmInventoryItem(state, ITEMS, roles(0), [0])
    expect(structuredClone(ITEMS)).toEqual(itemsSnapshot)
  })
})
