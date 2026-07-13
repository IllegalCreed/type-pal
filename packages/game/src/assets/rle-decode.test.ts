import { describe, expect, it } from 'vitest'
import { base64ToBytes, decodeRle, parseSpriteChunk } from './rle-decode.js'

describe('decodeRle', () => {
  it('单帧 RLE 无 0x00000002 前缀(普通 sprite frame)— 直接读 width/height', () => {
    // width=2, height=2, 全 opaque 4 字节 [0xAA 0xAA 0xAA 0xAA] 指令 = 4-byte literal
    const buf = new Uint8Array([0x02, 0x00, 0x02, 0x00, 0x04, 0xaa, 0xaa, 0xaa, 0xaa])
    const f = decodeRle(buf)
    expect(f.width).toBe(2)
    expect(f.height).toBe(2)
    expect(Array.from(f.pixels)).toEqual([0xaa, 0xaa, 0xaa, 0xaa])
    expect(Array.from(f.opaque)).toEqual([1, 1, 1, 1])
  })

  it('Sync.2 fix3:单帧 RLE 带 0x00000002 前缀(RGM 头像)— skip 前 4 字节后再读', () => {
    // sdlpal palcommon.c:722-728 真值:[0x02 0x00 0x00 0x00] 是 file header prefix
    // skip 后真 header [0x02 0x00 0x02 0x00] width=2 height=2 + 上面同 RLE
    const buf = new Uint8Array([
      0x02,
      0x00,
      0x00,
      0x00, // file header prefix → skip
      0x02,
      0x00,
      0x02,
      0x00, // real RLE header w=2 h=2
      0x04,
      0xaa,
      0xaa,
      0xaa,
      0xaa, // 4-byte literal
    ])
    // 统一后:单帧整-chunk 前缀跳过由 skipFilePrefix 参数控制(sprite-group 路径默认不跳)
    const f = decodeRle(buf, { skipFilePrefix: true })
    expect(f.width).toBe(2)
    expect(f.height).toBe(2)
    expect(Array.from(f.pixels)).toEqual([0xaa, 0xaa, 0xaa, 0xaa])
  })

  it('skip-pixels 指令(b >= 0x80)', () => {
    // width=2 height=2,跳 2 px(0x82)+ 2 字节像素(0x02 0x11 0x22)
    const buf = new Uint8Array([0x02, 0x00, 0x02, 0x00, 0x82, 0x02, 0x11, 0x22])
    const f = decodeRle(buf)
    expect(Array.from(f.pixels)).toEqual([0, 0, 0x11, 0x22])
    expect(Array.from(f.opaque)).toEqual([0, 0, 1, 1])
  })
})

describe('parseSpriteChunk', () => {
  it('解 sprite group 多帧(DATA chunk 12 dialog icons 同样结构)', () => {
    // frameCount=1; offsets[0]=2 (word offset → byte offset 4) → frame 0 起点 byte 4
    // frame 0:width=1 height=1, RLE 单字节 literal 0xFF
    const buf = new Uint8Array([
      0x01,
      0x00, // frameCount=1
      0x01,
      0x00,
      0x01,
      0x00, // w=1 h=1
      0x01,
      0xff, // 1-byte literal 0xFF
    ])
    const frames = parseSpriteChunk(buf)
    expect(frames).toHaveLength(1)
    expect(frames[0]?.width).toBe(1)
    expect(frames[0]?.pixels[0]).toBe(0xff)
  })
})

describe('base64ToBytes', () => {
  it('空 string → 空 Uint8Array', () => {
    expect(base64ToBytes('').length).toBe(0)
  })
  it('解码 round-trip(简单 ASCII)', () => {
    // 'AAA=' = [0x00 0x00](2 字节);'AAAA' = [0x00 0x00 0x00](3 字节)
    expect(Array.from(base64ToBytes('AAA='))).toEqual([0, 0])
    expect(Array.from(base64ToBytes('AAAA'))).toEqual([0, 0, 0])
  })
})
