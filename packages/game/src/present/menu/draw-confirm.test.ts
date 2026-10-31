import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { freezeMenuClock } from '../../__tests__/menu-clock-fixture.js'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import { BOX_STYLE0, makeUiFrames } from '../__tests__/menu-ui-fixtures.js'
import { fillSentinel, pixel, SENTINEL, sentinelFramebuffer } from '../__tests__/raster-fixtures.js'
import { uniformDotGlyphs, uniformTextDot } from '../__tests__/uniform-glyphs.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawConfirmBox } from './draw-confirm.js'

let restoreMenuText: (() => void) | undefined
beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
})
afterEach(() => {
  try {
    restoreMenuText?.()
  } finally {
    restoreMenuText = undefined
  }
})

const uniformGlyphs = uniformDotGlyphs()

const positionGlyphs = fixtureGlyphs()

const SELECTED = 0xf9

const NORMAL = 0x4f

describe('Selection colors, shadows and switch labels', () => {
  it('默认 否/是：左项随时钟闪烁，右项常态；两框体已画', () => {
    const fb = sentinelFramebuffer()
    const now = vi.spyOn(Date, 'now')
    try {
      const fou = uniformTextDot(0, 145, 110)
      const shi = uniformTextDot(0, 220, 110)
      for (const { ms, color } of [
        { ms: 0, color: 0xf9 },
        { ms: 100, color: 0xfa },
        { ms: 600, color: 0xf9 },
      ]) {
        now.mockReturnValue(ms)
        drawConfirmBox(fb, false, makeUiFrames(), uniformGlyphs)
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
    const fb = sentinelFramebuffer()
    const restore = freezeMenuClock(0)
    try {
      drawConfirmBox(fb, true, makeUiFrames(), uniformGlyphs)
    } finally {
      restore()
    }
    const shi = uniformTextDot(0, 220, 110)
    expect(pixel(fb, shi.x, shi.y)).toBe(0xf9)
    // 主字 (x,y) 前先画 (x+1,y)/(x,y+1)/(x+1,y+1) 黑 0（同字形点亮位）
    expect(pixel(fb, shi.x + 1, shi.y)).toBe(0)
    expect(pixel(fb, shi.x, shi.y + 1)).toBe(0)
    expect(pixel(fb, shi.x + 1, shi.y + 1)).toBe(0)
  })
  it('自定义 关/开 标签（PAL_SwitchMenu 复用）：同布局不同字', () => {
    const fb = sentinelFramebuffer()
    const restore = freezeMenuClock(0)
    try {
      drawConfirmBox(fb, true, makeUiFrames(), uniformGlyphs, { left: '关', right: '开' })
    } finally {
      restore()
    }
    const guan = uniformTextDot(0, 145, 110)
    const kai = uniformTextDot(0, 220, 110)
    expect(pixel(fb, guan.x, guan.y)).toBe(0x4f)
    expect(pixel(fb, kai.x, kai.y)).toBe(0xf9)
  })
})

describe('Fixed label layout and empty strings', () => {
  it('左标签两个字仍从 (145,110) 起笔，左右框原点不动', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    const frames = makeUiFrames()
    const restore = freezeMenuClock(0)
    try {
      drawConfirmBox(fb, false, frames, positionGlyphs, { left: '甲乙', right: '是' })
    } finally {
      restore()
    }
    const first = textDot('甲乙', 0, 145, 110)
    const second = textDot('甲乙', 1, 145, 110)
    const yes = textDot('是', 0, 220, 110)
    expect(pixel(fb, second.x, second.y)).toBe(SELECTED)
    expect(pixel(fb, first.x, first.y)).toBe(SELECTED)
    expect(pixel(fb, yes.x, yes.y)).toBe(NORMAL)
    expect(pixel(fb, 140, 104)).toBe(BOX_STYLE0)
    expect(pixel(fb, 215, 104)).toBe(BOX_STYLE0)
  })
  it('左右标签都是空串时不写字，两框照画', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    const frames = makeUiFrames()
    const restore = freezeMenuClock(0)
    try {
      drawConfirmBox(fb, false, frames, positionGlyphs, { left: '', right: '' })
    } finally {
      restore()
    }
    const no = textDot('否', 0, 145, 110)
    const yes = textDot('是', 0, 220, 110)
    expect(pixel(fb, no.x, no.y)).toBe(SENTINEL)
    expect(pixel(fb, yes.x, yes.y)).toBe(SENTINEL)
    expect(pixel(fb, 140, 104)).toBe(BOX_STYLE0)
    expect(pixel(fb, 215, 104)).toBe(BOX_STYLE0)
  })
})
