/**
 * TEST-GLM-PHASE1-LEAVES-3 L06（opening-menu.ts）— 去重表：
 *  - opening-menu.test（2 项起手/Down/Up wrap/labels 暴露真 WORD id 7/8）→ 不重复
 *  - 新差异：openingMenuChoice 的 'new-game'/'load-game' 映射值、词表载入后 menu items 与
 *    openingMenuLabels 同步取 flat[7]/flat[8]、空表 choice 防御 undefined。
 * 锚：sdlpal uigame.c:105-109（value 0/1）+ ui.h:48-49（MAINMENU_LABEL 7/8）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { setWordTable } from '../word-lookup.js'
import {
  createOpeningMenu,
  openingMenuChoice,
  openingMenuDown,
  openingMenuLabels,
  openingMenuUp,
} from './opening-menu.js'

describe('L06 OpeningMenu 剩余合同', () => {
  afterEach(() => setWordTable([]))

  it('choice 映射：cursor 0 → new-game，Down → load-game（uigame.c value 0/1 语义）', () => {
    const s = createOpeningMenu()
    expect(openingMenuChoice(s)).toBe('new-game')
    openingMenuDown(s)
    expect(openingMenuChoice(s)).toBe('load-game')
    openingMenuUp(s)
    expect(openingMenuChoice(s)).toBe('new-game')
  })

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
