import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { freezeMenuClock } from '../../__tests__/menu-clock-fixture.js'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { createOpeningMenu } from '../../core/menu/opening-menu.js'
import { getWord, setWordTable } from '../../core/word-lookup.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import { fillSentinel, pixel, SENTINEL, sentinelFramebuffer } from '../__tests__/raster-fixtures.js'
import { cloneInputs } from '../__tests__/render-input-snapshots.js'
import { uniformDotGlyphs, uniformTextDot } from '../__tests__/uniform-glyphs.js'
import type { BattleBgAsset } from '../battle/draw-battle-bg.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawOpeningMenu, openingItemX } from './draw-opening-menu.js'

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

/** 合成320×200背景，0xAB便于区分背景与文字像素。 */
function coloredBackground(): BattleBgAsset {
  const w = 320
  const h = 200
  const indices = new Uint8Array(w * h).fill(0xab)
  return { width: w, height: h, indices }
}

const uniformGlyphs = uniformDotGlyphs()

const positionGlyphs = fixtureGlyphs()

const SELECTED = 0xf9

function installOpeningWords(): void {
  const flat: string[] = []
  flat[7] = '甲甲甲甲'
  flat[8] = '乙乙乙乙'
  setWordTable(flat)
}

function zeroBackground(): BattleBgAsset {
  return { width: 320, height: 200, indices: new Uint8Array(320 * 200) }
}

const NORMAL = 0x4f

describe('Opening item width and coordinates', () => {
  it("真 label('新的故事'/'旧的回忆',各 4 字)→ w=4 → x=125(回归钉死:对 shipped 数据零变化)", () => {
    expect(openingItemX('新的故事')).toBe(125) // flat[7] 新游戏
    expect(openingItemX('旧的回忆')).toBe(125) // flat[8] 读档(真 label,非"读取存档")
  })
  it('5 字 → w=5 → x=117;6 字 → w=6 → x=109(公式对长文案左移)', () => {
    expect(openingItemX('新新新新新')).toBe(117)
    expect(openingItemX('读取上次存档')).toBe(109)
  })
  it('w<=4 不左移(8 ASCII → w=4 → x=125,非 length 8)', () => {
    expect(openingItemX('NEWGAME!')).toBe(125)
  })
})

describe('Background and missing glyphs', () => {
  it('320×200 全屏背景 blit — center pixel = bg.indices[center]', () => {
    const fb = createFramebuffer()
    const state = createOpeningMenu()
    drawOpeningMenu({ fb, state, bg: coloredBackground() })
    // 中心 (160, 100) 应该被 bg blit 写成 0xAB(无字符覆盖)
    expect(fb.indices[100 * fb.width + 160]).toBe(0xab)
  })
  it('2 个 menu item 坐标 (125,95) (125,112) 字像素被写 — 覆盖 bg', () => {
    const fb = createFramebuffer()
    const state = createOpeningMenu()
    // glyphs undefined → 画 TOFU_GLYPH(16×16 空心框,只有顶/底行 + 左/右列亮 pixel)
    drawOpeningMenu({ fb, state, bg: coloredBackground() })
    // 第一行字 顶边 (130, 95):TOFU bitmap b[0]=0xFF 顶行 bit 5 = 1 → fgColor 写入,非 bg
    expect(fb.indices[95 * fb.width + 130]).not.toBe(0xab)
    // 第二行字 顶边 (130, 112)
    expect(fb.indices[112 * fb.width + 130]).not.toBe(0xab)
  })
  it('bg 缺失时保留既有像素，菜单文字仍画出', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x3f)
    const state = createOpeningMenu()
    drawOpeningMenu({ fb, state })
    expect(fb.indices[100 * fb.width + 160]).toBe(0x3f)
    expect(fb.indices[95 * fb.width + 125]).not.toBe(0x3f)
  })
})

describe('Selection colors, glyphs and blink clock', () => {
  it('cursor 0：第 1 行 0xF9、第 2 行 0x4F（词表 4 字 label → x=125）', () => {
    const flat: string[] = []
    flat[7] = '甲甲甲甲'
    flat[8] = '乙乙乙乙'
    setWordTable(flat)
    const state = createOpeningMenu()
    const fb = sentinelFramebuffer()
    const restore = freezeMenuClock(0)
    try {
      drawOpeningMenu({ fb, state, glyphs: uniformGlyphs })
    } finally {
      restore()
    }
    const row0 = uniformTextDot(0, 125, 95)
    const row1 = uniformTextDot(0, 125, 112)
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
    const fb = sentinelFramebuffer()
    const restore = freezeMenuClock(0)
    try {
      drawOpeningMenu({ fb, state, glyphs: uniformGlyphs })
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
    const fb = sentinelFramebuffer()
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
        drawOpeningMenu({ fb, state, glyphs: uniformGlyphs })
        expect(pixel(fb, 129, 99)).toBe(color)
        expect(pixel(fb, 129, 116)).toBe(0x4f)
      }
    } finally {
      now.mockRestore()
    }
  })
})

describe('Background pixels and read-only inputs', () => {
  it('背景索引 0 覆盖底色，选中字仍是闪烁色', () => {
    installOpeningWords()
    const state = createOpeningMenu()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const bg = zeroBackground()
    const before = cloneInputs({ menu: state, battleBg: bg })
    const restore = freezeMenuClock(0)
    try {
      drawOpeningMenu({ fb, state, bg, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const name = textDot('甲甲甲甲', 0, 125, 95)
    expect(pixel(fb, 1, 1)).toBe(0)
    expect(pixel(fb, name.x, name.y)).toBe(SELECTED)
    expect(state.selection.cursor).toBe(0)
    expect(state.selection.items[0]?.label).toBe('甲甲甲甲')
    expect(state.selection.items[1]?.label).toBe('乙乙乙乙')
    expect(getWord(7)).toBe('甲甲甲甲')
    expect(getWord(8)).toBe('乙乙乙乙')
    expect(cloneInputs({ menu: state, battleBg: bg })).toEqual(before)
  })
  it('4×4 背景只铺到自己的矩形，外侧保持底色', () => {
    installOpeningWords()
    const state = createOpeningMenu()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const bg: BattleBgAsset = { width: 4, height: 4, indices: new Uint8Array(16).fill(0x55) }
    const restore = freezeMenuClock(0)
    try {
      drawOpeningMenu({ fb, state, bg, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const name = textDot('甲甲甲甲', 0, 125, 95)
    expect(pixel(fb, 1, 1)).toBe(0x55)
    expect(pixel(fb, 4, 1)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(SELECTED)
  })
  it('背景索引 0x55 上的字影是 0，字本体仍是闪烁色', () => {
    installOpeningWords()
    const state = createOpeningMenu()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const bg: BattleBgAsset = {
      width: 320,
      height: 200,
      indices: new Uint8Array(320 * 200).fill(0x55),
    }
    const restore = freezeMenuClock(0)
    try {
      drawOpeningMenu({ fb, state, bg, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const name = textDot('甲甲甲甲', 0, 125, 95)
    expect(pixel(fb, name.x + 1, name.y + 1)).toBe(0)
    expect(pixel(fb, name.x, name.y)).toBe(SELECTED)
    expect(pixel(fb, 1, 1)).toBe(0x55)
  })
})

describe('Renderer boundary states', () => {
  it('光标越过两项时两行都是未选中色', () => {
    installOpeningWords()
    const state = createOpeningMenu()
    // 显式越界状态只核渲染容错，不声称普通菜单流程会产生此光标。
    state.selection.cursor = 5
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeMenuClock(0)
    try {
      drawOpeningMenu({ fb, state, bg: zeroBackground(), glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const row0 = textDot('甲甲甲甲', 0, 125, 95)
    const row1 = textDot('乙乙乙乙', 0, 125, 112)
    expect(pixel(fb, row0.x, row0.y)).toBe(NORMAL)
    expect(pixel(fb, row1.x, row1.y)).toBe(NORMAL)
    expect(pixel(fb, row0.x, row0.y)).not.toBe(SELECTED)
  })
})
