/**
 * TEST-GAME-MENU-BOUNDARIES-1 G08：equip-menu 请求与意图（equip-menu.ts）。
 * 既有 equip-menu.test 已覆盖 grid/party 快照/门/环绕——不重复。本文件：
 * inUse 耗尽拒绝、party[2,0] 请求 roleId、confirm 只返回意图不改装备/钱/库存、
 * cancel 复位 playerCursor、错 phase 零请求。
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
} from './equip-menu.js'

const mkItem = (id: number, flagsPart: Partial<Item['flags']>): Item =>
  ({
    id,
    price: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [true, true, true, true, true, true],
      ...flagsPart,
    },
    _name: `item-${id}`,
  }) as unknown as Item

const ITEMS = [mkItem(500, { equipable: true }), mkItem(501, { equipable: true })]

function gsWith(inventory: Array<{ itemId: number; count: number; inUse?: number }>) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.inventory = inventory
  gs.partyMembers = [2, 0]
  return gs
}

describe('G08 confirmEquipItem/Role 意图合同', () => {
  it('inUse 耗尽拒绝；party[2,0] 返回 roleId 非 cursor；意图不改装备/钱/库存', () => {
    const gs = gsWith([
      { itemId: 500, count: 2, inUse: 2 }, // 耗尽
      { itemId: 501, count: 1, inUse: 0 },
    ])
    const gsSnapshot = structuredClone({
      inventory: gs.inventory,
      party: gs.partyMembers,
      equipment: gs.PlayerRolesRuntime.rgwEquipment,
    })
    const state = createEquipMenu(gs, ITEMS)
    state.list.cursor = 0
    confirmEquipItem(state, ITEMS, {} as never, [2, 0])
    expect(state.phase).toBe('list') // 耗尽 no-op
    state.list.cursor = 1
    confirmEquipItem(state, ITEMS, {} as never, [2, 0])
    expect(state.phase).toBe('pick-role')
    expect(state.selectedItemId).toBe(501)
    equipMoveDown(state) // cursor 0 → 1（第二位 = roleId 0）
    expect(confirmEquipRole(state)).toEqual({ itemId: 501, roleId: 0 }) // roleId 非 cursor
    // 意图合同：装备/库存/队伍实参零变化
    expect(
      structuredClone({
        inventory: gs.inventory,
        party: gs.partyMembers,
        equipment: gs.PlayerRolesRuntime.rgwEquipment,
      }),
    ).toEqual(gsSnapshot)
  })
  it('cancel 复位 playerCursor/selectedItemId；错 phase 零请求', () => {
    const gs = gsWith([{ itemId: 501, count: 1 }])
    const state = createEquipMenu(gs, ITEMS)
    expect(confirmEquipRole(state)).toBeNull() // list 阶段无请求
    state.list.cursor = 0
    confirmEquipItem(state, ITEMS, {} as never, [2, 0])
    equipMoveDown(state)
    cancelEquipMenu(state)
    expect(state.phase).toBe('list')
    expect(state.selectedItemId).toBeUndefined()
    expect(state.playerCursor).toBe(0) // 复位
    cancelEquipMenu(state)
    expect(state.phase).toBe('done')
    // done 阶段 Confirm 无副作用：同一 state 调用前后完整相等（错写 phase 即红）
    const doneSnapshot = structuredClone(state)
    confirmEquipItem(state, ITEMS, {} as never, [2, 0])
    expect(state).toEqual(doneSnapshot)
    state.phase = 'pick-role'
    state.selectedItemId = undefined
    expect(confirmEquipRole(state)).toBeNull()
  })
})
