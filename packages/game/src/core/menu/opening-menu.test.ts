import { describe, expect, it } from 'vitest'
import {
  createOpeningMenu,
  openingMenuChoice,
  openingMenuDown,
  openingMenuLabels,
  openingMenuUp,
  type OpeningMenuChoice,
} from './opening-menu.js'

describe('opening-menu state machine — sdlpal uigame.c:42-167 PAL_OpeningMenu', () => {
  it('createOpeningMenu 起手:2 项 fixed + cursor=0(新游戏)— sdlpal wDefaultItem=0 真值', () => {
    const s = createOpeningMenu()
    expect(s.selection.items).toHaveLength(2)
    expect(s.selection.cursor).toBe(0)
    expect(openingMenuChoice(s)).toBe<OpeningMenuChoice>('new-game')
  })

  it('Down 一次 → cursor=1(读取存档)', () => {
    const s = createOpeningMenu()
    openingMenuDown(s)
    expect(s.selection.cursor).toBe(1)
    expect(openingMenuChoice(s)).toBe<OpeningMenuChoice>('load-game')
  })

  it('Down 两次 → wrap 回 cursor=0(sdlpal ui.c:512-515 真值循环)', () => {
    const s = createOpeningMenu()
    openingMenuDown(s)
    openingMenuDown(s)
    expect(s.selection.cursor).toBe(0)
  })

  it('Up 从 cursor=0 → wrap 到 cursor=1(sdlpal ui.c:565-572 真值循环)', () => {
    const s = createOpeningMenu()
    openingMenuUp(s)
    expect(s.selection.cursor).toBe(1)
  })

  it('Down + Up → 来回 0↔1', () => {
    const s = createOpeningMenu()
    openingMenuDown(s)
    expect(s.selection.cursor).toBe(1)
    openingMenuUp(s)
    expect(s.selection.cursor).toBe(0)
    expect(openingMenuChoice(s)).toBe<OpeningMenuChoice>('new-game')
  })

  it('openingMenuLabels 暴露 2 项 + 真 WORD id 7/8 给渲染层(ui.h:48-49 MAINMENU_LABEL)', () => {
    const labels = openingMenuLabels()
    expect(labels).toHaveLength(2)
    expect(labels[0]!.id).toBe(7) // MAINMENU_LABEL_NEWGAME
    expect(labels[1]!.id).toBe(8) // MAINMENU_LABEL_LOADGAME
    expect(labels[0]!.label).not.toBe('') // 表未载 → fallback '新的故事'(非空)
    expect(labels[1]!.label).not.toBe('')
  })
})
