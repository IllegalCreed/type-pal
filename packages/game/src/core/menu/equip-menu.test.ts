/** Equipment list,role-selection and request contracts;dispatcher owns permission checks,scripts and inventory refresh. */
import type { Item, ItemFlags } from '@type-pal/shared'
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

function equipmentItem(id: number, name: string, bitmap: number, flags: Partial<ItemFlags>): Item {
  return {
    id,
    _name: name,
    bitmap,
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
      ...flags,
    },
  }
}

const equipmentCatalog: Item[] = [
  equipmentItem(105, '木剑', 105, {
    equipable: true,
    sellable: true,
    equipableBy: [true, false, true, false, false, false],
  }),
  equipmentItem(106, '短刀', 106, {
    equipable: true,
    sellable: true,
    equipableBy: [true, false, true, false, false, false],
  }),
  equipmentItem(200, '观音符', 200, {
    equipable: false,
    sellable: true,
    equipableBy: [false, false, false, false, false, false],
  }),
  equipmentItem(201, '玉佛珠', 201, {
    equipable: true,
    sellable: true,
    equipableBy: [false, true, false, false, false, false],
  }),
]

function createEquipGameState() {
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
  it('列表保持 list 阶段和 equip 过滤模式', () => {
    // 列表阶段与过滤模式由真实网格呈现／确认调用方消费。
    const gs = createEquipGameState()
    const state = createEquipMenu(gs, equipmentCatalog)
    // InventoryMenuState 特征字段:phase / inventory / filter / cursor
    expect(state.list.phase).toBe('list')
    expect(state.list.filter).toBe('equip')
    // 列表数据结构由 InventoryMenuState 静态合同约束。
  })

  it('非可装备项(观音符 200)仍入列表(sdlpal 全显示,渲染成红色)', () => {
    // sdlpal PAL_ItemSelectMenuInit(itemmenu.c:331-377)不按 wItemFlags 过滤;观音符照样列出,
    // 只是 PAL_ItemSelectMenuUpdate 把不匹配 filter 的项画成 INACTIVE 红色。
    const gs = createEquipGameState()
    const state = createEquipMenu(gs, equipmentCatalog)
    const ids = state.list.inventory.map((e) => e.itemId)
    expect(ids).toEqual([105, 106, 200, 201])
  })

  it('初始 phase=list,playerCursor=0', () => {
    const state = createEquipMenu(createEquipGameState(), equipmentCatalog)
    expect(state.phase).toBe('list')
    expect(state.playerCursor).toBe(0)
    expect(state.selectedItemId).toBeUndefined()
  })

  it('partyMembers snapshot 不会因 gs.partyMembers 后续变化被改', () => {
    const gs = createEquipGameState()
    const state = createEquipMenu(gs, equipmentCatalog)
    gs.partyMembers.reverse()
    expect(state.partyMembers).toEqual([0, 1, 2])
  })
})

describe('confirmEquipItem list → pick-role', () => {
  it('从 list cursor 取 itemId 进 pick-role', () => {
    const gs = createEquipGameState()
    const state = createEquipMenu(gs, equipmentCatalog)
    state.list.cursor = 1 // 短刀 id 106
    confirmEquipItem(state, equipmentCatalog)
    expect(state.phase).toBe('pick-role')
    expect(state.selectedItemId).toBe(106)
    expect(state.playerCursor).toBe(0)
  })

  it('cursor 停在非可装备项(观音符 200,红色)→ Confirm no-op,停 list', () => {
    // sdlpal itemmenu.c:287-291 真值:确认时 `wFlags & g_wItemFlags` 不命中 → 返回 0xFFFF(未确认),
    // 留在菜单。列表全显示后,光标可落在非可装备项上,但确认它不该进 pick-role。
    const gs = createEquipGameState()
    const state = createEquipMenu(gs, equipmentCatalog)
    // 列表 = [105, 106, 200, 201];观音符 200 在 index 2
    state.list.cursor = 2
    confirmEquipItem(state, equipmentCatalog)
    expect(state.phase).toBe('list')
    expect(state.selectedItemId).toBeUndefined()
  })

  it('从空 list noop(防 cursor 越界 crash)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = []
    gs.partyMembers = [0]
    const state = createEquipMenu(gs, equipmentCatalog)
    confirmEquipItem(state, equipmentCatalog)
    expect(state.phase).toBe('list')
  })

  it('phase=pick-role 时 confirmEquipItem 不再变 phase', () => {
    const gs = createEquipGameState()
    const state = createEquipMenu(gs, equipmentCatalog)
    state.phase = 'pick-role'
    state.selectedItemId = 106
    confirmEquipItem(state, equipmentCatalog)
    expect(state.phase).toBe('pick-role')
    expect(state.selectedItemId).toBe(106) // 没被覆盖
  })
})

describe('confirmEquipRole', () => {
  it('返回 {itemId, roleId} 由 dispatcher 跑 scriptOnEquip', () => {
    const state = createEquipMenu(createEquipGameState(), equipmentCatalog)
    state.phase = 'pick-role'
    state.selectedItemId = 105
    state.playerCursor = 1 // 赵灵儿(roleId=1)
    const picked = confirmEquipRole(state)
    expect(picked).toEqual({ itemId: 105, roleId: 1 })
  })

  it('phase=list 时返回 null(防过早调用)', () => {
    const state = createEquipMenu(createEquipGameState(), equipmentCatalog)
    expect(confirmEquipRole(state)).toBeNull()
  })

  it('selectedItemId=undefined 时返回 null', () => {
    const state = createEquipMenu(createEquipGameState(), equipmentCatalog)
    state.phase = 'pick-role'
    expect(confirmEquipRole(state)).toBeNull()
  })
})

describe('cancelEquipMenu', () => {
  it('pick-role → list,reset selectedItemId + playerCursor(sdlpal Menu key 真值)', () => {
    const state = createEquipMenu(createEquipGameState(), equipmentCatalog)
    state.phase = 'pick-role'
    state.selectedItemId = 105
    state.playerCursor = 2
    cancelEquipMenu(state)
    expect(state.phase).toBe('list')
    expect(state.selectedItemId).toBeUndefined()
    expect(state.playerCursor).toBe(0)
  })

  it('list → done(关菜单)', () => {
    const state = createEquipMenu(createEquipGameState(), equipmentCatalog)
    cancelEquipMenu(state)
    expect(state.phase).toBe('done')
  })
})

describe('equipMoveUp/Down playerCursor wrap(sdlpal uigame.c:2021-2035)', () => {
  it('Up wrap to wMaxPartyMemberIndex', () => {
    const state = createEquipMenu(createEquipGameState(), equipmentCatalog)
    state.phase = 'pick-role'
    state.playerCursor = 0
    equipMoveUp(state)
    expect(state.playerCursor).toBe(2) // partyMembers.length - 1
  })

  it('Down wrap to 0', () => {
    const state = createEquipMenu(createEquipGameState(), equipmentCatalog)
    state.phase = 'pick-role'
    state.playerCursor = 2
    equipMoveDown(state)
    expect(state.playerCursor).toBe(0)
  })

  it('Up/Down 在 phase=list 时 noop(dispatcher 走 inventoryMove*)', () => {
    const state = createEquipMenu(createEquipGameState(), equipmentCatalog)
    expect(state.phase).toBe('list')
    state.playerCursor = 0
    equipMoveUp(state)
    expect(state.playerCursor).toBe(0) // 没变
    equipMoveDown(state)
    expect(state.playerCursor).toBe(0)
  })

  it('多次 Up/Down 循环 wrap', () => {
    const state = createEquipMenu(createEquipGameState(), equipmentCatalog)
    state.phase = 'pick-role'
    state.playerCursor = 0
    for (let i = 0; i < 5; i++) equipMoveDown(state)
    // 0 → 1 → 2 → 0 → 1 → 2
    expect(state.playerCursor).toBe(2)
  })
})

const requestCatalog: Item[] = [
  equipmentItem(105, 'item-105', 105, {
    equipable: true,
    equipableBy: [true, true, true, true, true, true],
  }),
  equipmentItem(106, 'item-106', 106, {
    equipable: true,
    equipableBy: [true, true, true, true, true, true],
  }),
]

function gameStateWithInventory(
  inventory: Array<{ itemId: number; count: number; inUse?: number }>,
) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.inventory = inventory
  gs.partyMembers = [2, 0]
  return gs
}

describe('Equipment requests and ownership', () => {
  it('inUse 耗尽拒绝；party[2,0] 返回 roleId 非 cursor；意图不改装备/钱/库存', () => {
    const gs = gameStateWithInventory([
      { itemId: 105, count: 2, inUse: 2 }, // 耗尽
      { itemId: 106, count: 1, inUse: 0 },
    ])
    gs.dwCash = 123
    const gsSnapshot = structuredClone({
      inventory: gs.inventory,
      party: gs.partyMembers,
      equipment: gs.PlayerRolesRuntime.rgwEquipment,
      cash: gs.dwCash,
    })
    const state = createEquipMenu(gs, requestCatalog)
    state.list.cursor = 0
    confirmEquipItem(state, requestCatalog)
    expect(state.phase).toBe('list') // 耗尽 no-op
    state.list.cursor = 1
    confirmEquipItem(state, requestCatalog)
    expect(state.phase).toBe('pick-role')
    expect(state.selectedItemId).toBe(106)
    equipMoveDown(state) // cursor 0 → 1（第二位 = roleId 0）
    expect(confirmEquipRole(state)).toEqual({ itemId: 106, roleId: 0 }) // roleId 非 cursor
    // 意图合同：装备/库存/队伍实参零变化
    expect({
      inventory: gs.inventory,
      party: gs.partyMembers,
      equipment: gs.PlayerRolesRuntime.rgwEquipment,
      cash: gs.dwCash,
    }).toEqual(gsSnapshot)
  })
  it('cancel 复位 playerCursor/selectedItemId；错 phase 零请求', () => {
    const gs = gameStateWithInventory([{ itemId: 106, count: 1 }])
    const state = createEquipMenu(gs, requestCatalog)
    expect(confirmEquipRole(state)).toBeNull() // list 阶段无请求
    state.list.cursor = 0
    confirmEquipItem(state, requestCatalog)
    equipMoveDown(state)
    cancelEquipMenu(state)
    expect(state.phase).toBe('list')
    expect(state.selectedItemId).toBeUndefined()
    expect(state.playerCursor).toBe(0) // 复位
    cancelEquipMenu(state)
    expect(state.phase).toBe('done')
    // done 阶段 Confirm 无副作用：同一 state 调用前后完整相等（错写 phase 即红）
    const doneSnapshot = structuredClone(state)
    confirmEquipItem(state, requestCatalog)
    expect(state).toEqual(doneSnapshot)
    state.phase = 'pick-role'
    state.selectedItemId = undefined
    expect(confirmEquipRole(state)).toBeNull()
  })
})

const singleRoleCatalog: Item[] = [
  equipmentItem(105, '木剑', 0, {
    equipable: true,
    equipableBy: [true, true, true, true, true, true],
  }),
]

function singleRoleGameState(): ReturnType<typeof createInitialGameState> {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0]
  gs.inventory = [{ itemId: 105, count: 1 }]
  return gs
}

describe('Equipment state boundaries', () => {
  // C5 排重(2026-10-15)：原首测 filter/phase/cursor 三断言已被主测试
  // '.list 是 InventoryMenuState'（filter+phase）与 '初始 phase=list,playerCursor=0' 覆盖，删除。

  it('库存条目 itemId 不在目录 → confirmEquipItem no-op 留 list（!item 分支）', () => {
    const gs = singleRoleGameState()
    gs.inventory = [{ itemId: 777, count: 1 }] // 目录外
    const state = createEquipMenu(gs, singleRoleCatalog)
    state.list.cursor = 0
    confirmEquipItem(state, singleRoleCatalog)
    expect(state.phase).toBe('list')
    expect(state.selectedItemId).toBeUndefined()
  })

  it('done 相：equipMoveUp/Down 与 cancelEquipMenu 零触达', () => {
    const state = createEquipMenu(singleRoleGameState(), singleRoleCatalog)
    state.list.cursor = 0
    confirmEquipItem(state, singleRoleCatalog)
    cancelEquipMenu(state) // pick-role → list
    expect(state.phase).toBe('list')
    cancelEquipMenu(state) // list → done
    expect(state.phase).toBe('done')
    const snapshot = structuredClone(state)
    equipMoveUp(state)
    equipMoveDown(state)
    cancelEquipMenu(state)
    expect(state).toEqual(snapshot)
  })

  it('单人队 pick-role：Down/Up 环绕自返（wMaxPartyMemberIndex=0）', () => {
    const state = createEquipMenu(singleRoleGameState(), singleRoleCatalog)
    state.list.cursor = 0
    confirmEquipItem(state, singleRoleCatalog)
    expect(state.phase).toBe('pick-role')
    equipMoveDown(state)
    expect(state.playerCursor).toBe(0)
    equipMoveUp(state)
    expect(state.playerCursor).toBe(0)
  })
})
