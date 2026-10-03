/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G07-D。
 * 开场背景连索引 0 也铺上、小图不拉伸、光标越界两行都是常态色。
 * 确认框空标签不写字。不重复 glm 的 0xF9/0x4F、关/开 和四字横坐标。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { createOpeningMenu } from '../../core/menu/opening-menu.js'
import { setWordTable } from '../../core/word-lookup.js'
import { fixtureGlyphs, textDot } from '../__tests__/grok-present/font.js'
import {
  BOX_STYLE0,
  fillSentinel,
  makeUiFrames,
  pixel,
  SENTINEL,
} from '../__tests__/grok-present/images.js'
import { cloneInputs, freezeNow, resetHostSingletons } from '../__tests__/grok-present/world.js'
import type { BattleBgAsset } from '../battle/draw-battle-bg.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawConfirmBox } from './draw-confirm.js'
import { drawOpeningMenu } from './draw-opening-menu.js'

const glyphs = fixtureGlyphs()
const SELECTED = 0xf9
const NORMAL = 0x4f

afterEach(() => {
  resetHostSingletons()
})

function words(): void {
  const flat: string[] = []
  flat[7] = '甲甲甲甲'
  flat[8] = '乙乙乙乙'
  setWordTable(flat)
}

function zeroBg(): BattleBgAsset {
  return { width: 320, height: 200, indices: new Uint8Array(320 * 200) }
}

describe('G07-D 开场与确认像素', () => {
  it('G07-D01 背景索引 0 覆盖底色，选中字仍是闪烁色', () => {
    words()
    const state = createOpeningMenu()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const bg = zeroBg()
    const before = cloneInputs({ menu: state, battleBg: bg })
    const restore = freezeNow(0)
    try {
      drawOpeningMenu({ fb, state, bg, glyphs })
    } finally {
      restore()
    }
    const name = textDot('甲甲甲甲', 0, 125, 95)
    expect(pixel(fb, 1, 1)).toBe(0)
    expect(pixel(fb, name.x, name.y)).toBe(SELECTED)
    expect(cloneInputs({ menu: state, battleBg: bg })).toEqual(before)
  })

  it('G07-D02 4×4 背景只铺到自己的矩形，外侧保持底色', () => {
    words()
    const state = createOpeningMenu()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const bg: BattleBgAsset = { width: 4, height: 4, indices: new Uint8Array(16).fill(0x55) }
    const restore = freezeNow(0)
    try {
      drawOpeningMenu({ fb, state, bg, glyphs })
    } finally {
      restore()
    }
    const name = textDot('甲甲甲甲', 0, 125, 95)
    expect(pixel(fb, 1, 1)).toBe(0x55)
    expect(pixel(fb, 4, 1)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(SELECTED)
  })

  it('G07-D03 光标越过两项时两行都是未选中色', () => {
    words()
    const state = createOpeningMenu()
    state.selection.cursor = 5
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawOpeningMenu({ fb, state, bg: zeroBg(), glyphs })
    } finally {
      restore()
    }
    const row0 = textDot('甲甲甲甲', 0, 125, 95)
    const row1 = textDot('乙乙乙乙', 0, 125, 112)
    expect(pixel(fb, row0.x, row0.y)).toBe(NORMAL)
    expect(pixel(fb, row1.x, row1.y)).toBe(NORMAL)
    expect(pixel(fb, row0.x, row0.y)).not.toBe(SELECTED)
  })

  it('G07-D04 绘制不改光标，也不改词表给出的标签', () => {
    words()
    const state = createOpeningMenu()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const bg = zeroBg()
    const before = cloneInputs({ menu: state, battleBg: bg })
    const restore = freezeNow(0)
    try {
      drawOpeningMenu({ fb, state, bg, glyphs })
    } finally {
      restore()
    }
    expect(state.selection.cursor).toBe(0)
    expect(state.selection.items[0]?.label).toBe('甲甲甲甲')
    expect(state.selection.items[1]?.label).toBe('乙乙乙乙')
    expect(cloneInputs({ menu: state, battleBg: bg })).toEqual(before)
  })

  it('G07-D05 左标签两个字仍从 (145,110) 起笔，左右框原点不动', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    const frames = makeUiFrames()
    const restore = freezeNow(0)
    try {
      drawConfirmBox(fb, false, frames, glyphs, { left: '甲乙', right: '是' })
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

  it('G07-D06 左右标签都是空串时不写字，两框照画', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    const frames = makeUiFrames()
    const restore = freezeNow(0)
    try {
      drawConfirmBox(fb, false, frames, glyphs, { left: '', right: '' })
    } finally {
      restore()
    }
    const no = textDot('否', 0, 145, 110)
    const yes = textDot('是', 0, 220, 110)
    expect(pixel(fb, no.x, no.y)).not.toBe(SELECTED)
    expect(pixel(fb, yes.x, yes.y)).not.toBe(NORMAL)
    expect(pixel(fb, 140, 104)).toBe(BOX_STYLE0)
    expect(pixel(fb, 215, 104)).toBe(BOX_STYLE0)
  })

  it('G07-D07 背景索引 0x55 上的字影是 0，字本体仍是闪烁色', () => {
    words()
    const state = createOpeningMenu()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const bg: BattleBgAsset = {
      width: 320,
      height: 200,
      indices: new Uint8Array(320 * 200).fill(0x55),
    }
    const restore = freezeNow(0)
    try {
      drawOpeningMenu({ fb, state, bg, glyphs })
    } finally {
      restore()
    }
    const name = textDot('甲甲甲甲', 0, 125, 95)
    expect(pixel(fb, name.x + 1, name.y + 1)).toBe(0)
    expect(pixel(fb, name.x, name.y)).toBe(SELECTED)
    expect(pixel(fb, 1, 1)).toBe(0x55)
  })
})
