/** Geometry returns only: narration and item-box painters bypass these text/title positions. */
import type { DialogBoxStyle } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { getDialogTextPos, getDialogTitlePos, type TextPos } from './dialog-box.js'

describe('Sync.2 DialogBox · getDialogTextPos(sdlpal text.c:1313-1346 真值)', () => {
  it('top 无 portrait → (44, 26)', () => {
    expect(getDialogTextPos('top', false)).toEqual({ x: 44, y: 26 })
  })

  it('top 有 portrait → (96, 26)', () => {
    expect(getDialogTextPos('top', true)).toEqual({ x: 96, y: 26 })
  })

  it('center → (80, 40),不论 portrait', () => {
    expect(getDialogTextPos('center', false)).toEqual({ x: 80, y: 40 })
    expect(getDialogTextPos('center', true)).toEqual({ x: 80, y: 40 })
  })

  it('bottom 无 portrait → (44, 126)', () => {
    expect(getDialogTextPos('bottom', false)).toEqual({ x: 44, y: 126 })
  })

  it('bottom 有 portrait → (20, 126)', () => {
    expect(getDialogTextPos('bottom', true)).toEqual({ x: 20, y: 126 })
  })

  it('narration 同 bottom', () => {
    expect(getDialogTextPos('narration', false)).toEqual({ x: 44, y: 126 })
    expect(getDialogTextPos('narration', true)).toEqual({ x: 20, y: 126 })
  })
})

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

describe('Dialogue layout public return values', () => {
  it('G05-D11 物品框正文坐标是 (160,30)，有无头像都一样', () => {
    expect(getDialogTextPos('item-box', false)).toEqual({ x: 160, y: 30 })
    expect(getDialogTextPos('item-box', true)).toEqual({ x: 160, y: 30 })
  })

  it('G05-D12 物品框姓名坐标也是占位 (160,30)', () => {
    expect(getDialogTitlePos('item-box', false)).toEqual({ x: 160, y: 30 })
    expect(getDialogTitlePos('item-box', true)).toEqual({ x: 160, y: 30 })
  })
})
