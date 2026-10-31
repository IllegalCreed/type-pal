import { describe, expect, it } from 'vitest'
import { glyphsOf } from './__tests__/glyph-fixtures.js'
import type { Glyph, GlyphTable } from './font.js'
import { measureText, renderColoredText, renderText } from './font.js'
import type { Framebuffer } from './framebuffer.js'
import { createFramebuffer } from './framebuffer.js'

// A (U+0041): 8×16, 第 0 行全亮(0xFF)
// 中 (U+4E2D): 16×16, 第 0 行全亮(0xFF 0xFF)

const latinAndCjkGlyphs: GlyphTable = {
  has: (cp: number) => cp === 65 || cp === 0x4e2d,
  get: (cp: number): Glyph | undefined => {
    if (cp === 65) {
      // 8px wide, 16 rows, bytesPerRow = 1
      const b = new Uint8Array(16)
      b[0] = 0xff // 第 0 行全亮 8 个像素
      return { width: 8, height: 16, bitmap: b }
    }
    if (cp === 0x4e2d) {
      // 16px wide, 16 rows, bytesPerRow = 2
      const b = new Uint8Array(32)
      b[0] = 0xff // 第 0 行左 8 px 全亮
      b[1] = 0xff // 第 0 行右 8 px 全亮
      return { width: 16, height: 16, bitmap: b }
    }
    return undefined
  },
}

describe('monochrome glyph pixels', () => {
  it('blits ASCII A: top row 8 pixels lit at fgColor', () => {
    const fb = createFramebuffer()
    renderText(fb, 'A', 0, 0, 0xff, latinAndCjkGlyphs)
    // 第 0 行 8 个像素应为 0xFF(fgColor)
    for (let i = 0; i < 8; i++) {
      expect(fb.indices[i]).toBe(0xff)
    }
    // 第 0 行第 8 个像素不属于 A
    expect(fb.indices[8]).toBe(0)
  })

  it('CJK 中: top row 16 pixels lit at fgColor', () => {
    const fb = createFramebuffer()
    renderText(fb, '中', 0, 0, 0xff, latinAndCjkGlyphs)
    for (let i = 0; i < 16; i++) {
      expect(fb.indices[i]).toBe(0xff)
    }
    expect(fb.indices[16]).toBe(0)
  })

  it('mixed glyph widths advance from a nonzero origin', () => {
    const fb = createFramebuffer()
    const w = renderText(fb, 'A中', 4, 8, 0xff, latinAndCjkGlyphs)
    expect(w).toBe(24) // 8 + 16
    // A 的首行位于 (4,8) 起的 8 像素
    for (let i = 0; i < 8; i++) expect(fb.indices[8 * 320 + 4 + i]).toBe(0xff)
    // 中紧跟在 x=12 起的 16 像素
    for (let i = 8; i < 24; i++) expect(fb.indices[8 * 320 + 4 + i]).toBe(0xff)
  })

  it('missing glyph between known letters uses tofu and advances by 16 pixels', () => {
    const fb = createFramebuffer()
    fb.indices.fill(77)
    expect(renderText(fb, 'A乙A', 4, 8, 0x22, latinAndCjkGlyphs)).toBe(32)
    expect(fb.indices[8 * 320 + 4]).toBe(0x22)
    expect(fb.indices[8 * 320 + 12]).toBe(0x22)
    expect(fb.indices[8 * 320 + 27]).toBe(77)
    expect(fb.indices[8 * 320 + 28]).toBe(0x22)
    expect(fb.indices[8 * 320 + 36]).toBe(77)
  })
})

describe('loaded glyph measurements', () => {
  it('8 for A', () => {
    expect(measureText('A', latinAndCjkGlyphs)).toBe(8)
  })

  it('16 for 中', () => {
    expect(measureText('中', latinAndCjkGlyphs)).toBe(16)
  })

  it('24 for A中', () => {
    expect(measureText('A中', latinAndCjkGlyphs)).toBe(24)
  })

  it('unknown char defaults to 16', () => {
    expect(measureText('\u0000', latinAndCjkGlyphs)).toBe(16)
  })

  it('empty string → 0', () => {
    expect(measureText('', latinAndCjkGlyphs)).toBe(0)
  })
})

function pixelAt(fb: Framebuffer, x: number, y: number): number {
  return fb.indices[y * 320 + x] ?? 0
}

describe('monochrome text shadows and empty input', () => {
  it('renderText 打开阴影时，右、下、右下三点是 0，原点仍是前景', () => {
    const fb = createFramebuffer()
    fb.indices.fill(77)
    renderText(fb, '甲', 10, 20, 0x11, glyphsOf(['甲']), true)
    expect(pixelAt(fb, 10, 20)).toBe(0x11)
    expect(pixelAt(fb, 11, 20)).toBe(0)
    expect(pixelAt(fb, 10, 21)).toBe(0)
    expect(pixelAt(fb, 11, 21)).toBe(0)
  })

  it('renderText 关闭阴影时，右、下、右下保持底色', () => {
    const fb = createFramebuffer()
    fb.indices.fill(77)
    renderText(fb, '甲', 10, 20, 0x11, glyphsOf(['甲']), false)
    expect(pixelAt(fb, 10, 20)).toBe(0x11)
    expect(pixelAt(fb, 11, 20)).toBe(77)
    expect(pixelAt(fb, 10, 21)).toBe(77)
    expect(pixelAt(fb, 11, 21)).toBe(77)
  })

  it('空字符串 renderText 返回 0，并且不改像素', () => {
    const fb = createFramebuffer()
    fb.indices.fill(77)
    expect(renderText(fb, '', 4, 8, 0x22, glyphsOf([]), false)).toBe(0)
    expect(fb.indices.every((value) => value === 77)).toBe(true)
  })
})

function interiorDotGlyph(): Glyph {
  const bitmap = new Uint8Array(32)
  bitmap[8] = 0x08 // row 4, col 4（bytesPerRow=2）
  return { width: 16, height: 16, bitmap }
}

const interiorDotGlyphs: GlyphTable = {
  has: (cp) => cp === 0x7532 || cp === 0x20bb7,
  get: (cp) => (cp === 0x7532 || cp === 0x20bb7 ? interiorDotGlyph() : undefined),
}

describe('per-codepoint colours', () => {
  it('逐字符颜色数组按 code point 对位上色', () => {
    const fb = createFramebuffer()
    const colors = [0x11, 0x22]
    renderColoredText(fb, '𠮷甲', colors, 10, 20, interiorDotGlyphs)
    // 第 1 字主色 0x11；第 2 字 0x22
    expect(fb.indices[24 * 320 + 14]).toBe(0x11) // y=20+4, x=10+4
    expect(fb.indices[24 * 320 + 30]).toBe(0x22) // x=10+16+4
  })

  it('colors 缺项回退 0x4F；fShadow 三影写黑 0', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    renderColoredText(fb, '甲甲', [0x11], 10, 20, interiorDotGlyphs, true)
    // 第 2 字缺色 → 0x4F
    expect(fb.indices[24 * 320 + 30]).toBe(0x4f)
    // 主字 (14,24)；三影 (15,24)/(14,25)/(15,25) 黑 0
    expect(fb.indices[24 * 320 + 14]).toBe(0x11)
    expect(fb.indices[24 * 320 + 15]).toBe(0)
    expect(fb.indices[25 * 320 + 14]).toBe(0)
    expect(fb.indices[25 * 320 + 15]).toBe(0)
  })
})

describe('missing glyph rendering and measurements', () => {
  it('缺字形或未注入字表 → tofu顶底行0-14亮，中间行只有0/14亮', () => {
    for (const table of [interiorDotGlyphs, undefined]) {
      const fb = createFramebuffer()
      fb.indices.fill(0x5a)
      expect(renderText(fb, '乙', 0, 0, 0x44, table)).toBe(16)
      expect(fb.indices[0]).toBe(0x44)
      expect(fb.indices[14]).toBe(0x44)
      expect(fb.indices[15]).toBe(0x5a)
      expect(fb.indices[5 * 320]).toBe(0x44)
      expect(fb.indices[5 * 320 + 14]).toBe(0x44)
      expect(fb.indices[5 * 320 + 4]).toBe(0x5a)
      expect(fb.indices[5 * 320 + 9]).toBe(0x5a)
      expect(fb.indices[15 * 320]).toBe(0x44)
      expect(fb.indices[15 * 320 + 15]).toBe(0x5a)
    }
  })

  it('measureText 缺ASCII字形按16px计，已加载汉字保持字形宽度', () => {
    expect(measureText('abc', interiorDotGlyphs)).toBe(48)
    expect(measureText('甲甲', interiorDotGlyphs)).toBe(32)
  })
})
