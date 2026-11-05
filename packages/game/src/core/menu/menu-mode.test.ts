import type { AbstractKey, InputSnapshot } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { makeRoleRecord } from '../../__tests__/battle-records.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../game-state.js'
import { createInGameMenu, createSystemMenu } from './in-game-menu.js'
import { createInventoryMenu } from './inventory-menu.js'
import { setMenuCatalogs } from './menu-driver.js'
import { closeTopMenu, openMenu, tickMenu } from './menu-mode.js'

const MOCK_CATALOGS = {
  items: [],
  spells: [],
  magics: [],
  playerRoles: { roles: [] },
}

beforeEach(() => {
  setMenuCatalogs(MOCK_CATALOGS)
})
// The public setter has no uninstall operation; return to this isolated file's empty baseline.
afterEach(() => setMenuCatalogs(MOCK_CATALOGS))

function snap(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

describe('Menu mode dispatch and return', () => {
  it('menuStack 空 → 切回 explore mode', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'menu'
    gs.menuStack = []
    tickMenu(gs, snap())
    expect(gs.mode).toBe('explore')
  })

  it('按 Menu 键 → pop 栈顶 + 栈空时切回 explore', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    expect(gs.mode).toBe('menu')
    expect(gs.menuStack.length).toBe(1)
    tickMenu(gs, snap(['Menu']))
    expect(gs.menuStack.length).toBe(0)
    expect(gs.mode).toBe('explore')
  })

  it('hub 同帧收到取消与确认时先关栈，不打开状态页', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const playerRoles = { roles: [makeRoleRecord(0)] }
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
    setMenuCatalogs({ ...MOCK_CATALOGS, playerRoles })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    expect(gs.mode).toBe('menu')
    tickMenu(gs, snap(['Menu', 'Confirm']))
    expect(gs.menuStack).toHaveLength(0)
    expect(gs.mode).toBe('explore')
  })

  it('栈非空 + 无 Menu 键 → mode 保持 menu(等待子菜单 dispatcher)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    tickMenu(gs, snap(['Up']))
    expect(gs.menuStack.length).toBe(1)
    expect(gs.mode).toBe('menu')
  })

  it('栈两层(hub+system)+ Menu 键 → pop 一层(仍在 menu mode;sdlpal SystemMenu CANCELLED 留 hub)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'system', state: createSystemMenu() })
    expect(gs.menuStack.length).toBe(2)
    tickMenu(gs, snap(['Menu']))
    expect(gs.menuStack.length).toBe(1)
    expect(gs.menuStack[0]?.kind).toBe('in-game')
    expect(gs.mode).toBe('menu')
  })

  it('物品列表 Menu 键 → 关整个菜单栈(uigame.c:1024-1026)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'inventory', state: createInventoryMenu(gs, []) })
    tickMenu(gs, snap(['Menu']))
    expect(gs.menuStack.length).toBe(0)
  })
})

describe('openMenu / closeTopMenu', () => {
  it('openMenu push + 切 menu mode', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.mode).toBe('explore')
    openMenu(gs, { kind: 'inventory', state: createInventoryMenu(gs, []) })
    expect(gs.mode).toBe('menu')
    expect(gs.menuStack[0]?.kind).toBe('inventory')
  })

  it('closeTopMenu pop(不切 mode — 留 tickMenu 下帧处理)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    closeTopMenu(gs)
    expect(gs.menuStack.length).toBe(0)
    // mode 仍是 'menu' — tickMenu 下一帧检查空栈才切回 explore
    expect(gs.mode).toBe('menu')
  })
})
