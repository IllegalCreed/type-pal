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
    expect(glyphs).toEqual([
      {
        codepoint: 20013,
        width: 16,
        height: 16,
        bitmap: Uint8Array.from([
          0x00, 0x00, 0x00, 0x00, 0x0f, 0xf0, 0x0f, 0xf0, 0x0f, 0xf0, 0x0f, 0xf0, 0xff, 0xfe, 0x8f,
          0xf2, 0x8f, 0xf2, 0x8f, 0xf2, 0xff, 0xfe, 0x0f, 0xf0, 0x0f, 0xf0, 0x0f, 0xf0, 0x0f, 0xf0,
          0x00, 0x00,
        ]),
      },
    ])
  })
})
