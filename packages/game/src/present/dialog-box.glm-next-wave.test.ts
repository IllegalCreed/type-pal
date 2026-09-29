/** GLM Wave I / I03 — dialog-box.ts 姓名 title / 正文清屏未证公开合同(生产冻结 ced193f4)。
 *
 * 旧证去重:dialog-box.test.ts 已证 parseDialogText / startDialogLine / appendDialogLine /
 * tickDialog(wall-clock)/ confirmDialog / getDialogBoxRect / getDialogTextPos /
 * drawDialogBox / portrait / key icon / MAX_LINES_PER_PAGE;present.test.ts +
 * event-dialogue-pagination.test.ts 已证 setWaitingPageKey / shouldWaitPageKey /
 * setWaitingEndKey / presentFrame / presentBattleFrame / applyDialogIconPaletteShift。
 * present.ts 侧无新增合法缺口:flushToCanvas 是 framebuffer.toImageData 的 2 行包装,
 * toImageData 索引→RGBA 已由 framebuffer.test.ts 直证、putImageData 消费由全部 shell
 * 播放器测试直证 → 登记 existing-proof。
 * 本文件补齐零覆盖导出:
 *  - getDialogTitlePos(sdlpal text.c:1316/1340 姓名 title 位置,4 style × 有无头像)
 *  - isCharacterNameLine(sdlpal text.c:1717-1719 三种冒号真值)
 *  - resetDialogBody(sdlpal PAL_ClearDialog 等价:清正文、留 title/portrait/style)
 */

import type { DialogBoxStyle } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  appendDialogLine,
  getDialogTitlePos,
  isCharacterNameLine,
  resetDialogBody,
  startDialogLine,
  type TextPos,
} from './dialog-box.js'

describe('getDialogTitlePos(sdlpal text.c:1316/1340 title 独立于正文位置)', () => {
  const rows: Array<[string, DialogBoxStyle, boolean, TextPos]> = [
    ['top + 头像', 'top', true, { x: 80, y: 8 }],
    ['top 无头像', 'top', false, { x: 12, y: 8 }],
    ['center(一般不用 title,sdlpal default)', 'center', true, { x: 12, y: 8 }],
    ['bottom + 头像', 'bottom', true, { x: 4, y: 108 }],
    ['bottom 无头像', 'bottom', false, { x: 12, y: 108 }],
    ['narration 同 bottom 档', 'narration', false, { x: 12, y: 108 }],
  ]
  it.each(rows)('%s → %j', (_name, style, hasPortrait, pos) => {
    expect(getDialogTitlePos(style, hasPortrait)).toEqual(pos)
  })
})

describe('isCharacterNameLine(sdlpal text.c:1717-1719 三种冒号结尾判姓名)', () => {
  it.each([
    ['半角冒号(U+003A)', '李逍遥:', true],
    ['全角冒号(U+FF1A)', '李逍遥\uFF1A', true],
    ['ratio 冒号(U+2236)', '李逍遥\u2236', true],
    ['非冒号结尾', '李逍遥来了', false],
    ['冒号在中间', '李:逍遥', false],
    ['空串', '', false],
  ])('%s → %s', (_name, text, expected) => {
    expect(isCharacterNameLine(text)).toBe(expected)
  })
})

describe('resetDialogBody(sdlpal PAL_ClearDialog 等价:清正文不擦 title/portrait)', () => {
  it('清 shownLines/current/计数/typing 态 → line-done;保留 titleText/portraitIcon/style/fontColor', () => {
    const state = startDialogLine('李逍遥:', { style: 'top', portraitIcon: 7 })
    expect(state.titleText).toBe('李逍遥:') // 前提:姓名行走 title 路径

    appendDialogLine(state, '正文第一句')
    appendDialogLine(state, '正文第二句')
    expect(state.shownLines).toEqual(['正文第一句'])
    expect(state.dialogLineCount).toBe(2)

    resetDialogBody(state)

    // 正文/翻页态全清:
    expect(state.shownLines).toEqual([])
    expect(state.shownLineColors).toEqual([])
    expect(state.currentLineText).toBeNull()
    expect(state.currentLineColors).toBeUndefined()
    expect(state.currentLineRevealAt).toBeUndefined()
    expect(state.dialogLineCount).toBe(0)
    expect(state.typingFrames).toBe(0)
    expect(state.charsRevealed).toBe(0)
    expect(state.phase).toBe('line-done')
    expect(state.keyIconBlink).toBe(false)
    // title/portrait/style/fontColor 保留(sdlpal text.c:1775:ClearDialog 不擦 title/portrait):
    expect(state.titleText).toBe('李逍遥:')
    expect(state.portraitIcon).toBe(7)
    expect(state.style).toBe('top')
    expect(state.fontColor).toBeDefined()
  })
})
