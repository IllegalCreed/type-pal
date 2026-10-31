import type { PlayerRole, PlayerRoles } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeRoleRecord } from '../../__tests__/battle-records.js'
import { createInitialGameState, type InventoryEntry } from '../game-state.js'
import {
  inventoryItem,
  mixedInventoryItems,
  selectionItems,
  targetMemoryItems,
  usableRequestItems,
} from './__tests__/inventory-fixture.js'
import {
  cancelInventoryMenu,
  confirmInventoryItem,
  confirmInventoryTarget,
  createInventoryMenu,
  inventoryEnd,
  inventoryHome,
  inventoryMoveDown,
  inventoryMoveLeft,
  inventoryMoveRight,
  inventoryMoveUp,
  inventoryPageDown,
  inventoryPageUp,
} from './inventory-menu.js'

function requestRoles(): PlayerRoles {
  return {
    roles: Array.from({ length: 6 }, (_, id) => makeRoleRecord(id, { _name: `role-${id}` })),
  }
}
function inventoryGameState(): ReturnType<typeof createInitialGameState> {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0, 1]
  gs.inventory = [
    { itemId: 200, count: 2 },
    { itemId: 201, count: 1 },
  ]
  return gs
}
function targetRole(id: number, name: string): PlayerRole {
  return makeRoleRecord(id, {
    _name: name,
    level: 5,
    maxHP: 100,
    maxMP: 30,
    hp: 100,
    mp: 20,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 0,
    fleeRate: 0,
    walkFrames: 3,
  })
}
function targetRoles(): PlayerRoles {
  return { roles: [targetRole(0, '逍遥'), targetRole(1, '灵儿')] }
}
const revivalTargetRoles: PlayerRoles = {
  roles: [
    makeRoleRecord(0, {
      _name: 'leader',
      level: 10,
      maxHP: 100,
      maxMP: 100,
      hp: 100,
      mp: 100,
      attackStrength: 0,
      magicStrength: 0,
      defense: 0,
      dexterity: 0,
      fleeRate: 0,
      walkFrames: 3,
    }),
    makeRoleRecord(1, {
      _name: 'follower',
      level: 5,
      maxHP: 50,
      maxMP: 30,
      hp: 0,
      mp: 30,
      attackStrength: 0,
      magicStrength: 0,
      defense: 0,
      dexterity: 0,
      fleeRate: 0,
      walkFrames: 3,
    }),
  ],
}
describe('Inventory item-target lifecycle', () => {
  function resetTargetMemory() {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.inventory = [{ itemId: 105, count: 1 }]
    const items = [inventoryItem(105, { flags: { usable: true } })]
    const menu = createInventoryMenu(gs, items, 'usable')
    confirmInventoryItem(menu, items, { roles: [makeRoleRecord(0)] }, gs.partyMembers)
    cancelInventoryMenu(menu)
  }
  beforeEach(resetTargetMemory)
  afterEach(resetTargetMemory)
  describe('confirmInventoryItem / cancelInventoryMenu phase', () => {
    function itemUseContext(partyMembers: number[] = [0]) {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.inventory = [{ itemId: 200, count: 3 }]
      gs.partyMembers = [...partyMembers]
      return { gs, state: createInventoryMenu(gs, mixedInventoryItems, 'usable') }
    }

    it('空角色/队伍防御：仍建空 targetMenu 并保留 selectedItemId', () => {
      const { state } = itemUseContext([])
      // 公开入口的空列表边界，不冒充真实生产队伍。
      confirmInventoryItem(state, mixedInventoryItems, { roles: [] }, [])
      // 目标 menu 应建好(无 role 也建空 targetMenu)
      expect(state.phase).toBe('use-target')
      expect(state.selectedItemId).toBe(200)
      expect(state.targetMenu?.items).toEqual([])
    })

    it('H2(sdlpal 审查):目标列表不禁选死人 — 死人可选作目标(复活药前提;uigame.c:1383-1495 无 disabled)', () => {
      const { state } = itemUseContext([0, 1])
      const roles: PlayerRoles = {
        roles: [
          makeRoleRecord(0, { hp: 100, _name: '李逍遥' }),
          makeRoleRecord(1, { hp: 0, _name: '赵灵儿' }), // 阵亡
        ],
      }
      confirmInventoryItem(state, mixedInventoryItems, roles, [0, 1])
      expect(state.phase).toBe('use-target')
      const deadTarget = state.targetMenu?.items.find((t) => t.id === 1)
      expect(deadTarget).toBeDefined()
      // sdlpal PAL_ItemUseMenu 对死人无 disabled → 可用还魂香 / 孟婆汤等复活
      expect(deadTarget?.disabled).toBeFalsy()
    })

    it('Cancel use-target → 回 list;Cancel list → done', () => {
      const menu = itemUseContext().state
      confirmInventoryItem(menu, mixedInventoryItems, { roles: [makeRoleRecord(0)] }, [0])
      expect(menu.phase).toBe('use-target')
      cancelInventoryMenu(menu)
      expect(menu.phase).toBe('list')
      expect(menu.selectedItemId).toBeUndefined()

      cancelInventoryMenu(menu)
      expect(menu.phase).toBe('done')
    })
  })
  describe('confirmInventoryItem 确认门', () => {
    it('count===inUse 拒绝留在 list；少占用正控进 use-target；追加装备 count0/inUse-1 可确认', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.partyMembers = [0]
      const inventory: Array<InventoryEntry & { inUse: number }> = [
        { itemId: 200, count: 2, inUse: 2 }, // 全部占用 → 拒绝（inUse 为运行时字段）
        { itemId: 202, count: 1, inUse: 0 }, // 少占用 → 正控
      ]
      gs.inventory = inventory
      const state = createInventoryMenu(gs, usableRequestItems, 'usable')
      state.cursor = 0
      confirmInventoryItem(state, usableRequestItems, requestRoles(), [0])
      expect(state.phase).toBe('list') // 全占用 no-op
      expect(state.selectedItemId).toBeUndefined()
      state.cursor = 1
      confirmInventoryItem(state, usableRequestItems, requestRoles(), [0])
      expect(state.phase).toBe('use-target')
      expect(state.selectedItemId).toBe(202)

      // 追加装备（count0/inUse-1）：filter usable 会追加装备槽 usable 物，可确认
      const gsEquipped = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gsEquipped.partyMembers = [0]
      gsEquipped.inventory = []
      gsEquipped.PlayerRolesRuntime.rgwEquipment[5]![0] = 202
      const equippedState = createInventoryMenu(gsEquipped, usableRequestItems, 'usable')
      expect(equippedState.inventory).toEqual([{ itemId: 202, count: 0, inUse: -1 }])
      confirmInventoryItem(equippedState, usableRequestItems, requestRoles(), [0]) // 0-(-1)=1 → 可确认
      expect(equippedState.phase).toBe('use-target')
    })

    it('party[2,0]：use-target 光标停在第二位时 confirm 返回 roleId 0 而非 cursor 1；错 phase 零请求', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.partyMembers = [2, 0]
      gs.inventory = [{ itemId: 200, count: 1 }]
      const state = createInventoryMenu(gs, usableRequestItems, 'usable')
      confirmInventoryItem(state, usableRequestItems, requestRoles(), [2, 0])
      expect(state.targetMenu!.items.map((entry) => entry.id)).toEqual([2, 0])
      state.targetMenu!.cursor = 1
      expect(confirmInventoryTarget(state)).toEqual({ itemId: 200, roleId: 0 }) // roleId 非 cursor
      expect(state.phase).toBe('done')
      // 错 phase：list 阶段 confirmTarget 无请求；done 阶段 confirmItem 无副作用
      const fresh = createInventoryMenu(gs, usableRequestItems, 'usable')
      expect(confirmInventoryTarget(fresh)).toBeNull()
      fresh.phase = 'done'
      confirmInventoryItem(fresh, usableRequestItems, requestRoles(), [0])
      expect(fresh.phase).toBe('done')
    })

    it('菜单 slot 不别名实际 gs.inventory；入参 items 数组不变', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.partyMembers = [0]
      gs.inventory = [{ itemId: 200, count: 5 }]
      const state = createInventoryMenu(gs, usableRequestItems, 'usable')
      state.inventory[0]!.count = 7
      expect(gs.inventory[0]!.count).toBe(5) // 菜单副本不写回真实库存
      const itemsSnapshot = structuredClone(usableRequestItems)
      confirmInventoryItem(state, usableRequestItems, requestRoles(), [0])
      expect(usableRequestItems).toEqual(itemsSnapshot)
    })
  })
  describe('use-target 相导航委派与 done 相 no-op', () => {
    function useTargetState() {
      const gs = inventoryGameState()
      const menu = createInventoryMenu(gs, targetMemoryItems, 'usable')
      confirmInventoryItem(menu, targetMemoryItems, targetRoles(), [0, 1])
      expect(menu.phase).toBe('use-target')
      return menu
    }

    it('use-target：Up/Down 移 targetMenu.cursor 且不动 list cursor；其余六键 no-op', () => {
      const menu = useTargetState()
      menu.targetMenu!.cursor = 1
      inventoryMoveDown(menu)
      expect(menu.targetMenu!.cursor).toBe(0) // 2 项环绕
      inventoryMoveUp(menu)
      expect(menu.targetMenu!.cursor).toBe(1)
      const listCursorBefore = menu.cursor
      inventoryMoveLeft(menu)
      inventoryMoveRight(menu)
      inventoryPageUp(menu)
      inventoryPageDown(menu)
      inventoryHome(menu)
      inventoryEnd(menu)
      expect(menu.cursor).toBe(listCursorBefore) // list cursor 未被触碰
      expect(menu.phase).toBe('use-target')
    })

    it('done 相：全部移动键 no-op', () => {
      const menu = useTargetState()
      confirmInventoryTarget(menu)
      expect(menu.phase).toBe('done')
      const snapshot = structuredClone(menu)
      inventoryMoveUp(menu)
      inventoryMoveDown(menu)
      inventoryMoveLeft(menu)
      inventoryMoveRight(menu)
      inventoryPageUp(menu)
      inventoryPageDown(menu)
      inventoryHome(menu)
      inventoryEnd(menu)
      expect(menu).toEqual(snapshot)
    })
  })
  describe('cancel 路径 L40 记忆与防御 null', () => {
    it('use-target 取消也回写记忆 slot：下次确认默认停回取消时位置', () => {
      const gs = inventoryGameState()
      const menu = createInventoryMenu(gs, targetMemoryItems, 'usable')
      confirmInventoryItem(menu, targetMemoryItems, targetRoles(), [0, 1])
      menu.targetMenu!.cursor = 1
      cancelInventoryMenu(menu)
      expect(menu.phase).toBe('list')
      // 再确认另一可用物品 → targetMenu 起始光标 = 上次取消时 slot 1
      confirmInventoryItem(menu, targetMemoryItems, targetRoles(), [0, 1])
      expect(menu.phase).toBe('use-target')
      expect(menu.targetMenu!.cursor).toBe(1)
    })

    it('use-target 但 selectedItemId 缺失 → confirmTarget 防御 null（直造状态可达）', () => {
      const gs = inventoryGameState()
      const menu = createInventoryMenu(gs, targetMemoryItems, 'usable')
      confirmInventoryItem(menu, targetMemoryItems, targetRoles(), [0, 1])
      menu.selectedItemId = undefined
      expect(confirmInventoryTarget(menu)).toBeNull()
      expect(menu.phase).toBe('use-target') // 不误切 done
    })
  })
  describe('Item use and target requests', () => {
    it('confirmInventoryItem usable 物品 → 进 use-target + 构 targetMenu', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.partyMembers = [0, 1]
      gs.inventory = [{ itemId: 105, count: 3 }]
      const menu = createInventoryMenu(gs, selectionItems, 'all')
      confirmInventoryItem(menu, selectionItems, revivalTargetRoles, gs.partyMembers)
      expect(menu.phase).toBe('use-target')
      expect(menu.selectedItemId).toBe(105)
      expect(menu.targetMenu?.items.length).toBe(2)
      // H2(2026-06-07 sdlpal 审查):PAL_ItemUseMenu(uigame.c:1383-1495)对死人**无** disabled —— 死人
      //   也可选(还魂香 / 孟婆汤等复活药的前提)。原断言钉死的"死人 disabled"是 bug,已纠正对齐 C 真值。
      expect(menu.targetMenu?.items[1]?.disabled).toBeFalsy()
    })

    it('confirmInventoryItem 不可用物品 → 无 transition', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.partyMembers = [0]
      gs.inventory = [{ itemId: 106, count: 1 }]
      const menu = createInventoryMenu(gs, selectionItems, 'all')
      confirmInventoryItem(menu, selectionItems, revivalTargetRoles, gs.partyMembers)
      expect(menu.phase).toBe('list') // 没进 use-target
    })

    it('confirmInventoryTarget → 返回 { itemId, roleId } + phase done', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.partyMembers = [0]
      gs.inventory = [{ itemId: 105, count: 3 }]
      const menu = createInventoryMenu(gs, selectionItems, 'all')
      confirmInventoryItem(menu, selectionItems, revivalTargetRoles, gs.partyMembers)
      const r = confirmInventoryTarget(menu)
      expect(r).toEqual({ itemId: 105, roleId: 0 })
      expect(menu.phase).toBe('done')
    })

    // L40(uigame.c:1311 static SHORT sSelectedPlayer):用物品选目标框默认光标跨次记忆 ——
    //   切换物品 / 关菜单重开后,默认光标停在上次选中的队员 slot,而非回队首。
    //   模块记忆不入存档；本 spec 通过公开单人目标流程在每例前后归零。
    it('L40:确认目标后重建 targetMenu 光标记忆上次 slot(uigame.c:1311)', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.partyMembers = [0, 1]
      gs.inventory = [{ itemId: 105, count: 3 }]
      const menu = createInventoryMenu(gs, selectionItems, 'all')
      confirmInventoryItem(menu, selectionItems, revivalTargetRoles, gs.partyMembers)
      menu.targetMenu!.cursor = 1 // 选中 follower(slot 1)
      confirmInventoryTarget(menu) // 持久化 slot 1
      // 切换物品 / 重开 → 重建 targetMenu
      menu.phase = 'list'
      confirmInventoryItem(menu, selectionItems, revivalTargetRoles, gs.partyMembers)
      expect(menu.targetMenu?.cursor).toBe(1) // 记忆 slot 1,而非重置回 0
    })

    it('L40:记忆 slot 越界(队伍变小)时归 0(uigame.c:1320-1323)', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.partyMembers = [0, 1]
      gs.inventory = [{ itemId: 105, count: 3 }]
      const menu = createInventoryMenu(gs, selectionItems, 'all')
      confirmInventoryItem(menu, selectionItems, revivalTargetRoles, gs.partyMembers)
      menu.targetMenu!.cursor = 1
      confirmInventoryTarget(menu) // slot=1
      // 队伍缩为 1 人 → 重建时 slot 1 越界 → 归 0(防越界 + 对齐 C clamp)
      gs.partyMembers = [0]
      menu.phase = 'list'
      confirmInventoryItem(menu, selectionItems, revivalTargetRoles, gs.partyMembers)
      expect(menu.targetMenu?.cursor).toBe(0)
    })
  })
})
