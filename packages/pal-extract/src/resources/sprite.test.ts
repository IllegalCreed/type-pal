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

  it('parseSpriteChunk 切多帧 —— 1 帧 fixture', () => {
    // 1 帧、offset = 4(头后立刻接);RLE = 2×2 实心
    const buf = new Uint8Array([
      0x01, 0x00,                                              // 帧数 1
      0x04, 0x00,                                              // offset[0] = 4
      0x02, 0x00, 0x02, 0x00, 0x04, 0xaa, 0xaa, 0xaa, 0xaa, // RLE 2x2
    ])
    const frames = parseSpriteChunk(buf)
    expect(frames).toHaveLength(1)
    expect(frames[0]!.width).toBe(2)
    expect(frames[0]!.height).toBe(2)
  })

  it('parseSpriteChunk 跳过 offset=0 的空帧', () => {
    // 2 帧:第 0 帧空缺(offset=0)、第 1 帧 1×1
    const buf = new Uint8Array([
      0x02, 0x00,                          // 帧数 2
      0x00, 0x00,                          // offset[0] = 0(空)
      0x06, 0x00,                          // offset[1] = 6
      0x01, 0x00, 0x01, 0x00, 0x01, 0xbb, // 1x1 frame: width=1, height=1, 1 byte 0xBB
    ])
    const frames = parseSpriteChunk(buf)
    expect(frames).toHaveLength(1)
    expect(frames[0]!.width).toBe(1)
  })

  it('framesToOut 转 SpriteFrameOut[]', () => {
    const frames = parseSpriteChunk(new Uint8Array([
      0x01, 0x00, 0x04, 0x00,
      0x02, 0x00, 0x02, 0x00, 0x04, 0xaa, 0xaa, 0xaa, 0xaa,
    ]))
    const out = framesToOut(frames)
    expect(out).toHaveLength(1)
    expect(out[0]!.index).toBe(0)
    expect(out[0]!.width).toBe(2)
    expect(out[0]!.pngBytes[0]).toBe(0x89)
  })
})
