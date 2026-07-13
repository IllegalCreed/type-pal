/**
 * InGameMenu + SystemMenu state machine 单测 —
 * sdlpal uigame.c:944-1048(InGame)/ 516-651(System) 真值。
 */

import { afterEach, describe, expect, it } from 'vitest'
import { setWordTable } from '../word-lookup.js'
import {
  createInGameMenu,
  createSystemMenu,
  inGameMenuChoice,
  inGameMenuDown,
  inGameMenuUp,
  systemMenuChoice,
  systemMenuDown,
  systemMenuUp,
} from './in-game-menu.js'

// C1/C2(getWord 重构):菜单项 id 必须是**真 WORD id**(ui.h GAMEMENU/SYSMENU),不是 0-based 下标;
//   label 由 getWord(id) 取(WORD.DAT 单一文案源),表未载时退回硬编码 fallback(故旧 label 测仍绿)。
describe('菜单项 id = 真 WORD id + label 由 getWord 取(ui.h:61-70 / words.json flat)', () => {
  afterEach(() => setWordTable([])) // 隔离词表

  it('InGameMenu id = GAMEMENU_LABEL 真值 [3,4,5,6](状态/仙术/物品/系统)', () => {
    const s = createInGameMenu()
    expect(s.selection.items.map((it) => it.id)).toEqual([3, 4, 5, 6])
  })

  it('SystemMenu id = SYSMENU_LABEL 真值 [11,12,13,14,15]', () => {
    const s = createSystemMenu()
    expect(s.selection.items.map((it) => it.id)).toEqual([11, 12, 13, 14, 15])
  })

  it('词表载入 → label 取 flat[id](WORD.DAT 单一源)', () => {
    const flat: string[] = []
    flat[3] = '状态X'
    flat[4] = '仙术X'
    flat[5] = '物品X'
    flat[6] = '系统X'
    setWordTable(flat)
    const s = createInGameMenu()
    expect(s.selection.items.map((it) => it.label)).toEqual(['状态X', '仙术X', '物品X', '系统X'])
  })

  it('choice 反查在真 id 下仍正确(id 改值不破坏 choice 映射)', () => {
    expect(inGameMenuChoice(createInGameMenu(3))).toBe('system') // cursor 3 = 系统
    expect(systemMenuChoice(createSystemMenu(4))).toBe('quit') // cursor 4 = 结束游戏
  })
})

describe('InGameMenu(主菜单 — 状态/仙术/物品/系统)', () => {
  it('4 项真值顺序(sdlpal uigame.c:961-966)', () => {
    const s = createInGameMenu()
    expect(s.selection.items.map((it) => it.label)).toEqual(['状态', '仙术', '物品', '系统'])
  })

  it('默认 cursor=0 → choice "status"', () => {
    const s = createInGameMenu()
    expect(inGameMenuChoice(s)).toBe('status')
  })

  it('defaultCursor 起手记忆(sdlpal iCurMainMenuItem 真值)', () => {
    const s = createInGameMenu(2)
    expect(s.selection.cursor).toBe(2)
    expect(inGameMenuChoice(s)).toBe('inventory')
  })

  it('Down 推进:状态 → 仙术 → 物品 → 系统', () => {
    const s = createInGameMenu()
    inGameMenuDown(s)
    expect(inGameMenuChoice(s)).toBe('magic')
    inGameMenuDown(s)
    expect(inGameMenuChoice(s)).toBe('inventory')
    inGameMenuDown(s)
    expect(inGameMenuChoice(s)).toBe('system')
  })

  it('Up 反推', () => {
    const s = createInGameMenu(3)
    inGameMenuUp(s)
    expect(inGameMenuChoice(s)).toBe('inventory')
  })

  it('defaultCursor 超出 = noop(防越界 crash)', () => {
    const s = createInGameMenu(99)
    expect(s.selection.cursor).toBe(0) // 应保持初始 0
  })
})

describe('SystemMenu(系统菜单 — 储存/读取/音乐/音效/结束)', () => {
  it('5 项真值顺序(sdlpal uigame.c:543-552 PAL_CLASSIC build)', () => {
    const s = createSystemMenu()
    expect(s.selection.items.map((it) => it.label)).toEqual([
      '储存进度',
      '读取进度',
      '音乐',
      '音效',
      '结束游戏',
    ])
  })

  it('choice 序列:save / load / music / sound / quit', () => {
    const s = createSystemMenu()
    expect(systemMenuChoice(s)).toBe('save')
    systemMenuDown(s)
    expect(systemMenuChoice(s)).toBe('load')
    systemMenuDown(s)
    expect(systemMenuChoice(s)).toBe('music')
    systemMenuDown(s)
    expect(systemMenuChoice(s)).toBe('sound')
    systemMenuDown(s)
    expect(systemMenuChoice(s)).toBe('quit')
  })

  it('defaultCursor 记忆(sdlpal iCurSystemMenuItem 真值)', () => {
    const s = createSystemMenu(4)
    expect(systemMenuChoice(s)).toBe('quit')
  })

  it('Up 反推', () => {
    const s = createSystemMenu(2)
    systemMenuUp(s)
    expect(systemMenuChoice(s)).toBe('load')
  })
})
