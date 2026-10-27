/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R08（font/bdf-to-json.ts）。
 * 去重账：bdf-to-json.test 覆盖非对称16×16行字节；bdf-to-json.boundaries（RESOURCE-TOOLS R08）
 * 覆盖两字形完整 bitmap 手列、LF/CRLF/空白等价、glyphsToJson base64 oracle。
 * 本文件只做未占用合同：ENCODING -1 / 0 字形排除（codepoint > 0 门）、缺 BBX 的 16×16
 * 默认、短位图行零填充、无 ENDCHAR 的 EOF 终止、空输入。
 */
import { describe, expect, test } from 'vitest'
import { glyphsToJson, parseBdf } from './bdf-to-json.js'

const glyph8x2 = (encoding: string): string =>
  [
    'STARTFONT 2.1',
    `STARTCHAR g`,
    `ENCODING ${encoding}`,
    'BBX 8 2 0 0',
    'BITMAP',
    'A5',
    '5A',
    'ENDCHAR',
    'ENDFONT',
  ].join('\n')

describe('R08 parseBdf codepoint 门与默认值', () => {
  test('ENCODING -1（未编码字形）与 ENCODING 0：均排除（codepoint > 0 门）', () => {
    expect(parseBdf(glyph8x2('-1'))).toEqual([])
    expect(parseBdf(glyph8x2('0'))).toEqual([])
    expect(parseBdf(glyph8x2('65'))).toHaveLength(1)
  })

  test('缺 ENCODING 行：codepoint 保持 -1 → 排除', () => {
    const text = [
      'STARTFONT 2.1',
      'STARTCHAR g',
      'BBX 8 1 0 0',
      'BITMAP',
      'FF',
      'ENDCHAR',
      'ENDFONT',
    ].join('\n')
    expect(parseBdf(text)).toEqual([])
  })

  test('缺 BBX：默认 16×16（bytesPerRow 2，bitmap 32B），位图行按 2 字节装填', () => {
    const text = [
      'STARTFONT 2.1',
      'STARTCHAR g',
      'ENCODING 66',
      'BITMAP',
      '00FF',
      'FF00',
      ...Array.from({ length: 14 }, () => '0000'),
      'ENDCHAR',
      'ENDFONT',
    ].join('\n')
    const glyphs = parseBdf(text)
    expect(glyphs).toEqual([
      {
        codepoint: 66,
        width: 16,
        height: 16,
        bitmap: Uint8Array.from([
          0x00, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00,
        ]),
      },
    ])
  })

  test('位图行短于 bytesPerRow：缺位补 0（parseInt(hex,16) || 0）；无 ENDCHAR 以 EOF 终止', () => {
    const text = [
      'STARTFONT 2.1',
      'STARTCHAR g',
      'ENCODING 67',
      'BBX 8 2 0 0',
      'BITMAP',
      'A5',
      '',
    ].join('\n')
    const glyphs = parseBdf(text)
    expect(glyphs).toHaveLength(1)
    expect([...glyphs[0]!.bitmap]).toEqual([0xa5, 0x00]) // 第 2 行空串 → 0
  })

  test('空输入与无 STARTCHAR 文本：空表；glyphsToJson 空表 count=0', () => {
    expect(parseBdf('')).toEqual([])
    expect(parseBdf('STARTFONT 2.1\nENDFONT')).toEqual([])
    expect(glyphsToJson([])).toEqual({ count: 0, glyphs: [] })
  })
})

test('parseBdf：位图行非法 hex 回退 0，合法行保真', () => {
  const text = [
    'STARTFONT 2.1',
    'STARTCHAR A',
    'ENCODING 65',
    'BBX 8 2 0 0',
    'BITMAP',
    'ZZ', // 非法 hex → NaN || 0 → 0
    '0F',
    'ENDCHAR',
    'ENDFONT',
  ].join('\n')
  const glyphs = parseBdf(text)
  expect(glyphs).toHaveLength(1)
  expect(glyphs[0]!.codepoint).toBe(65)
  expect([...glyphs[0]!.bitmap]).toEqual([0, 0x0f])
})

test('parseBdf：位图行循环内遇 ENDCHAR 提前截断（rowIdx < height 即 break）', () => {
  const text = [
    'STARTFONT 2.1',
    'STARTCHAR T',
    'ENCODING 84',
    'BBX 8 4 0 0', // 声明 4 行，只给 1 行即 ENDCHAR → 行内 break
    'BITMAP',
    '0F',
    'ENDCHAR',
    'ENDFONT',
  ].join('\n')
  const glyphs = parseBdf(text)
  expect(glyphs).toHaveLength(1)
  expect(glyphs[0]!.codepoint).toBe(84)
  expect([...glyphs[0]!.bitmap]).toEqual([0x0f, 0, 0, 0]) // 余下行保持 0
})

test('parseBdf：零宽字形 bytesPerRow=0，位图行循环零次进入', () => {
  const text = [
    'STARTFONT 2.1',
    'STARTCHAR Z',
    'ENCODING 90',
    'BBX 0 2 0 0', // width 0 → bytesPerRow = 0 → 内层 for 不进入
    'BITMAP',
    'FF',
    'FF',
    'ENDCHAR',
    'ENDFONT',
  ].join('\n')
  const glyphs = parseBdf(text)
  expect(glyphs).toHaveLength(1)
  expect(glyphs[0]!.width).toBe(0)
  expect(glyphs[0]!.bitmap).toHaveLength(0)
})
