import { afterEach, describe, expect, test, vi } from 'vitest'
import unifont from '../../../../data/raw/unifont-cn.bdf?raw'
import { decodeGlyph, type Glyph, loadGlyphs, parseBdfGlyphs } from './glyph.js'

// 2×2 glyph:左上 + 右下 亮(MSB-first,每行 1 byte)
const g: Glyph = { width: 2, height: 2, bitmap: new Uint8Array([0b10000000, 0b01000000]) }

describe('decodeGlyph', () => {
  test('输出尺寸 = width*height*4', () => {
    expect(decodeGlyph(g, [255, 0, 0]).length).toBe(2 * 2 * 4)
  })

  test('亮像素填 rgba + α255,暗像素 α0', () => {
    const px = decodeGlyph(g, [10, 20, 30])
    // (0,0)亮 → rgba+255
    expect([...px.slice(0, 4)]).toEqual([10, 20, 30, 255])
    // (1,0)暗 → α0(decodeGlyph 不主动写 RGB,暗像素全 0)
    expect([...px.slice(4, 8)]).toEqual([0, 0, 0, 0])
    // (0,1)暗
    expect([...px.slice(8, 12)]).toEqual([0, 0, 0, 0])
    // (1,1)亮
    expect([...px.slice(12, 16)]).toEqual([10, 20, 30, 255])
  })

  test('跨字节:width=10 → bytesPerRow=2,row1 col9 在第 4 字节(byte[3])', () => {
    // row1 占 byte[2](col0-7) + byte[3](col8-9);col9 → byteIdx=1*2+floor(9/8)=3,bit=(7-9%8)=6
    const wide: Glyph = {
      width: 10,
      height: 2,
      bitmap: new Uint8Array([0, 0, 0, 0b01000000]), // byte[3] bit6 = row1 col9
    }
    const px = decodeGlyph(wide, [1, 1, 1])
    const idx = (1 * 10 + 9) * 4 // row1 col9
    expect(px[idx + 3]).toBe(255) // α255 = 亮
  })
})

describe('bundled Unifont BDF', () => {
  afterEach(() => vi.unstubAllGlobals())

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

  test('HTTP 错误与空 BDF 都 fail-loud 且带 chrome URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    )
    await expect(loadGlyphs('chrome://font')).rejects.toThrow(
      '引擎 chrome 字形加载失败(404):chrome://font',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('STARTFONT 2.1')),
    )
    await expect(loadGlyphs('chrome://empty-font')).rejects.toThrow(
      '引擎 chrome 字形为空:chrome://empty-font',
    )
  })
})
