/**
 * 确认框的选中侧/时钟、两框坐标、三影和合法关/开标签。
 * 相邻opening-confirm像素例保留空标签与固定布局的边界。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  fixtureGlyphs,
  freezeNow,
  makeUiFrames,
  newFb,
  pixel,
  textDot,
} from '../../__tests__/glm-phase1-leaves/present-fixtures.js'
import { drawConfirmBox } from './draw-confirm.js'

const glyphs = fixtureGlyphs

describe('L09 drawConfirmBox', () => {
  it('默认 否/是：左项随时钟闪烁，右项常态；两框体已画', () => {
    const fb = newFb()
    const now = vi.spyOn(Date, 'now')
    try {
      const fou = textDot('否', 0, 145, 110)
      const shi = textDot('是', 0, 220, 110)
      for (const { ms, color } of [
        { ms: 0, color: 0xf9 },
        { ms: 100, color: 0xfa },
        { ms: 600, color: 0xf9 },
      ]) {
        now.mockReturnValue(ms)
        drawConfirmBox(fb, false, makeUiFrames(), glyphs)
        expect(pixel(fb, fou.x, fou.y)).toBe(color)
        expect(pixel(fb, shi.x, shi.y)).toBe(0x4f)
      }
    } finally {
      now.mockRestore()
    }
    // 左框 (130,100) / 右框 (205,100) 内部 style0 素色
    expect(pixel(fb, 140, 104)).toBe(0x11)
    expect(pixel(fb, 215, 104)).toBe(0x11)
  })

  it('rightSelected=true 高亮换右；fShadow 三影：字亮点右/下/右下为黑 0', () => {
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawConfirmBox(fb, true, makeUiFrames(), glyphs)
    } finally {
      restore()
    }
    const shi = textDot('是', 0, 220, 110)
    expect(pixel(fb, shi.x, shi.y)).toBe(0xf9)
    // 主字 (x,y) 前先画 (x+1,y)/(x,y+1)/(x+1,y+1) 黑 0（同字形点亮位）
    expect(pixel(fb, shi.x + 1, shi.y)).toBe(0)
    expect(pixel(fb, shi.x, shi.y + 1)).toBe(0)
    expect(pixel(fb, shi.x + 1, shi.y + 1)).toBe(0)
  })

  it('自定义 关/开 标签（PAL_SwitchMenu 复用）：同布局不同字', () => {
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawConfirmBox(fb, true, makeUiFrames(), glyphs, { left: '关', right: '开' })
    } finally {
      restore()
    }
    const guan = textDot('关', 0, 145, 110)
    const kai = textDot('开', 0, 220, 110)
    expect(pixel(fb, guan.x, guan.y)).toBe(0x4f)
    expect(pixel(fb, kai.x, kai.y)).toBe(0xf9)
  })
})
