/**
 * TEST-GLM-PHASE1-LEAVES-3 L16（font.ts）— 去重表：
 *  - font.test（palCharWidth/palWordWidth/measureText/renderText 主干）→ 不重复
 *  - 新差异：renderColoredText 逐字符色与缺色 0x4F 回退（全仓无直接测试）、tofu 缺字形回退
 *    的确定性像素、fShadow 三影不覆盖主字、measureText 空表 ASCII fallback 16。
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
  has: (cp) => cp === '甲'.codePointAt(0),
  get: (cp) => (cp === '甲'.codePointAt(0) ? oneDotGlyph() : undefined),
}

describe('L16 renderColoredText（逐字符色）', () => {
  it('逐字符颜色数组按 code point 对位上色', () => {
    const fb = createFramebuffer()
    const colors = [0x11, 0x22]
    renderColoredText(fb, '甲甲', colors, 10, 20, glyphs)
    // 第 1 字主色 0x11；第 2 字 0x22
    expect(fb.indices[24 * 320 + 14]).toBe(0x11) // y=20+4, x=10+4
    expect(fb.indices[24 * 320 + 30]).toBe(0x22) // x=10+16+4
  })

  it('colors 缺项回退 0x4F；fShadow 三影写黑 0', () => {
    const fb = createFramebuffer()
    renderColoredText(fb, '甲甲', [0x11], 10, 20, glyphs, true)
    // 第 2 字缺色 → 0x4F
    expect(fb.indices[24 * 320 + 30]).toBe(0x4f)
    // 主字 (10,24)；三影 (11,24)/(10,25)/(11,25) 黑 0
    expect(fb.indices[24 * 320 + 14]).toBe(0x11)
    expect(fb.indices[24 * 320 + 15]).toBe(0)
    expect(fb.indices[25 * 320 + 14]).toBe(0)
    expect(fb.indices[25 * 320 + 15]).toBe(0)
  })
})

describe('L16 tofu 缺字形回退', () => {
  it('缺字形 → 16×16 空心框：顶/底行 cols0-14 亮 col15 暗，中间行只有 col0/col9', () => {
    const fb = createFramebuffer()
    renderText(fb, '乙', 0, 0, 0x44, glyphs) // 乙 不在表
    // 顶行 y0：0xff（col0-7）+ 0xfe（col8-14）
    expect(fb.indices[0]).toBe(0x44)
    expect(fb.indices[14]).toBe(0x44)
    expect(fb.indices[15]).toBe(0) // col15 暗
    // 中间行 y5：只有最左 col0 与最右 col14
    expect(fb.indices[5 * 320]).toBe(0x44)
    expect(fb.indices[5 * 320 + 14]).toBe(0x44)
    expect(fb.indices[5 * 320 + 4]).toBe(0)
    expect(fb.indices[5 * 320 + 9]).toBe(0)
    // 底行 y15 与顶行同
    expect(fb.indices[15 * 320]).toBe(0x44)
    expect(fb.indices[15 * 320 + 15]).toBe(0)
  })

  it('measureText 空表 ASCII fallback 16px/字（布局入口禁止用它，doc 锚）', () => {
    expect(measureText('abc', glyphs)).toBe(48)
    expect(measureText('甲甲', glyphs)).toBe(32)
  })
})
