/**
 * 逐字颜色与缺色回退、非零底图上的三影、缺表/缺字形的tofu像素。
 * 主测试覆盖混合字宽/缺字推进；font-width覆盖装载IO和普通文字的阴影开关。
 */
import { describe, expect, it } from 'vitest'
import { type Glyph, type GlyphTable, measureText, renderColoredText, renderText } from './font.js'
import { createFramebuffer } from './framebuffer.js'

function oneDotGlyph(): Glyph {
  const bitmap = new Uint8Array(32)
  bitmap[8] = 0x08 // row 4, col 4（bytesPerRow=2）
  return { width: 16, height: 16, bitmap }
}

const glyphs: GlyphTable = {
  has: (cp) => cp === 0x7532 || cp === 0x20bb7,
  get: (cp) => (cp === 0x7532 || cp === 0x20bb7 ? oneDotGlyph() : undefined),
}

describe('L16 renderColoredText（逐字符色）', () => {
  it('逐字符颜色数组按 code point 对位上色', () => {
    const fb = createFramebuffer()
    const colors = [0x11, 0x22]
    renderColoredText(fb, '𠮷甲', colors, 10, 20, glyphs)
    // 第 1 字主色 0x11；第 2 字 0x22
    expect(fb.indices[24 * 320 + 14]).toBe(0x11) // y=20+4, x=10+4
    expect(fb.indices[24 * 320 + 30]).toBe(0x22) // x=10+16+4
  })

  it('colors 缺项回退 0x4F；fShadow 三影写黑 0', () => {
    const fb = createFramebuffer()
    fb.indices.fill(0x5a)
    renderColoredText(fb, '甲甲', [0x11], 10, 20, glyphs, true)
    // 第 2 字缺色 → 0x4F
    expect(fb.indices[24 * 320 + 30]).toBe(0x4f)
    // 主字 (14,24)；三影 (15,24)/(14,25)/(15,25) 黑 0
    expect(fb.indices[24 * 320 + 14]).toBe(0x11)
    expect(fb.indices[24 * 320 + 15]).toBe(0)
    expect(fb.indices[25 * 320 + 14]).toBe(0)
    expect(fb.indices[25 * 320 + 15]).toBe(0)
  })
})

describe('L16 tofu 缺字形回退', () => {
  it('缺字形或未注入字表 → tofu顶底行0-14亮，中间行只有0/14亮', () => {
    for (const table of [glyphs, undefined]) {
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
    expect(measureText('abc', glyphs)).toBe(48)
    expect(measureText('甲甲', glyphs)).toBe(32)
  })
})
