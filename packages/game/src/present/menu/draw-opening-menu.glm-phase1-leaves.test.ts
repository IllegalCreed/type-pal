/**
 * TEST-GLM-PHASE1-LEAVES-3 L12（draw-opening-menu.ts）— 去重表：
 *  - draw-opening-menu.test（openingItemX 公式/背景 blit/两 item 坐标/bg 缺失/cursor 差异）→ 不重复
 *  - 新差异：选中/非选中的精确色值（冻结时钟 0xF9 vs 0x4F）、fShadow 三影黑点、
 *    词表载入后 label 同步渲染（getWord 单一源）。
 */
import { afterEach, describe, expect, it } from 'vitest'
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

  it('makeUiFrames 与本渲染无耦合：不传 frames 也能画（无 box 菜单）', () => {
    const flat: string[] = []
    flat[7] = '丙丙丙丙'
    flat[8] = '丁丁丁丁'
    setWordTable(flat)
    const state = createOpeningMenu()
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawOpeningMenu({ fb, state, glyphs, bg: undefined })
    } finally {
      restore()
    }
    expect(pixel(fb, textDot('丙丙丙丙', 3, 125, 95).x, 95 + 4)).toBe(0xf9)
  })
})
