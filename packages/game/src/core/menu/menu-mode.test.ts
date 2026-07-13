import type { AbstractKey, InputSnapshot, Item, Magic, PlayerRoles, Spell } from '@type-pal/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { createCommandBus } from '../command-bus.js'
import { createInitialGameState } from '../game-state.js'
import { createInGameMenu, createSystemMenu } from './in-game-menu.js'
import { setMenuCatalogs } from './menu-driver.js'
import { closeTopMenu, openMenu, tickMenu } from './menu-mode.js'

const MOCK_CATALOGS = {
  items: [] as Item[],
  spells: [] as Spell[],
  magics: [] as Magic[],
  playerRoles: { roles: [] } as unknown as PlayerRoles,
}

beforeEach(() => {
  setMenuCatalogs(MOCK_CATALOGS)
})

function snap(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

describe('M5.6 W0.a tickMenu 骨架', () => {
  it('menuStack 空 → 切回 explore mode', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'menu'
    gs.menuStack = []
    tickMenu(gs, snap(), createCommandBus())
    expect(gs.mode).toBe('explore')
  })

  it('按 Menu 键 → pop 栈顶 + 栈空时切回 explore', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    expect(gs.mode).toBe('menu')
    expect(gs.menuStack.length).toBe(1)
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
    expect(gs.mode).toBe('explore')
  })

  it('栈非空 + 无 Menu 键 → mode 保持 menu(等待子菜单 dispatcher)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    tickMenu(gs, snap(['Up']), createCommandBus())
    expect(gs.menuStack.length).toBe(1)
    expect(gs.mode).toBe('menu')
  })

  it('栈两层(hub+system)+ Menu 键 → pop 一层(仍在 menu mode;sdlpal SystemMenu CANCELLED 留 hub)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'system', state: createSystemMenu() })
    expect(gs.menuStack.length).toBe(2)
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(1)
    expect(gs.menuStack[0]?.kind).toBe('in-game')
    expect(gs.mode).toBe('menu')
  })

  it('DH9:物品列表 Menu 键 → goto out 关整个菜单栈(uigame.c:1024-1026,非 pop 回 hub)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'inventory', state: { phase: 'list' } })
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })
})

describe('openMenu / closeTopMenu', () => {
  it('openMenu push + 切 menu mode', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.mode).toBe('explore')
    openMenu(gs, { kind: 'inventory', state: {} })
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
