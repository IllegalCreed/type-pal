/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R09（reforge/text/glyph.ts）。
 * 去重账：glyph.test 覆盖 decodeGlyph 2×2/宽10 跨字节、真实 Unifont 57k 表、loadGlyphs
 * 404/空 BDF fail-loud。本文件只做未占用合同：截断 bitmap 缺字节暗像素臂（?? 0）、
 * codepoint 0/.notdef 与 ENCODING -1 排除、同码点后者覆盖、CRLF 等价、loadGlyphs 成功路径。
 */
import { afterEach, describe, expect, test, vi } from 'vitest'
import { decodeGlyph, type Glyph, loadGlyphs, parseBdfGlyphs } from './glyph.js'

afterEach(() => vi.unstubAllGlobals())

describe('R09 decodeGlyph 截断位图', () => {
  test('bitmap 缺第 2 行字节：缺字节读 0 → 整行暗像素（?? 0 臂）', () => {
    const truncated: Glyph = { width: 8, height: 2, bitmap: new Uint8Array([0xff]) }
    const px = decodeGlyph(truncated, [9, 8, 7])
    expect([...px.slice(0, 4)]).toEqual([9, 8, 7, 255]) // row0 全亮
    expect(px[4 + 3]).toBe(255) // row0 col1 亮（0xff 8 位全 1）
    expect([...px.slice(32, 36)]).toEqual([0, 0, 0, 0]) // row1 缺字节 → 暗
  })
})

describe('R09 parseBdfGlyphs 码点门与覆盖', () => {
  const glyph = (encoding: string): string =>
    [
      'STARTFONT 2.1',
      'STARTCHAR g',
      `ENCODING ${encoding}`,
      'BBX 8 1 0 0',
      'BITMAP',
      'FF',
      'ENDCHAR',
      'ENDFONT',
    ].join('\n')

  test('codepoint 0（.notdef）与 ENCODING -1 排除；合法码点进表', () => {
    const mixed = [
      'STARTFONT 2.1',
      'STARTCHAR n',
      'ENCODING 0',
      'BBX 8 1 0 0',
      'BITMAP',
      '11',
      'ENDCHAR',
      'STARTCHAR u',
      'ENCODING -1',
      'BBX 8 1 0 0',
      'BITMAP',
      '22',
      'ENDCHAR',
      'STARTCHAR A',
      'ENCODING 65',
      'BBX 8 1 0 0',
      'BITMAP',
      'FF',
      'ENDCHAR',
      'ENDFONT',
    ].join('\n')
    const table = parseBdfGlyphs(mixed)
    expect(table.size).toBe(1)
    expect(table.has(0)).toBe(false)
    expect(table.has(-1)).toBe(false)
    expect(table.has(65)).toBe(true)
  })

  test('全部字形被排除 → fail-loud（默认 source = BDF）', () => {
    expect(() => parseBdfGlyphs(glyph('0'))).toThrow('引擎 chrome 字形为空:BDF')
  })

  test('同码点两个 STARTCHAR：后者覆盖前者', () => {
    const text = [
      'STARTCHAR a',
      'ENCODING 65',
      'BBX 8 1 0 0',
      'BITMAP',
      '0F',
      'ENDCHAR',
      'STARTCHAR b',
      'ENCODING 65',
      'BBX 8 1 0 0',
      'BITMAP',
      'F0',
      'ENDCHAR',
      'ENDFONT',
    ].join('\n')
    const table = parseBdfGlyphs(text)
    expect(table.get(65)!.bitmap[0]).toBe(0xf0)
  })

  test('CRLF 与 LF 文本解析等价', () => {
    expect(parseBdfGlyphs(glyph('65').replace(/\n/g, '\r\n')).get(65)).toEqual(
      parseBdfGlyphs(glyph('65')).get(65),
    )
  })
})

describe('R09 loadGlyphs 成功路径', () => {
  test('fetch 200 + 最小 BDF → 表含该字形，source = url', async () => {
    const bdf = [
      'STARTFONT 2.1',
      'STARTCHAR A',
      'ENCODING 65',
      'BBX 8 1 0 0',
      'BITMAP',
      '81',
      'ENDCHAR',
      'ENDFONT',
    ].join('\n')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(bdf, { status: 200 })),
    )
    const table = await loadGlyphs('chrome://font-ok')
    expect(table.size).toBe(1)
    expect(table.get(65)!.bitmap[0]).toBe(0x81)
    expect(table.get(0x42)).toBeUndefined()
  })
})
