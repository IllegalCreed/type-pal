/**
 * TEST-RESOURCE-TOOLS-COVERAGE-1 R02：RLE 编码独立字节 oracle（shared/rle-encode.ts）。
 * 既有 rle-encode.test 已覆盖混合游程/超长分段/roundtrip/128KB——不重复。
 * 本文件：126/127/128 透明与实心 run 的逐字节手列 oracle、三帧奇偶组合完整 chunk 字节
 * （WORD offset、pad 0、frame0 偏移=表长），不只自家 codec 往返。
 */
import { describe, expect, test } from 'vitest'
import { encodeRleFrame, encodeSpriteChunk } from './rle-encode.js'

const frame = (width: number, height: number, pixels: number[], opaque: number[]) => ({
  width,
  height,
  pixels: new Uint8Array(pixels),
  opaque: new Uint8Array(opaque),
})

describe('R02 encodeRleFrame 独立字节 oracle', () => {
  test('透明 run 126/127/128 分段边界：127 封顶，128 拆 127+1', () => {
    // width=130：128 透明 + 2 实心
    const transparent = frame(130, 1, new Array(130).fill(0), [...new Array(128).fill(0), 1, 1])
    expect([...encodeRleFrame(transparent)]).toEqual([
      130,
      0,
      1,
      0, // 头
      0x80 + 127, // 127 透明封顶
      0x80 + 1, // 剩 1 透明
      0x02,
      0x00,
      0x00, // 2 实心（palette 0 值仍发字节）
    ])
  })
  test('实心 run 126/127/128 分段边界：127 封顶，128 拆 127+1', () => {
    const solid = frame(
      128,
      1,
      Array.from({ length: 128 }, (_, i) => i + 1),
      new Array(128).fill(1),
    )
    const bytes = [...encodeRleFrame(solid)]
    expect(bytes.slice(0, 4)).toEqual([128, 0, 1, 0])
    expect(bytes[4]).toBe(0x7f) // 首 run 127
    expect(bytes.slice(5, 5 + 127)).toEqual(Array.from({ length: 127 }, (_, i) => i + 1))
    expect(bytes[132]).toBe(0x01) // 次段 1
    expect(bytes[133]).toBe(128)
    expect(bytes).toHaveLength(134)
  })
  test('尾透明必须写满跳段（总指令覆盖 w*h）', () => {
    const tail = frame(4, 2, [1, 2, 3, 0, 0, 0, 0, 0], [1, 1, 1, 0, 0, 0, 0, 0])
    expect([...encodeRleFrame(tail)]).toEqual([
      4,
      0,
      2,
      0,
      0x03,
      0x01,
      0x02,
      0x03,
      0x85, // 5 透明
    ])
  })
})

describe('R02 encodeSpriteChunk 三帧奇偶完整字节', () => {
  test('WORD offset 表 + 奇长帧 pad0 + frame0 偏移=表长，整 chunk 逐字节手列', () => {
    const f0 = frame(2, 1, [0xab, 0xcd], [1, 1]) // 7B 奇 → pad1
    const f1 = frame(1, 1, [0x00], [0]) // 5B 奇 → pad1（全透明）
    const f2 = frame(1, 1, [0xef], [1]) // 6B 偶
    const chunk = encodeSpriteChunk([f0, f1, f2])
    expect([...chunk]).toEqual([
      3,
      0, // frameCount=3（兼任 frame0 word 偏移）
      7,
      0, // frame1 word 偏移 = (6+7+1)/2 = 7
      10,
      0, // frame2 word 偏移 = (14+5+1)/2 = 10
      // frame0 @6：头 2×1 + 实心 2 → 7B + pad 0
      2,
      0,
      1,
      0,
      0x02,
      0xab,
      0xcd,
      0x00,
      // frame1 @14：头 1×1 + 跳 1 → 5B + pad 0
      1,
      0,
      1,
      0,
      0x81,
      0x00,
      // frame2 @20：头 1×1 + 实心 1 → 6B
      1,
      0,
      1,
      0,
      0x01,
      0xef,
    ])
    const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
    expect(view.getUint16(0, true)).toBe(3)
    expect(view.getUint16(2, true)).toBe(7)
    expect(view.getUint16(4, true)).toBe(10)
  })
})
