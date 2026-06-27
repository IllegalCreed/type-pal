import { describe, expect, test } from 'vitest'
import { CURSOR_RGBA, colorRgba, TITLE_RGBA } from './palette-color.js'

describe('对话固定色(pal0 快照,不绑场景 palette)', () => {
  test('DialogColor → 固定 RGBA', () => {
    expect(colorRgba('default')).toEqual([199, 186, 174])
    expect(colorRgba('yellow')).toEqual([255, 223, 134])
    expect(colorRgba('cyan')).toEqual([121, 219, 186])
    expect(colorRgba('red')).toEqual([190, 73, 60])
    expect(colorRgba('redAlt')).toEqual([150, 32, 24])
  })
  test('姓名牌 + 光标 6 色', () => {
    expect(TITLE_RGBA).toEqual([101, 203, 170])
    expect(CURSOR_RGBA).toHaveLength(6)
    expect(CURSOR_RGBA[0]).toEqual([247, 231, 109])
  })
})
