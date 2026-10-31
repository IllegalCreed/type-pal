/** Independent encoded bytes, run boundaries, input views and frame-table width. */
import { describe, expect, test } from 'vitest'
import { parseSpriteChunkStrict, type RleFrame } from './rle.js'
import { encodeRleFrame, encodeSpriteChunk } from './rle-encode.js'

describe('encoder bytes and input views', () => {
  const frame = (width: number, height: number, pixels: number[], opaque: number[]): RleFrame => ({
    width,
    height,
    pixels: new Uint8Array(pixels),
    opaque: new Uint8Array(opaque),
  })

  test('透明 run 126/127/128 分段边界：126/127 单段不拆，128 拆 127+1', () => {
    // width=128：126 透明 + 2 实心（透明 run 恰为 126）
    const run126 = frame(128, 1, new Array(128).fill(0), [...new Array(126).fill(0), 1, 1])
    expect([...encodeRleFrame(run126)]).toEqual([
      128,
      0,
      1,
      0, // 头
      0x80 + 126, // 126 透明单段（< 127 封顶不拆）
      0x02,
      0x00,
      0x00, // 2 实心（palette 0 值仍发字节）
    ])
    // width=129：127 透明 + 2 实心（恰在封顶值，仍单段）
    const run127 = frame(129, 1, new Array(129).fill(0), [...new Array(127).fill(0), 1, 1])
    expect([...encodeRleFrame(run127)]).toEqual([
      129,
      0,
      1,
      0,
      0x80 + 127, // 127 透明单段（恰等于封顶，不拆）
      0x02,
      0x00,
      0x00,
    ])
    // width=130：128 透明 + 2 实心 → 128 拆 127+1
    const run128 = frame(130, 1, new Array(130).fill(0), [...new Array(128).fill(0), 1, 1])
    expect([...encodeRleFrame(run128)]).toEqual([
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
    // 126/127 单段不拆轴：恰在封顶内整段 literal
    const solid126 = frame(
      126,
      1,
      Array.from({ length: 126 }, (_, i) => i + 1),
      new Array(126).fill(1),
    )
    expect([...encodeRleFrame(solid126)]).toEqual([
      126,
      0,
      1,
      0,
      126, // 单条 literal 126（< 0x7f 封顶）
      ...Array.from({ length: 126 }, (_, i) => i + 1),
    ])
    const solid127 = frame(
      127,
      1,
      Array.from({ length: 127 }, (_, i) => i + 1),
      new Array(127).fill(1),
    )
    expect([...encodeRleFrame(solid127)]).toEqual([
      127,
      0,
      1,
      0,
      0x7f, // 单条 literal 127（恰等于封顶，不拆）
      ...Array.from({ length: 127 }, (_, i) => i + 1),
    ])
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

  test('不透明起头 2×2 棋盘：lit/透明逐字节精确（旧 oracle 均透明起头）', () => {
    const f = frame(2, 2, [0x33, 0, 0x44, 0], [1, 0, 1, 0])
    expect([...encodeRleFrame(f)]).toEqual([
      2,
      0,
      2,
      0, // 头 w=2 h=2
      0x01,
      0x33, // 实心 1：0x33
      0x81, // 跳 1
      0x01,
      0x44, // 实心 1：0x44
      0x81, // 尾透明补满
    ])
  })

  test('连续单像素实心（透明夹 1px）：逐像素分段不合并', () => {
    const f = frame(5, 1, [0x0a, 0, 0x0b, 0, 0x0c], [1, 0, 1, 0, 1])
    expect([...encodeRleFrame(f)]).toEqual([
      5, 0, 1, 0, 0x01, 0x0a, 0x81, 0x01, 0x0b, 0x81, 0x01, 0x0c,
    ])
  })

  test('pixels/opaque 为大缓冲奇数偏移 subarray：编码字节与独立缓冲版本相等', () => {
    const standalone = frame(3, 2, [1, 0, 3, 0, 5, 6], [1, 0, 1, 0, 1, 1])
    const parent = new Uint8Array(2 + 6 + 3)
    parent.fill(0x99)
    const pxView = parent.subarray(2, 2 + 6)
    pxView.set([1, 0, 3, 0, 5, 6])
    const maskParent = new Uint8Array(5 + 6 + 1)
    maskParent.fill(0x77)
    const opView = maskParent.subarray(5, 5 + 6)
    opView.set([1, 0, 1, 0, 1, 1])
    const fromViews = encodeRleFrame({
      width: 3,
      height: 2,
      pixels: pxView,
      opaque: opView,
    })
    const expected = [3, 0, 2, 0, 1, 1, 0x81, 1, 3, 0x81, 2, 5, 6]
    expect([...encodeRleFrame(standalone)]).toEqual(expected)
    expect([...fromViews]).toEqual(expected)
  })

  test('300 个 1×1 帧：计数字段双字节、frame0 偏移=600、300 帧全往返且像素按序保真', () => {
    const frames = Array.from({ length: 300 }, (_, i) => frame(1, 1, [i % 256], [1]))
    const chunk = encodeSpriteChunk(frames)
    const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
    expect(view.getUint16(0, true)).toBe(300) // 计数 = 0x012C；byte0..1 兼任 slot0 word 偏移 → frame0 @600
    expect(view.getUint16(2, true)).toBe(303) // slot1 word = (600+6)/2
    expect(chunk.byteLength).toBe(600 + 300 * 6) // 表 600B + 每帧 6B（4 头 + 1 指令 + 1 像素）
    const parsed = parseSpriteChunkStrict(chunk)
    expect(parsed).toHaveLength(300)
    parsed.forEach((f, i) => {
      expect(f.width).toBe(1)
      expect(f.height).toBe(1)
      expect(f.pixels[0]).toBe(i % 256)
      expect(f.opaque[0]).toBe(1)
    })
  })
})
