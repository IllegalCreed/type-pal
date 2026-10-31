/** RLE input buffers: prefix handling, frame tails and nonzero byte offsets. */
import { describe, expect, test } from 'vitest'
import { decodeRle, parseIndexedRleChunk, parseSpriteChunk, parseSpriteChunkStrict } from './rle.js'

describe('frame input bytes and buffer views', () => {
  /** 1×2 帧：跳1透明 + 实心 palette-0。 */
  const FRAME_1X2 = new Uint8Array([0x01, 0x00, 0x02, 0x00, 0x81, 0x01, 0x00])

  /** 把 bytes 嵌进奇数偏移的大缓冲（前后垫垃圾），返回 subarray 视图。 */
  function oddView(bytes: Uint8Array): Uint8Array {
    const start = 7
    const parent = new Uint8Array(start + bytes.length + 5)
    parent.fill(0xab)
    parent.set(bytes, start)
    return parent.subarray(start, start + bytes.length)
  }

  test('0x00000002 前缀 + 选项：从 byte 4 解码（sdlpal palcommon.c:722-728 单帧整-chunk 头）', () => {
    const buf = new Uint8Array([0x02, 0x00, 0x00, 0x00, ...FRAME_1X2])
    const frame = decodeRle(buf, { skipFilePrefix: true })
    expect(frame).toEqual({
      width: 1,
      height: 2,
      pixels: new Uint8Array([0, 0]),
      opaque: new Uint8Array([0, 1]),
    })
  })

  test('同缓冲不传选项：不跳前缀，头从 byte 0 读后拒绝零尺寸帧', () => {
    const buf = new Uint8Array([0x02, 0x00, 0x00, 0x00, ...FRAME_1X2])
    expect(() => decodeRle(buf)).toThrow(/invalid frame dimensions/)
  })

  test('传选项但首 4 字节非该前缀：不跳，正常解码', () => {
    const buf = new Uint8Array([0x01, 0x00, 0x01, 0x00, 0x01, 0x5a])
    const frame = decodeRle(buf, { skipFilePrefix: true })
    expect(frame.width).toBe(1)
    expect(frame.height).toBe(1)
    expect(frame.pixels[0]).toBe(0x5a)
    expect(frame.opaque[0]).toBe(1)
  })

  test('缓冲 <4 字节 + 选项：长度守卫显式拒绝，不挂起', () => {
    expect(() => decodeRle(new Uint8Array([0x02, 0x00, 0x00]), { skipFilePrefix: true })).toThrow(
      /frame header truncated/,
    )
  })

  test('完整帧后追加字节：仍得到预期尺寸、pixels与opaque', () => {
    const padded = new Uint8Array([...FRAME_1X2, 0xff, 0x00, 0x7f, 0x33])
    expect(decodeRle(padded)).toEqual({
      width: 1,
      height: 2,
      pixels: new Uint8Array([0, 0]),
      opaque: new Uint8Array([0, 1]),
    })
  })

  test('四个公开入口在奇数byteOffset视图上保留完整预期帧与报告', () => {
    const withSentinel = new Uint8Array([
      0x02,
      0x00,
      0x00,
      0x00, // frameCount=2，slot1 = 0 sentinel
      0x01,
      0x00,
      0x01,
      0x00,
      0x01,
      0x3c, // frame0 @4：1×1 px 0x3c
    ])
    const noSentinel = new Uint8Array([
      0x01,
      0x00,
      0x01,
      0x00,
      0x01,
      0x00,
      0x01,
      0x3c, // frameCount=1，frame @2：1×1 px 0x3c
    ])

    expect(decodeRle(oddView(FRAME_1X2))).toEqual({
      width: 1,
      height: 2,
      pixels: new Uint8Array([0, 0]),
      opaque: new Uint8Array([0, 1]),
    })
    const expected = [
      { width: 1, height: 1, pixels: new Uint8Array([0x3c]), opaque: new Uint8Array([1]) },
    ]
    expect(parseSpriteChunk(oddView(withSentinel))).toEqual(expected)
    expect(parseSpriteChunkStrict(oddView(withSentinel))).toEqual(expected)
    expect(parseIndexedRleChunk(oddView(noSentinel), 'canonical')).toEqual({
      frames: expected,
      declaredSlots: 1,
      trailingSentinel: false,
      skippedLegacyTailSlots: 0,
    })
  })
})
