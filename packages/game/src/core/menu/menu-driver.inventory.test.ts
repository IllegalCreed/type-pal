/** Input routing for inventory/action/equipment, target navigation and script handoff. Catalog data is synthetic, scripts resolve to explicit end labels. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setGlobalEvents } from '../event-system.js'
import type { GameState } from '../game-state.js'
import { createEquipMenu } from './equip-menu.js'
import { createInGameMenu } from './in-game-menu.js'
import { createInventoryActionMenu } from './inventory-action-menu.js'
import { createInventoryMenu } from './inventory-menu.js'
import { dispatchMenuInput, setMenuCatalogs } from './menu-driver.js'
import {
  createMenuGameState,
  defaultMenuCatalogs,
  installNoopMenuScripts,
  menuInput,
  menuItem,
  menuRoleRecords,
} from './menu-driver.test-fixtures.js'
import { openMenu } from './menu-stack.js'

beforeEach(() => setMenuCatalogs(defaultMenuCatalogs()))
afterEach(() => {
  setGlobalEvents([])
})
describe('物品一级子菜单(inventory-action)', () => {
  it('Menu → 关整栈;Up/Down 位移;Confirm 装备 → equip;Confirm 使用 → inventory', () => {
    const gs = createMenuGameState()
    gs.inventory = [{ itemId: 105, count: 1 }]
    setMenuCatalogs({
      items: [menuItem(105)],
      spells: [],
      magics: [],
      playerRoles: menuRoleRecords(),
    })
    const s = createInventoryActionMenu()
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'inventory-action', state: s })
    dispatchMenuInput(gs, menuInput(['Down']))
    expect(s.selection.cursor).toBe(1)
    dispatchMenuInput(gs, menuInput(['Up']))
    expect(s.selection.cursor).toBe(0)
    dispatchMenuInput(gs, menuInput(['Confirm'])) // 装备
    expect(gs.menuStack[gs.menuStack.length - 1]?.kind).toBe('equip')
    // 使用分支从新的 hub/action 栈开始，不在 equip 上叠加另一层 action。
    const gs2 = createMenuGameState()
    openMenu(gs2, { kind: 'in-game', state: createInGameMenu() })
    const s2 = createInventoryActionMenu()
    openMenu(gs2, { kind: 'inventory-action', state: s2 })
    dispatchMenuInput(gs2, menuInput(['Down']))
    dispatchMenuInput(gs2, menuInput(['Confirm']))
    expect(gs2.menuStack[gs2.menuStack.length - 1]?.kind).toBe('inventory')
    // Menu 关整栈
    dispatchMenuInput(gs2, menuInput(['Menu']))
    expect(gs2.menuStack).toHaveLength(0)
  })
})
describe('物品菜单(inventory,use 路由)', () => {
  // 导航需要 11 个不同物品；同 id 库存在真实 addItem 入口会合并。
  const items = [
    menuItem(105, { scriptOnUse: 5, flags: { usable: true, consuming: true } }),
    menuItem(107, {
      scriptOnUse: 6,
      flags: { usable: true, applyToAll: true, consuming: true },
    }),
    ...Array.from({ length: 9 }, (_, i) =>
      menuItem(108 + i, { flags: { usable: true, consuming: true } }),
    ),
  ]

  function openUse(gs: GameState): ReturnType<typeof createInventoryMenu> {
    const s = createInventoryMenu(gs, items, 'usable')
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'inventory', state: s })
    return s
  }

  it('list 8 键导航精确落点(11 条库存,列宽 3,PgDn=21 钳尾)+ gs.iCurInvMenuItem 写回', () => {
    const gs = createMenuGameState()
    // 11 条不同 id：前 2 条取关键物品（单体/全体），后 9 条独立 id 补足网格。
    gs.inventory = [items[0]!, items[1]!].map((it) => ({ itemId: it.id, count: 1 }))
    for (let i = 0; i < 9; i++) gs.inventory.push({ itemId: 108 + i, count: 1 }) // 11 条不同 id(0..10)
    const s = openUse(gs)
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: menuRoleRecords() })
    dispatchMenuInput(gs, menuInput(['Down']))
    expect(s.cursor).toBe(3)
    dispatchMenuInput(gs, menuInput(['Right']))
    expect(s.cursor).toBe(4)
    dispatchMenuInput(gs, menuInput(['Left']))
    expect(s.cursor).toBe(3)
    dispatchMenuInput(gs, menuInput(['End']))
    expect(s.cursor).toBe(10)
    dispatchMenuInput(gs, menuInput(['Home']))
    expect(s.cursor).toBe(0)
    dispatchMenuInput(gs, menuInput(['PgDn']))
    expect(s.cursor).toBe(10)
    dispatchMenuInput(gs, menuInput(['PgUp']))
    expect(s.cursor).toBe(0)
    dispatchMenuInput(gs, menuInput(['Up']))
    expect(s.cursor).toBe(0)
    expect(gs.iCurInvMenuItem).toBe(0)
  })

  it('Confirm 可用单体物 → use-target;Left/Right 换目标;Menu 回 list;再 Menu 关整栈', () => {
    const gs = createMenuGameState()
    gs.inventory = [{ itemId: 105, count: 2 }]
    const s = openUse(gs)
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: menuRoleRecords() })
    installNoopMenuScripts()
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('use-target')
    expect(s.targetMenu!.cursor).toBe(0) // 使用目标初始选中队首
    dispatchMenuInput(gs, menuInput(['Right']))
    expect(s.targetMenu!.cursor).toBe(1) // 双人队 → wrap 到 1
    dispatchMenuInput(gs, menuInput(['Left']))
    expect(s.targetMenu!.cursor).toBe(0)
    dispatchMenuInput(gs, menuInput(['Menu']))
    expect(s.phase).toBe('list')
    dispatchMenuInput(gs, menuInput(['Menu']))
    expect(gs.menuStack).toHaveLength(0)
  })

  it('applyToAll 可用物 Confirm → 起世界脚本(mode=event)并 return', () => {
    const gs = createMenuGameState()
    gs.inventory = [{ itemId: 107, count: 1 }]
    openUse(gs)
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: menuRoleRecords() })
    installNoopMenuScripts()
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.currentEventObjectId).toBe(0xffff)
    expect(gs.menuStack).toHaveLength(2) // in-game + inventory;关闭由脚本结束 restoreMode 做,不在本帧
  })
})
describe('装备菜单(equip)', () => {
  const items = [menuItem(115, { scriptOnEquip: 7, flags: { equipable: true } })]

  it('list 导航 + Confirm → pick-role 且 wLastUnequippedItem=选中物', () => {
    const gs = createMenuGameState()
    gs.inventory = [{ itemId: 115, count: 1 }]
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: menuRoleRecords() })
    const s = createEquipMenu(gs, items)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'equip', state: s })
    installNoopMenuScripts()
    dispatchMenuInput(gs, menuInput(['Down']))
    dispatchMenuInput(gs, menuInput(['Up']))
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('pick-role')
    expect(gs.wLastUnequippedItem).toBe(115)
    // pick-role:Up/Down 位移(双人队 wrap)
    dispatchMenuInput(gs, menuInput(['Down']))
    expect(s.playerCursor).toBe(1)
    dispatchMenuInput(gs, menuInput(['Up']))
    expect(s.playerCursor).toBe(0)
    // Menu:pick-role → list 回退 + 重建
    dispatchMenuInput(gs, menuInput(['Menu']))
    expect(s.phase).toBe('list')
    dispatchMenuInput(gs, menuInput(['Menu']))
    expect(gs.menuStack).toHaveLength(0)
  })

  it('pick-role Confirm 可装备角色 → 跑 scriptOnEquip 后仍 pick-role(换出旧物=同物)', () => {
    const gs = createMenuGameState()
    gs.inventory = [{ itemId: 115, count: 1 }]
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: menuRoleRecords() })
    const s = createEquipMenu(gs, items)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'equip', state: s })
    installNoopMenuScripts()
    dispatchMenuInput(gs, menuInput(['Confirm']))
    dispatchMenuInput(gs, menuInput(['Confirm'])) // 确认角色 0
    expect(s.selectedItemId).toBe(115) // 脚本无 0x18 → wLastUnequippedItem 保持入口值
    expect(s.phase).toBe('pick-role')
  })

  it('不可装备角色 Confirm → no-op 留 pick-role', () => {
    const noFit = [
      menuItem(116, {
        scriptOnEquip: 7,
        flags: { equipable: true, equipableBy: [false, false, false, false, false, false] },
      }),
    ]
    const gs = createMenuGameState()
    gs.inventory = [{ itemId: 116, count: 1 }]
    setMenuCatalogs({ items: noFit, spells: [], magics: [], playerRoles: menuRoleRecords() })
    const s = createEquipMenu(gs, noFit)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'equip', state: s })
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('pick-role')
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('pick-role')
    expect(s.selectedItemId).toBe(116)
  })
})
describe('物品目录变化', () => {
  it('equip pick-role 确认时 item 已不在 catalog → 错误返回不动状态(错误返回)', () => {
    const gs = createMenuGameState()
    gs.inventory = [{ itemId: 115, count: 1 }]
    const withItem = [menuItem(115, { scriptOnEquip: 7, flags: { equipable: true } })]
    setMenuCatalogs({ items: withItem, spells: [], magics: [], playerRoles: menuRoleRecords() })
    installNoopMenuScripts()
    const s = createEquipMenu(gs, withItem)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'equip', state: s })
    dispatchMenuInput(gs, menuInput(['Confirm'])) // list → pick-role
    expect(s.phase).toBe('pick-role')
    // catalog 换成空表(确认前物品被移除)
    setMenuCatalogs({ items: [], spells: [], magics: [], playerRoles: menuRoleRecords() })
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('pick-role') // !item → return
    expect(s.selectedItemId).toBe(115) // 不变
  })
})
