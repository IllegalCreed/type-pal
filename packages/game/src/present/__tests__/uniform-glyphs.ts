/** Fresh full-width (4,4) glyph inputs; separate from character-specific dots. */
import type { Glyph, GlyphTable } from '../font.js'

const UNIFORM_GLYPH_CHARS = '甲乙丙丁戊己庚辛壬癸否是关开装备使用进度一二三四五现有金钱售价'
export function uniformDotGlyphs(): GlyphTable {
  const glyphBitmaps = new Map<number, Glyph>()
  for (const ch of UNIFORM_GLYPH_CHARS) {
    const bitmap = new Uint8Array(32)
    bitmap[8] = 0x08 // row 4（bytesPerRow=2 → byte 8），col 4
    glyphBitmaps.set(ch.codePointAt(0)!, { width: 16, height: 16, bitmap })
  }
  return {
    has: (cp) => glyphBitmaps.has(cp),
    get: (cp) => glyphBitmaps.get(cp),
  }
}
/** 以16px字距计算第index个全角字的(4,4)亮点，坐标oracle独立于绘制器。 */
export function uniformTextDot(
  index: number,
  originX: number,
  originY: number,
): { x: number; y: number } {
  return { x: originX + index * 16 + 4, y: originY + 4 }
}
