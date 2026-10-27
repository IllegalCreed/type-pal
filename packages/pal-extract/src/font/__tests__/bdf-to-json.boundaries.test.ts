/**
 * TEST-RESOURCE-TOOLS-COVERAGE-1 R08：BDF 解析完整字形（font/bdf-to-json.ts）。
 * bdf-to-json.test 核非对称16位行字节；本文件核8→16宽多字形推进、EOL和完整JSON。
 * ASCII原单字形用例由本文件完整合同承接，保留其全部16行输入与字段预期。
 */
import { describe, expect, test } from 'vitest'
import { glyphsToJson, parseBdf } from '../bdf-to-json.js'

/** 独立手列字节；不再用与解析器相同的 hex 循环生成预期。 */
const asciiBitmap = (): Uint8Array =>
  Uint8Array.from([
    0x00, 0x00, 0x00, 0x18, 0x24, 0x42, 0x42, 0x7e, 0x42, 0x42, 0x42, 0x42, 0x00, 0x00, 0x00, 0x00,
  ])
const cjkBitmap = (): Uint8Array =>
  Uint8Array.from([
    0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff,
    0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0xff, 0xff,
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
