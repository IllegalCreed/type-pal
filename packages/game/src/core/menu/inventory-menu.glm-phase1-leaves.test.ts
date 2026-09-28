/**
 * TEST-GLM-PHASE1-LEAVES-3 L03（inventory-menu.ts）— 去重表：
 *  - inventory-menu.test（六色表/matchesFilter/全显示+着色/L39 装备槽追加/八键 clamp/确认门/H2 死人可选）→ 不重复
 *  - __tests__/inventory-menu.test（建表/确认/取消/L40 确认回写与越界归 0）→ 不重复
 *  - inventory-menu.boundaries.test（count==inUse 拒绝/count0-inUse-1 可确认/不别名/非顺序 roleId/错相零请求）→ 不重复
 *  - 新差异：gs.iCurInvMenuItem 起始光标恢复与 clamp、缺 inUse 字段条目默认 0、
 *    use-target 相 Up/Down 委派 targetMenu 且 list 相八键零触达、done 相全导航 no-op、
 *    cancel 路径也回写 L40 记忆 slot、use-target 无 selectedItemId 的 confirmTarget 防御 null。
 * 原地可变合同：cursor/phase 按 sdlpal itemmenu.c 就地改，不造 immutability。
 */
import type { Item, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game-state.js'
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

function mkItem(id: number, flags: Partial<Item['flags']>): Item {
  return {
    id,
    _name: `item-${id}`,
    bitmap: 0,
    price: 10,
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
  mkItem(200, { usable: true, consuming: true }),
  mkItem(201, { usable: true, consuming: true }),
]

function gsWithInventory(): ReturnType<typeof createInitialGameState> {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0, 1]
  gs.inventory = [
    { itemId: 200, count: 2 },
    { itemId: 201, count: 1 },
  ]
  return gs
}

function mkRole(id: number, name: string): PlayerRole {
  return {
    id,
    _name: name,
    avatar: 0,
    spriteNumInBattle: 0,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
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
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 3,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
  }
}

function roles(): PlayerRoles {
  return { roles: [mkRole(0, '逍遥'), mkRole(1, '灵儿')] }
}

describe('L03 createInventoryMenu 起始光标与快照默认', () => {
  it('gs.iCurInvMenuItem 恢复为起始 cursor；越界 clamp 到末项', () => {
    const gs = gsWithInventory()
    gs.iCurInvMenuItem = 1
    expect(createInventoryMenu(gs, ITEMS).cursor).toBe(1)
    gs.iCurInvMenuItem = 9 // 越界（库存 2 条）
    expect(createInventoryMenu(gs, ITEMS).cursor).toBe(1)
  })

  it('条目缺 inUse 运行时字段 → slot.inUse 默认 0（?? 0 分支，合法 InventoryEntry）', () => {
    const gs = gsWithInventory()
    const s = createInventoryMenu(gs, ITEMS)
    expect(s.inventory).toEqual([
      { itemId: 200, count: 2, inUse: 0 },
      { itemId: 201, count: 1, inUse: 0 },
    ])
  })
})

describe('L03 use-target 相导航委派与 done 相 no-op', () => {
  function useTargetState() {
    const gs = gsWithInventory()
    const s = createInventoryMenu(gs, ITEMS, 'usable')
    confirmInventoryItem(s, ITEMS, roles(), [0, 1])
    expect(s.phase).toBe('use-target')
    return s
  }

  it('use-target：Up/Down 移 targetMenu.cursor 且不动 list cursor；其余六键 no-op', () => {
    const s = useTargetState()
    s.targetMenu!.cursor = 1
    inventoryMoveDown(s)
    expect(s.targetMenu!.cursor).toBe(0) // 2 项环绕
    inventoryMoveUp(s)
    expect(s.targetMenu!.cursor).toBe(1)
    const listCursorBefore = s.cursor
    inventoryMoveLeft(s)
    inventoryMoveRight(s)
    inventoryPageUp(s)
    inventoryPageDown(s)
    inventoryHome(s)
    inventoryEnd(s)
    expect(s.cursor).toBe(listCursorBefore) // list cursor 未被触碰
    expect(s.phase).toBe('use-target')
  })

  it('done 相：全部移动键 no-op', () => {
    const s = useTargetState()
    confirmInventoryTarget(s)
    expect(s.phase).toBe('done')
    const snapshot = structuredClone(s)
    inventoryMoveUp(s)
    inventoryMoveDown(s)
    inventoryMoveLeft(s)
    inventoryMoveRight(s)
    inventoryPageUp(s)
    inventoryPageDown(s)
    inventoryHome(s)
    inventoryEnd(s)
    expect(s).toEqual(snapshot)
  })
})

describe('L03 cancel 路径 L40 记忆与防御 null', () => {
  it('use-target 取消也回写记忆 slot：下次确认默认停回取消时位置', () => {
    const gs = gsWithInventory()
    const s = createInventoryMenu(gs, ITEMS, 'usable')
    confirmInventoryItem(s, ITEMS, roles(), [0, 1])
    s.targetMenu!.cursor = 1
    cancelInventoryMenu(s)
    expect(s.phase).toBe('list')
    // 再确认另一可用物品 → targetMenu 起始光标 = 上次取消时 slot 1
    confirmInventoryItem(s, ITEMS, roles(), [0, 1])
    expect(s.phase).toBe('use-target')
    expect(s.targetMenu!.cursor).toBe(1)
  })

  it('use-target 但 selectedItemId 缺失 → confirmTarget 防御 null（直造状态可达）', () => {
    const gs = gsWithInventory()
    const s = createInventoryMenu(gs, ITEMS, 'usable')
    confirmInventoryItem(s, ITEMS, roles(), [0, 1])
    s.selectedItemId = undefined
    expect(confirmInventoryTarget(s)).toBeNull()
    expect(s.phase).toBe('use-target') // 不误切 done
  })
})
