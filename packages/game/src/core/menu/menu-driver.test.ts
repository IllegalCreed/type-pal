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
