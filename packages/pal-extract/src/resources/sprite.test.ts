import { describe, expect, it } from 'vitest'
import { decodeRle } from '../io/rle.js'
import { encodeIndexedPng, framesToOut, parseSpriteChunk } from './sprite.js'

describe('sprite', () => {
  it('encodeIndexedPng 产 PNG 字节流,以 PNG 魔数开头', () => {
    const frame = decodeRle(new Uint8Array([0x02, 0x00, 0x02, 0x00, 0x04, 0xaa, 0xaa, 0xaa, 0xaa]))
    const png = encodeIndexedPng(frame.width, frame.height, frame.pixels)
    // PNG magic: 89 50 4E 47 0D 0A 1A 0A
    expect(png[0]).toBe(0x89)
    expect(png[1]).toBe(0x50)
    expect(png[2]).toBe(0x4e)
    expect(png[3]).toBe(0x47)
  })

  it('parseSpriteChunk 切 1 帧 —— byte 0..1 = imagecount = 1,frame[0] word-offset = 1 (=2 字节)', () => {
    // 仿 sdlpal palcommon.c::PAL_SpriteGetFrame:frame[i] 字节 offset = u16(byte i*2) << 1
    // frame 0:byte 0..1 = imagecount = 1 → word-offset = 1 → byte offset = 2
    // RLE data 从 byte 2 起
    const buf = new Uint8Array([
      0x01, 0x00,                                            // imagecount = 1;同时 frame[0] word-offset = 1 (=byte 2)
      0x02, 0x00, 0x02, 0x00, 0x04, 0xaa, 0xaa, 0xaa, 0xaa,  // RLE 2×2 at byte 2
    ])
    const frames = parseSpriteChunk(buf)
    expect(frames).toHaveLength(1)
    expect(frames[0]!.width).toBe(2)
    expect(frames[0]!.height).toBe(2)
  })

  it('parseSpriteChunk 跳过 word-offset=0 的空帧', () => {
    // 2 帧:frame 0 byte 0..1 = imagecount = 2(也是 frame[0] word-offset = 2 = byte 4,有效)
    //       frame 1 byte 2..3 = 0(空缺)
    // RLE for frame 0 at byte 4
    const buf = new Uint8Array([
      0x02, 0x00,                                            // imagecount = 2 (= frame[0] word-offset = 2, byte 4)
      0x00, 0x00,                                            // frame[1] word-offset = 0 → 空
      0x01, 0x00, 0x01, 0x00, 0x01, 0xbb,                    // 1×1 RLE at byte 4
    ])
    const frames = parseSpriteChunk(buf)
    expect(frames).toHaveLength(1) // 只有 frame 0
    expect(frames[0]!.width).toBe(1)
    expect(frames[0]!.height).toBe(1)
  })

  it('framesToOut 转 SpriteFrameOut[]', () => {
    const frames = parseSpriteChunk(
      new Uint8Array([
        0x01, 0x00,                                            // imagecount = 1
        0x02, 0x00, 0x02, 0x00, 0x04, 0xaa, 0xaa, 0xaa, 0xaa,  // RLE 2×2
      ]),
    )
    const out = framesToOut(frames)
    expect(out).toHaveLength(1)
    expect(out[0]!.index).toBe(0)
    expect(out[0]!.width).toBe(2)
    expect(out[0]!.pngBytes[0]).toBe(0x89)
  })
})
