/**
 * 开场文字的精确颜色、完整四字词条、阴影与六色闪烁。
 * 主测试保留布局/背景合同；相邻 Grok 像素例覆盖背景裁剪、词条区分和对角阴影。
 * “无需frames”旧例的第四字断言已迁入首例，独立覆盖其真实绘制合同。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fixtureGlyphs,
  freezeNow,
  newFb,
  pixel,
  textDot,
} from '../../__tests__/glm-phase1-leaves/present-fixtures.js'
import { createOpeningMenu } from '../../core/menu/opening-menu.js'
import { setWordTable } from '../../core/word-lookup.js'
import { drawOpeningMenu } from './draw-opening-menu.js'

const glyphs = fixtureGlyphs

afterEach(() => setWordTable([]))

describe('L12 drawOpeningMenu 剩余合同', () => {
  it('cursor 0：第 1 行 0xF9、第 2 行 0x4F（词表 4 字 label → x=125）', () => {
    const flat: string[] = []
    flat[7] = '甲甲甲甲'
    flat[8] = '乙乙乙乙'
    setWordTable(flat)
    const state = createOpeningMenu()
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawOpeningMenu({ fb, state, glyphs })
    } finally {
      restore()
    }
    const row0 = textDot('甲甲甲甲', 0, 125, 95)
    const row1 = textDot('乙乙乙乙', 0, 125, 112)
    expect(pixel(fb, row0.x, row0.y)).toBe(0xf9)
    expect(pixel(fb, row1.x, row1.y)).toBe(0x4f)
    expect(pixel(fb, 177, 99)).toBe(0xf9)
    expect(pixel(fb, 177, 116)).toBe(0x4f)
    // fShadow：主点右侧/下侧黑 0
    expect(pixel(fb, row0.x + 1, row0.y)).toBe(0)
    expect(pixel(fb, row0.x, row0.y + 1)).toBe(0)
  })

  it('cursor 1：高亮换读档行；fallback 词表未载 → fallback 文案（tofu 像素仍可断言色）', () => {
    const state = createOpeningMenu()
    state.selection.cursor = 1
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawOpeningMenu({ fb, state, glyphs })
    } finally {
      restore()
    }
    // fallback 4 字 label 不在字形表 → tofu：顶行首像素即主色
    expect(pixel(fb, 125, 95)).toBe(0x4f)
    expect(pixel(fb, 125, 112)).toBe(0xf9)
  })

  it('选中色按100ms推进六色，600ms回到首色，未选项保持常态色', () => {
    const flat: string[] = []
    flat[7] = '丙丙丙丙'
    flat[8] = '丁丁丁丁'
    setWordTable(flat)
    const state = createOpeningMenu()
    const fb = newFb()
    const now = vi.spyOn(Date, 'now')
    try {
      for (const { ms, color } of [
        { ms: 0, color: 0xf9 },
        { ms: 99, color: 0xf9 },
        { ms: 100, color: 0xfa },
        { ms: 200, color: 0xfb },
        { ms: 300, color: 0xfc },
        { ms: 400, color: 0xfd },
        { ms: 500, color: 0xfe },
        { ms: 599, color: 0xfe },
        { ms: 600, color: 0xf9 },
      ]) {
        now.mockReturnValue(ms)
        drawOpeningMenu({ fb, state, glyphs })
        expect(pixel(fb, 129, 99)).toBe(color)
        expect(pixel(fb, 129, 116)).toBe(0x4f)
      }
    } finally {
      now.mockRestore()
    }
  })
})
