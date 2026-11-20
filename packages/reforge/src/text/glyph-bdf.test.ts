import { afterEach, describe, expect, test, vi } from 'vitest'
import unifont from '../../../../data/raw/unifont-cn.bdf?raw'
import { loadGlyphs, parseBdfGlyphs } from './glyph.js'

function bdf(glyphs: readonly (readonly [encoding: number, bitmap: string])[], newline = '\n') {
  return [
    'STARTFONT 2.1',
    'FONT -test-synthetic-medium-r-normal--1-10-75-75-c-80-iso10646-1',
    'SIZE 1 75 75',
    'FONTBOUNDINGBOX 8 1 0 0',
    `CHARS ${glyphs.length}`,
    ...glyphs.flatMap(([encoding, bitmap], index) => [
      `STARTCHAR fixture-${index}`,
      `ENCODING ${encoding}`,
      'SWIDTH 500 0',
      'DWIDTH 8 0',
      'BBX 8 1 0 0',
      'BITMAP',
      bitmap,
      'ENDCHAR',
    ]),
    'ENDFONT',
  ].join(newline)
}

const glyph = (bitmap: number) => ({ width: 8, height: 1, bitmap: Uint8Array.of(bitmap) })

test('编码 0 和未编码项不入表，保留实际码点', () => {
  const table = parseBdfGlyphs(
    bdf([
      [0, '11'],
      [-1, '22'],
      [65, 'ff'],
    ]),
  )
  expect(table.size).toBe(1)
  expect(table.has(0)).toBe(false)
  expect(table.has(-1)).toBe(false)
  expect(table.get(65)).toEqual(glyph(0xff))
})

test('没有可显示字符时报错并指出 BDF 来源', () => {
  expect(() => parseBdfGlyphs(bdf([[0, '00']]))).toThrow('引擎 chrome 字形为空:BDF')
})

test('重复编码使用最后一条独立点阵', () => {
  const table = parseBdfGlyphs(
    bdf([
      [65, '0f'],
      [65, 'f0'],
    ]),
  )
  expect(table.get(65)).toEqual(glyph(0xf0))
})

test('支持 LF 和 CRLF 字库文件', () => {
  expect(parseBdfGlyphs(bdf([[65, '81']])).get(65)).toEqual(glyph(0x81))
  expect(parseBdfGlyphs(bdf([[65, '81']], '\r\n')).get(65)).toEqual(glyph(0x81))
})

test('真实 15.1.05 表解析 57,083 字形，并冻结 A / 中 / replacement glyph', () => {
  const table = parseBdfGlyphs(unifont, 'unifont_jp-15.1.05.bdf')
  expect(table.size).toBe(57_083)
  expect(table.get(0x41)).toEqual({
    width: 8,
    height: 16,
    bitmap: Uint8Array.from([
      0x00, 0x00, 0x00, 0x00, 0x18, 0x24, 0x24, 0x42, 0x42, 0x7e, 0x42, 0x42, 0x42, 0x42, 0x00,
      0x00,
    ]),
  })
  expect(table.get(0x4e2d)).toEqual({
    width: 16,
    height: 16,
    bitmap: Uint8Array.from([
      0x00, 0x80, 0x00, 0x80, 0x00, 0x80, 0x3f, 0xfe, 0x20, 0x82, 0x20, 0x82, 0x20, 0x82, 0x20,
      0x82, 0x20, 0x82, 0x3f, 0xfe, 0x00, 0x80, 0x00, 0x80, 0x00, 0x80, 0x00, 0x80, 0x00, 0x80,
      0x00, 0x00,
    ]),
  })
  expect(table.get(0xfffd)?.bitmap).toEqual(
    Uint8Array.from([
      0x00, 0x00, 0x00, 0x7e, 0x66, 0x5a, 0x5a, 0x7a, 0x76, 0x76, 0x7e, 0x76, 0x76, 0x7e, 0x00,
      0x00,
    ]),
  )
})

describe('读取已登记字库', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('成功响应返回该 URL 的字模', async () => {
    const fetch = vi.fn(async () => new Response(bdf([[65, '81']])))
    vi.stubGlobal('fetch', fetch)
    const table = await loadGlyphs('chrome://font-ok')
    expect(fetch).toHaveBeenCalledWith('chrome://font-ok')
    expect(table.size).toBe(1)
    expect(table.get(65)).toEqual(glyph(0x81))
    expect(table.get(66)).toBeUndefined()
  })

  test('HTTP 错误带来源地址', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    )
    await expect(loadGlyphs('chrome://font')).rejects.toThrow(
      '引擎 chrome 字形加载失败(404):chrome://font',
    )
  })

  test('空字库带来源地址', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(bdf([]))),
    )
    await expect(loadGlyphs('chrome://empty-font')).rejects.toThrow(
      '引擎 chrome 字形为空:chrome://empty-font',
    )
  })
})
