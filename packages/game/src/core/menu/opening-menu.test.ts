import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { setWordTable } from '../word-lookup.js'
import {
  createOpeningMenu,
  type OpeningMenuChoice,
  openingMenuChoice,
  openingMenuDown,
  openingMenuLabels,
  openingMenuUp,
} from './opening-menu.js'

let releaseMenuText: (() => void) | undefined

beforeEach(() => {
  releaseMenuText = beginChineseMenuText()
})

afterEach(() => {
  releaseMenuText?.()
  releaseMenuText = undefined
})

describe('Opening menu state', () => {
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
    expect(labels.map(({ label }) => label)).toEqual(['新的故事', '旧的回忆'])
  })
})

describe('Opening menu words and empty state', () => {
  // C5 排重(2026-10-15)：原"choice 映射 new→load→new"条与主测试
  // 'createOpeningMenu 起手 new-game'/'Down 一次 → load-game'/'Down + Up → 来回'三面
  // 完全重复，删除；本文件保留词表注入同步与空表防御两条新差异轴。

  it('词表载入：菜单 items 与 openingMenuLabels 同取 flat[7]/flat[8]（单一文案源）', () => {
    const flat: string[] = []
    flat[7] = '新的故事X'
    flat[8] = '旧的回忆X'
    setWordTable(flat)
    const s = createOpeningMenu()
    expect(s.selection.items.map((it) => it.label)).toEqual(['新的故事X', '旧的回忆X'])
    expect(openingMenuLabels().map((l) => l.label)).toEqual(['新的故事X', '旧的回忆X'])
    expect(openingMenuLabels().map((l) => l.id)).toEqual([7, 8])
  })

  it('空表 choice 防御 undefined（直造状态可达）', () => {
    const s = createOpeningMenu()
    s.selection.items = []
    expect(openingMenuChoice(s)).toBeUndefined()
  })
})
