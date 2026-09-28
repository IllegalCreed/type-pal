/**
 * TEST-GLM-PHASE1-LEAVES-3 L04（in-game-menu.ts）— 去重表：
 *  - in-game-menu.test（真 WORD id/词表 label/顺序/defaultCursor 记忆/Down 序列/Up/越界）→ 不重复
 *  - in-game-menu.boundaries.test（SystemMenu 三相状态字段/choice 按 id）→ 不重复
 *  - 新差异：两菜单首尾环绕（cursor 0 Up→末项、末项 Down→0）、SystemMenu 词表文案、
 *    负 defaultCursor 与 SystemMenu 越界 defaultCursor 归 0。
 * 锚：sdlpal uigame.c:961-966（InGame）/ 543-552（System PAL_CLASSIC 5 项）。
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

describe('L04 InGameMenu 首尾环绕', () => {
  afterEach(() => setWordTable([]))

  it('cursor 0 Up → 末项 system；末项 Down → 0 status', () => {
    const s = createInGameMenu()
    inGameMenuUp(s)
    expect(s.selection.cursor).toBe(3)
    expect(inGameMenuChoice(s)).toBe('system')
    inGameMenuDown(s)
    expect(s.selection.cursor).toBe(0)
    expect(inGameMenuChoice(s)).toBe('status')
  })

  it('负 defaultCursor 归 0（>0 守卫对负值不生效的合法输入）', () => {
    expect(createInGameMenu(-1).selection.cursor).toBe(0)
    expect(createSystemMenu(-1).selection.cursor).toBe(0)
  })
})

describe('L04 SystemMenu 剩余合同', () => {
  afterEach(() => setWordTable([]))

  it('cursor 0 Up → quit；quit Down → save（5 项环绕）', () => {
    const s = createSystemMenu()
    systemMenuUp(s)
    expect(s.selection.cursor).toBe(4)
    expect(systemMenuChoice(s)).toBe('quit')
    systemMenuDown(s)
    expect(s.selection.cursor).toBe(0)
    expect(systemMenuChoice(s)).toBe('save')
  })

  it('defaultCursor 越上界 → 归 0；词表载入取 flat[11..15] 文案', () => {
    expect(createSystemMenu(99).selection.cursor).toBe(0)
    const flat: string[] = []
    flat[11] = '存档X'
    flat[12] = '读档X'
    flat[13] = '音乐X'
    flat[14] = '音效X'
    flat[15] = '退出X'
    setWordTable(flat)
    const s = createSystemMenu()
    expect(s.selection.items.map((it) => it.label)).toEqual([
      '存档X',
      '读档X',
      '音乐X',
      '音效X',
      '退出X',
    ])
  })
})
