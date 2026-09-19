/**
 * TEST-RESOURCE-TOOLS-COVERAGE-1 R08：BDF 解析完整字形（font/bdf-to-json.ts）。
 * 既有 bdf-to-json.test 已覆盖 8/16 宽片段与部分字节——不重复。本文件：两字形完整 bitmap
 * 手列、LF/CRLF/多余空白行等价、glyphsToJson 完整 count/字段/base64（手算 base64）。
 */
import { describe, expect, test } from 'vitest'
import { glyphsToJson, parseBdf } from '../bdf-to-json.js'

/** 8×16 ASCII 'A' 风格字形：首两行 3C 7E，余行 00。 */
const asciiBitmap = (): Uint8Array => {
  const out = new Uint8Array(16) // bytesPerRow=1 × height=16
  out[0] = 0x3c
  out[1] = 0x7e
  return out
}

/** 16×16 CJK 风格字形：两字节/行 × 16 行手列（0x00,0xFF 交替模式）。 */
const cjkBitmap = (): Uint8Array => {
  const rows = [
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
  ]
  const out = new Uint8Array(32)
  rows.forEach((row, index) => {
    out[index * 2] = parseInt(row.slice(0, 2), 16)
    out[index * 2 + 1] = parseInt(row.slice(2), 16)
  })
  return out
}

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
    '3C',
    '7E',
    ...Array.from({ length: 14 }, () => '00'),
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

describe('R08 parseBdf 完整字形', () => {
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
    expect(crlf).toEqual(lf)
    expect(padded).toEqual(lf)
  })
  test('glyphsToJson 完整 count/字段/base64（手算 base64 oracle）', () => {
    const json = glyphsToJson(parseBdf(bdfText('\n', '')))
    expect(json.count).toBe(2)
    expect(json.glyphs[0]).toEqual({
      codepoint: 65,
      width: 8,
      height: 16,
      // 3C 7E + 14×00 全 16 字节的 base64
      bitmapBase64: 'PH4AAAAAAAAAAAAAAAAAAA==',
    })
    expect(json.glyphs[1]!.bitmapBase64).toBe('AAD//wAA//8AAAAAAAD//wAA//8AAAAAAAD//wAA//8=')
    expect(json.glyphs[1]!.codepoint).toBe(20013)
  })
})
