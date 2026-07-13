import { describe, expect, it } from 'vitest'
import { parseBdf } from '../bdf-to-json.js'

describe('parseBdf', () => {
  it('extracts 16x16 glyph from BDF fragment', () => {
    const bdf = `STARTFONT 2.1
SIZE 16 75 75
STARTCHAR U+4E2D
ENCODING 20013
SWIDTH 500 0
DWIDTH 16 0
BBX 16 16 0 -2
BITMAP
0000
0000
0FF0
0FF0
0FF0
0FF0
FFFE
8FF2
8FF2
8FF2
FFFE
0FF0
0FF0
0FF0
0FF0
0000
ENDCHAR
ENDFONT`
    const glyphs = parseBdf(bdf)
    expect(glyphs).toHaveLength(1)
    expect(glyphs[0]!.codepoint).toBe(20013)
    expect(glyphs[0]!.width).toBe(16)
    expect(glyphs[0]!.height).toBe(16)
    expect(glyphs[0]!.bitmap).toHaveLength(32) // 16 row × 2 byte
    expect(glyphs[0]!.bitmap[0]).toBe(0x00)
    expect(glyphs[0]!.bitmap[4]).toBe(0x0f)
    expect(glyphs[0]!.bitmap[5]).toBe(0xf0)
  })

  it('parses ASCII 8-wide glyph', () => {
    const bdf = `STARTFONT 2.1
STARTCHAR U+0041
ENCODING 65
DWIDTH 8 0
BBX 8 16 0 -2
BITMAP
00
00
00
18
24
42
42
7E
42
42
42
42
00
00
00
00
ENDCHAR
ENDFONT`
    const glyphs = parseBdf(bdf)
    expect(glyphs[0]!.codepoint).toBe(65)
    expect(glyphs[0]!.width).toBe(8)
    expect(glyphs[0]!.bitmap).toHaveLength(16) // 16 row × 1 byte
  })
})
