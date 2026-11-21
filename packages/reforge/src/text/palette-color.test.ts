import { describe, expect, test } from 'vitest'
import { CURSOR_COLOR_COUNT, CURSOR_RGB, dialogColorRgb, TITLE_RGB } from './palette-color.js'

describe('对话固定色(pal0 快照,不绑场景 palette)', () => {
  test('对话色映射到固定 RGB', () => {
    expect(dialogColorRgb('default')).toEqual([199, 186, 174])
    expect(dialogColorRgb('yellow')).toEqual([255, 223, 134])
    expect(dialogColorRgb('cyan')).toEqual([121, 219, 186])
    expect(dialogColorRgb('red')).toEqual([190, 73, 60])
    expect(dialogColorRgb('redAlt')).toEqual([150, 32, 24])
  })
  test('姓名牌 + 光标 6 色', () => {
    expect(TITLE_RGB).toEqual([101, 203, 170])
    expect(CURSOR_COLOR_COUNT).toBe(6)
    expect(CURSOR_RGB).toEqual([
      [247, 231, 109],
      [235, 211, 97],
      [227, 190, 89],
      [219, 174, 81],
      [231, 195, 93],
      [243, 219, 105],
    ])
  })
})
