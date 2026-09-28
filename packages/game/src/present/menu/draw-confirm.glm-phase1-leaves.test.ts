/**
 * TEST-GLM-PHASE1-LEAVES-3 L09（draw-confirm.ts）— 去重表：无既有独立测试（targets.json
 * existingTestPointers 空；grok P04/P13 走 shop/战斗路径不直接断言本渲染器的选中色/阴影）。
 *  - 新合同：默认 否/是 两单行框 (130,100)/(205,100)、rightSelected 决定哪侧闪烁、
 *    fShadow 三影黑点、自定义 关/开 标签复用同布局。
 */
import { describe, expect, it } from 'vitest'
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
  it('默认 否/是：rightSelected=false → 左「否」0xF9、右「是」0x4F；两框体已画', () => {
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawConfirmBox(fb, false, makeUiFrames(), glyphs)
    } finally {
      restore()
    }
    const fou = textDot('否', 0, 145, 110)
    const shi = textDot('是', 0, 220, 110)
    expect(pixel(fb, fou.x, fou.y)).toBe(0xf9)
    expect(pixel(fb, shi.x, shi.y)).toBe(0x4f)
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
