/** BDF bitmap fidelity, line endings and serialized glyph bytes. */
import { describe, expect, it, test } from 'vitest'
import { glyphsToJson, parseBdf } from './bdf-to-json.js'

describe('complete bitmap and glyph JSON fidelity', () => {
  /** 独立手列字节；不再用与解析器相同的 hex 循环生成预期。 */
  const asciiBitmap = (): Uint8Array =>
    Uint8Array.from([
      0x00, 0x00, 0x00, 0x18, 0x24, 0x42, 0x42, 0x7e, 0x42, 0x42, 0x42, 0x42, 0x00, 0x00, 0x00,
      0x00,
    ])

  const cjkBitmap = (): Uint8Array =>
    Uint8Array.from([
      0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff,
      0xff, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
      0xff, 0xff,
    ])

  function bdfText(lineEnding: '\n' | '\r\n', padding: '' | ' '): string {
    const eol = `${padding}${lineEnding}`
    return [
      'STARTFONT 2.1',
      'FONT test',
      'CHARS 2',
      'STARTCHAR A',
      'ENCODING 65',
      'SWIDTH 500 0',
      'BBX 8 16 0 0',
      'BITMAP',
      '00',
      '00',
      '00',
      '18',
      '24',
      '42',
      '42',
      '7E',
      '42',
      '42',
      '42',
      '42',
      '00',
      '00',
      '00',
      '00',
      'ENDCHAR',
      'STARTCHAR CJK',
      'ENCODING 20013',
      'SWIDTH 1000 0',
      'BBX 16 16 0 0',
      'BITMAP',
      '0000',
      'FFFF',
      '0000',
      'FFFF',
      '0000',
      '0000',
      '0000',
      'FFFF',
      '0000',
      'FFFF',
      '0000',
      '0000',
      '0000',
      'FFFF',
      '0000',
      'FFFF',
      'ENDCHAR',
      'ENDFONT',
    ].join(eol)
  }

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

  test('两字形完整 bitmap/宽高/码点手列精确；BBX 宽高生效', () => {
    const glyphs = parseBdf(bdfText('\n', ''))
    expect(glyphs).toHaveLength(2)
    expect(glyphs[0]).toEqual({
      codepoint: 65,
      width: 8,
      height: 16,
      bitmap: asciiBitmap(),
    })
    expect(glyphs[1]).toEqual({
      codepoint: 20013,
      width: 16,
      height: 16,
      bitmap: cjkBitmap(),
    })
  })

  test('LF / CRLF / 行尾多余空白三种文本等价解析', () => {
    const lf = parseBdf(bdfText('\n', ''))
    const crlf = parseBdf(bdfText('\r\n', ''))
    const padded = parseBdf(bdfText('\n', ' '))
    const expected = [
      { codepoint: 65, width: 8, height: 16, bitmap: asciiBitmap() },
      { codepoint: 20013, width: 16, height: 16, bitmap: cjkBitmap() },
    ]
    expect(lf).toEqual(expected)
    expect(crlf).toEqual(expected)
    expect(padded).toEqual(expected)
  })

  test('glyphsToJson 完整 count/字段/base64（手算 base64 oracle）', () => {
    const json = glyphsToJson(parseBdf(bdfText('\n', '')))
    expect(json).toEqual({
      count: 2,
      glyphs: [
        { codepoint: 65, width: 8, height: 16, bitmapBase64: 'AAAAGCRCQn5CQkJCAAAAAA==' },
        {
          codepoint: 20013,
          width: 16,
          height: 16,
          bitmapBase64: 'AAD//wAA//8AAAAAAAD//wAA//8AAAAAAAD//wAA//8=',
        },
      ],
    })
  })
})
