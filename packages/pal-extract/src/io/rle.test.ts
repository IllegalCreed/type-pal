import { describe, expect, it } from 'vitest'
import { decodeRle } from './rle.js'

describe('decodeRle', () => {
  it('2×2 实心方块', () => {
    // 头:width=2(0x0002 LE)、height=2;然后 4 个像素值 = 0xAA
    // 编码:0x04(直接 4 像素)+ 0xAA 0xAA 0xAA 0xAA
    const buf = new Uint8Array([0x02, 0x00, 0x02, 0x00, 0x04, 0xaa, 0xaa, 0xaa, 0xaa])
    const frame = decodeRle(buf)
    expect(frame.width).toBe(2)
    expect(frame.height).toBe(2)
    expect(Array.from(frame.pixels)).toEqual([0xaa, 0xaa, 0xaa, 0xaa])
  })

  it('透明像素填 0', () => {
    // 2×1:跳 2 个像素(0x82) → 全透明
    const buf = new Uint8Array([0x02, 0x00, 0x01, 0x00, 0x82])
    const frame = decodeRle(buf)
    expect(Array.from(frame.pixels)).toEqual([0, 0])
  })

  it('混合 —— 1 透明 + 2 实心 + 1 透明', () => {
    // 4×1:跳 1(0x81) + 直 2(0x02 0xCC 0xDD) + 跳 1(0x81)
    const buf = new Uint8Array([0x04, 0x00, 0x01, 0x00, 0x81, 0x02, 0xcc, 0xdd, 0x81])
    const frame = decodeRle(buf)
    expect(Array.from(frame.pixels)).toEqual([0, 0xcc, 0xdd, 0])
  })
})
