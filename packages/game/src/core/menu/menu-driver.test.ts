import { describe, it, expect, beforeEach } from 'vitest'
import type { AbstractKey, InputSnapshot, Item, Magic, PlayerRoles, Spell } from '@type-pal/shared'
import { createCommandBus } from '../command-bus.js'
import { createInitialGameState, type GameState } from '../game-state.js'
import { tickMenu, openMenu } from './menu-mode.js'
import { createInGameMenu, createSystemMenu } from './in-game-menu.js'
import { setMenuCatalogs } from './menu-driver.js'

function snap(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

function mkGs(): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0, 1, 2]
  return gs
}

const MOCK_CATALOGS = {
  items: [] as Item[],
  spells: [] as Spell[],
  magics: [] as Magic[],
  playerRoles: { roles: [] } as unknown as PlayerRoles,
}

beforeEach(() => {
  setMenuCatalogs(MOCK_CATALOGS)
})

describe('M5.6 W0.b dispatchInGameMenu hub', () => {
  it('Up/Down 移动 selection cursor', () => {
    const gs = mkGs()
    const inGame = createInGameMenu()
    openMenu(gs, { kind: 'in-game', state: inGame })
    const before = inGame.selection.cursor
    tickMenu(gs, snap(['Down']), createCommandBus())
    expect(inGame.selection.cursor).not.toBe(before)
  })

  it('Menu 键 → 关 hub + 切回 explore', () => {
    const gs = mkGs()
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
    expect(gs.mode).toBe('explore')
  })

  it('Confirm "system" → push system 子菜单', () => {
    const gs = mkGs()
    const inGame = createInGameMenu()
    // 把 cursor 移到 'system'(默认最后一项;sdlpal IN_GAME_LABELS 末尾 = system)
    while (inGame.selection.cursor < inGame.selection.items.length - 1) {
      inGame.selection.cursor++
    }
    openMenu(gs, { kind: 'in-game', state: inGame })
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(gs.menuStack.length).toBe(2)
    expect(gs.menuStack[1]?.kind).toBe('system')
  })

  it('Confirm "status" → push player-status', () => {
    const gs = mkGs()
    const inGame = createInGameMenu()
    // 找到 'status' label index
    const statusIdx = inGame.selection.items.findIndex((it) => /status|状态/i.test(String(it.id)))
    // 若 label id 不是 status 名字,fallback 用 inGameMenuChoice 直查
    // 这里简化:遍历 cursor 找 choice === 'status'
    while (inGame.selection.cursor < inGame.selection.items.length) {
      const sel = inGame.selection.items[inGame.selection.cursor]
      const label = inGame.selection.items.find((it) => it === sel)?.label ?? ''
      if (label.includes('状态') || statusIdx === inGame.selection.cursor) break
      inGame.selection.cursor++
    }
    // 直接 force status — 用 IN_GAME_LABELS choice 映射验证
    // 用 import 的 createInGameMenu 验证 label/choice 对照表
    // 简化方案:重置 cursor 0..N 逐个 Confirm 直到 kind='player-status'
    inGame.selection.cursor = 0
    openMenu(gs, { kind: 'in-game', state: inGame })
    for (let i = 0; i < inGame.selection.items.length; i++) {
      inGame.selection.cursor = i
      const bus = createCommandBus()
      // 重置 menuStack 顶部为 hub
      gs.menuStack = [{ kind: 'in-game', state: inGame }]
      gs.mode = 'menu'
      tickMenu(gs, snap(['Confirm']), bus)
      if (gs.menuStack.length === 2 && gs.menuStack[1]?.kind === 'player-status') return
    }
    throw new Error('未找到 status 选项触发 player-status 子菜单')
  })
})

describe('M5.6 W0.b dispatchSystemMenu', () => {
  it('Up/Down 移动 + Menu 键关闭', () => {
    const gs = mkGs()
    const sys = createSystemMenu()
    openMenu(gs, { kind: 'system', state: sys })
    tickMenu(gs, snap(['Down']), createCommandBus())
    expect(sys.selection.cursor).not.toBe(0)
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })

  it('Confirm "quit" → 清空 menuStack', () => {
    const gs = mkGs()
    const sys = createSystemMenu()
    sys.selection.cursor = sys.selection.items.length - 1 // quit 在最后
    openMenu(gs, { kind: 'system', state: sys })
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
    expect(gs.mode).toBe('explore')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M5.6 T9:5 sub-menu dispatcher 单测
// ─────────────────────────────────────────────────────────────────────────────

import { createInventoryMenu } from './inventory-menu.js'
import { createEquipMenu } from './equip-menu.js'
import { createInGameMagicMenu } from './in-game-magic-menu.js'
import { createPlayerStatus } from './player-status.js'
import { createSaveSlotMenu } from './save-slot-menu.js'

describe('M5.6 T9 dispatchInventoryMenu', () => {
  it('Menu 键 → close 菜单', () => {
    const gs = mkGs()
    openMenu(gs, { kind: 'inventory', state: createInventoryMenu(gs, []) })
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })

  it('Up/Down → cursor 变 + iCurInvMenuItem 写回', () => {
    const gs = mkGs()
    // 给 inventory + items 让 list 有内容
    gs.inventory = [{ itemId: 1, count: 5 }, { itemId: 2, count: 3 }, { itemId: 3, count: 1 }]
    const items = [
      { id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' },
    ] as unknown as Item[]
    setMenuCatalogs({ ...MOCK_CATALOGS, items })
    const inv = createInventoryMenu(gs, items)
    openMenu(gs, { kind: 'inventory', state: inv })
    tickMenu(gs, snap(['Down']), createCommandBus())
    expect(inv.list.cursor).toBeGreaterThan(0)
    expect(gs.iCurInvMenuItem).toBe(inv.list.cursor)
  })

  it('PgDn → 翻页', () => {
    const gs = mkGs()
    gs.inventory = Array.from({ length: 20 }, (_, i) => ({ itemId: i + 1, count: 1 }))
    const items = gs.inventory.map((e) => ({ id: e.itemId, name: `Item${e.itemId}` })) as unknown as Item[]
    setMenuCatalogs({ ...MOCK_CATALOGS, items })
    const inv = createInventoryMenu(gs, items)
    openMenu(gs, { kind: 'inventory', state: inv })
    const before = inv.list.cursor
    tickMenu(gs, snap(['PgDn']), createCommandBus())
    expect(inv.list.cursor).toBeGreaterThan(before)
  })
})

describe('M5.6 T9 dispatchEquipMenu', () => {
  it('Menu 键 → close', () => {
    const gs = mkGs()
    openMenu(gs, { kind: 'equip', state: createEquipMenu(gs, []) })
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })
})

describe('M5.6 T9 dispatchInGameMagicMenu', () => {
  it('Menu 键 → close', () => {
    const gs = mkGs()
    openMenu(gs, {
      kind: 'in-game-magic',
      state: createInGameMagicMenu(MOCK_CATALOGS.playerRoles, gs.partyMembers, []),
    })
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })
})

describe('M5.6 T9 dispatchPlayerStatusMenu', () => {
  it('Left/Right → 切队员', () => {
    const gs = mkGs()
    gs.partyMembers = [10, 20, 30]
    const ps = createPlayerStatus(gs.partyMembers)
    openMenu(gs, { kind: 'player-status', state: ps })
    tickMenu(gs, snap(['Right']), createCommandBus())
    expect(ps.partyIndex).toBe(1)
    tickMenu(gs, snap(['Left']), createCommandBus())
    expect(ps.partyIndex).toBe(0)
  })

  it('Menu 键 → close', () => {
    const gs = mkGs()
    openMenu(gs, { kind: 'player-status', state: createPlayerStatus(gs.partyMembers) })
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })
})

describe('M5.6 T9 dispatchSaveSlotMenu', () => {
  it('Up/Down → cursor 变', () => {
    const gs = mkGs()
    const ss = createSaveSlotMenu('save')
    openMenu(gs, { kind: 'save-slot', state: ss })
    tickMenu(gs, snap(['Down']), createCommandBus())
    expect(ss.selection.cursor).toBe(1)
  })

  it('Confirm → close save-slot(pop 一层)', () => {
    const gs = mkGs()
    openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('save') })
    expect(gs.menuStack.length).toBe(1)
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(gs.menuStack.length).toBe(0) // 已 pop save-slot
  })
})
