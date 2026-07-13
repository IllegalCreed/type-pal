/**
 * BDF → JSON glyph 表预处理(M4 P4.T2)。
 * 输入:GNU Unifont CN BDF(16×16 CJK + 8×16 ASCII)
 * 输出:JSON 含 codepoint → bitmap mapping(base64 紧凑)
 */

export interface BdfGlyph {
  codepoint: number
  width: number // 8 (ASCII) or 16 (CJK)
  height: number // 16
  bitmap: Uint8Array
}

export function parseBdf(text: string): BdfGlyph[] {
  const glyphs: BdfGlyph[] = []
  const lines = text.split(/\r?\n/)
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!.trim()
    if (line.startsWith('STARTCHAR')) {
      let codepoint = -1
      let width = 16
      let height = 16
      let bitmapStart = -1

      while (i < lines.length) {
        const l = lines[i]!.trim()
        if (l.startsWith('ENCODING')) codepoint = parseInt(l.split(/\s+/)[1]!, 10)
        else if (l.startsWith('BBX')) {
          const parts = l.split(/\s+/)
          width = parseInt(parts[1]!, 10)
          height = parseInt(parts[2]!, 10)
        } else if (l === 'BITMAP') {
          bitmapStart = i + 1
          break
        }
        i++
      }

      const bytesPerRow = Math.ceil(width / 8)
      const bitmap = new Uint8Array(bytesPerRow * height)
      let rowIdx = 0
      i = bitmapStart
      while (i < lines.length && rowIdx < height) {
        const row = lines[i]!.trim()
        if (row === 'ENDCHAR') break
        for (let b = 0; b < bytesPerRow; b++) {
          const hex = row.substr(b * 2, 2)
          bitmap[rowIdx * bytesPerRow + b] = parseInt(hex, 16) || 0
        }
        rowIdx++
        i++
      }
      while (i < lines.length && lines[i]!.trim() !== 'ENDCHAR') i++

      if (codepoint > 0) {
        glyphs.push({ codepoint, width, height, bitmap })
      }
    }
    i++
  }
  return glyphs
}

export interface GlyphsJson {
  count: number
  glyphs: { codepoint: number; width: number; height: number; bitmapBase64: string }[]
}

export function glyphsToJson(glyphs: BdfGlyph[]): GlyphsJson {
  return {
    count: glyphs.length,
    glyphs: glyphs.map((g) => ({
      codepoint: g.codepoint,
      width: g.width,
      height: g.height,
      bitmapBase64: Buffer.from(g.bitmap).toString('base64'),
    })),
  }
}
