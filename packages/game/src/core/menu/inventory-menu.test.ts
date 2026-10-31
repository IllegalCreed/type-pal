import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import {
  mixedInventoryItems,
  selectionItems,
  targetMemoryItems,
} from './__tests__/inventory-fixture.js'
import { createInventoryMenu } from './inventory-menu.js'

function inventoryGameState(): ReturnType<typeof createInitialGameState> {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0, 1]
  gs.inventory = [
    { itemId: 200, count: 2 },
    { itemId: 201, count: 1 },
  ]
  return gs
}
describe('Inventory construction and snapshots', () => {
  describe('createInventoryMenu — sdlpal itemmenu.c:331-377 全库存入列,不按 flag 过滤', () => {
    it("filter='equip':非可装备项(观音符)仍入列表,不被剔除", () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.inventory = [
        { itemId: 105, count: 2 }, // 木剑 equipable
        { itemId: 200, count: 1 }, // 观音符 usable only — 不可装备但仍显示
        { itemId: 201, count: 1 }, // 玉佛珠 equipable
      ]
      const state = createInventoryMenu(gs, mixedInventoryItems, 'equip')
      expect(state.inventory.map((e) => e.itemId)).toEqual([105, 200, 201])
      expect(state.filter).toBe('equip')
    })

    it("filter='usable':非可用项(木剑)仍入列表，filter 保留供 renderer 判色", () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.inventory = [
        { itemId: 105, count: 1 }, // 木剑 not usable — 红色显示
        { itemId: 200, count: 1 }, // 观音符 usable
        { itemId: 202, count: 1 }, // 风灵珠 usable
      ]
      const state = createInventoryMenu(gs, mixedInventoryItems, 'usable')
      // 全部 3 项都在列表(原版全显示)
      expect(state.inventory.map((e) => e.itemId)).toEqual([105, 200, 202])
      expect(state.filter).toBe('usable')
    })

    it("L39:filter='usable' 追加全队装备槽里 usable 的已装备物(itemmenu.c:352-376)", () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.partyMembers = [0]
      gs.inventory = [{ itemId: 200, count: 1 }] // 背包:观音符(usable)
      gs.PlayerRolesRuntime.rgwEquipment[5]![0] = 202 // 队员0 在饰品槽装了风灵珠(usable)
      const state = createInventoryMenu(gs, mixedInventoryItems, 'usable')
      // 背包观音符 + 追加的已装备风灵珠(穿戴中仍可从「用物品」菜单使用)
      expect(state.inventory.map((e) => e.itemId)).toEqual([200, 202])
      const lingZhu = state.inventory.find((e) => e.itemId === 202)!
      expect(lingZhu.count).toBe(0) // nAmount=0
      expect(lingZhu.count - (lingZhu.inUse ?? 0)).toBeGreaterThan(0) // 0-(-1)=1 → 可选
    })

    it("L39:filter='equip' 不追加装备槽物(仅 usable 入口追加,itemmenu.c:352)", () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.partyMembers = [0]
      gs.inventory = [{ itemId: 105, count: 1 }]
      gs.PlayerRolesRuntime.rgwEquipment[5]![0] = 202 // 装了风灵珠
      const state = createInventoryMenu(gs, mixedInventoryItems, 'equip')
      expect(state.inventory.map((e) => e.itemId)).toEqual([105]) // 不追加
    })
  })
  describe('createInventoryMenu 起始光标与快照默认', () => {
    it('gs.iCurInvMenuItem 恢复为起始 cursor；越界 clamp 到末项', () => {
      const gs = inventoryGameState()
      gs.iCurInvMenuItem = 1
      expect(createInventoryMenu(gs, targetMemoryItems).cursor).toBe(1)
      gs.iCurInvMenuItem = 9 // 越界（库存 2 条）
      expect(createInventoryMenu(gs, targetMemoryItems).cursor).toBe(1)
    })

    it('条目缺 inUse 运行时字段 → slot.inUse 默认 0（?? 0 分支，合法 InventoryEntry）', () => {
      const gs = inventoryGameState()
      const menu = createInventoryMenu(gs, targetMemoryItems)
      expect(menu.inventory).toEqual([
        { itemId: 200, count: 2, inUse: 0 },
        { itemId: 201, count: 1, inUse: 0 },
      ])
    })
  })
  describe('Item use and target requests', () => {
    it('createInventoryMenu:list 阶段 + 含全部 inventory items', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.inventory = [
        { itemId: 105, count: 3 },
        { itemId: 106, count: 1 },
      ]
      const menu = createInventoryMenu(gs, selectionItems, 'all')
      expect(menu.phase).toBe('list')
      expect(menu.inventory).toEqual([
        { itemId: 105, count: 3, inUse: 0 },
        { itemId: 106, count: 1, inUse: 0 },
      ])
    })
  })
})
