import { describe, expect, test } from 'vitest'
import { decodeGlyph, type Glyph } from './glyph.js'

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
