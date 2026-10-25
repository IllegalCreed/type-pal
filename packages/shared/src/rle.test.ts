import { describe, expect, it } from 'vitest'
import { decodeRle, parseSpriteChunk, parseWorldSpriteChunk } from './rle.js'

describe('decodeRle', () => {
  it('2×2 实心方块', () => {
    // 头:width=2(0x0002 LE)、height=2;然后 4 个像素值 = 0xAA
    // 编码:0x04(直接 4 像素)+ 0xAA 0xAA 0xAA 0xAA
    const buf = new Uint8Array([0x02, 0x00, 0x02, 0x00, 0x04, 0xaa, 0xaa, 0xaa, 0xaa])
    const frame = decodeRle(buf)
    expect(frame.width).toBe(2)
    expect(frame.height).toBe(2)
    expect(Array.from(frame.pixels)).toEqual([0xaa, 0xaa, 0xaa, 0xaa])
    expect(Array.from(frame.opaque)).toEqual([1, 1, 1, 1])
  })

  it('透明像素填 0 + opaque 标 0', () => {
    // 2×1:跳 2 个像素(0x82) → 全透明
    const buf = new Uint8Array([0x02, 0x00, 0x01, 0x00, 0x82])
    const frame = decodeRle(buf)
    expect(Array.from(frame.pixels)).toEqual([0, 0])
    expect(Array.from(frame.opaque)).toEqual([0, 0])
  })

  it('混合 —— 1 透明 + 2 实心 + 1 透明', () => {
    // 4×1:跳 1(0x81) + 直 2(0x02 0xCC 0xDD) + 跳 1(0x81)
    const buf = new Uint8Array([0x04, 0x00, 0x01, 0x00, 0x81, 0x02, 0xcc, 0xdd, 0x81])
    const frame = decodeRle(buf)
    expect(Array.from(frame.pixels)).toEqual([0, 0xcc, 0xdd, 0])
    expect(Array.from(frame.opaque)).toEqual([0, 1, 1, 0])
  })

  it('palette-0 实心像素也被标 opaque(不与透明混淆)', () => {
    // 关键不变式:M3.5 fix —— opaque palette-0 是合法像素,不能被当透明
    // 2×1:直 2(0x02) + 像素 0x00 0x00
    const buf = new Uint8Array([0x02, 0x00, 0x01, 0x00, 0x02, 0x00, 0x00])
    const frame = decodeRle(buf)
    expect(Array.from(frame.pixels)).toEqual([0, 0])
    expect(Array.from(frame.opaque)).toEqual([1, 1])
  })

  it.each([0, 0x80])('无像素进度命令字节 %i（十进制）后仍可解合法 literal', (command) => {
    expect(decodeRle(new Uint8Array([1, 0, 1, 0, command, 1, 0x44]))).toEqual({
      width: 1,
      height: 1,
      pixels: new Uint8Array([0x44]),
      opaque: new Uint8Array([1]),
    })
  })

  it('未填满像素且源流耗尽时显式失败', () => {
    expect(() => decodeRle(new Uint8Array([1, 0, 2, 0, 0x81]))).toThrow(
      'RLE: command stream truncated',
    )
  })

  it('literal payload 缺字节时显式失败', () => {
    expect(() => decodeRle(new Uint8Array([1, 0, 1, 0, 1]))).toThrow('RLE: pixel run exceeds frame')
  })

  it('透明段超过声明像素数时显式失败', () => {
    expect(() => decodeRle(new Uint8Array([1, 0, 1, 0, 0x82]))).toThrow(
      'RLE: transparent run exceeds frame',
    )
  })

  it('literal 数量超过声明像素数时显式失败', () => {
    expect(() => decodeRle(new Uint8Array([1, 0, 1, 0, 2, 0xaa, 0xbb]))).toThrow(
      'RLE: pixel run exceeds frame',
    )
  })

  it('通用帧可解超过 sprite 容器上限的合法宽度', () => {
    const bytes = new Uint8Array([0x91, 1, 1, 0, 0xff, 0xff, 0xff, 0x94])
    const decoded = decodeRle(bytes)
    expect(decoded.width).toBe(401)
    expect(decoded.height).toBe(1)
    expect(decoded.pixels).toEqual(new Uint8Array(401))
    expect(decoded.opaque).toEqual(new Uint8Array(401))
  })
})

describe('parseSpriteChunk', () => {
  it('切 1 帧 —— byte 0..1 = imagecount = 1,frame[0] word-offset = 1 (=2 字节)', () => {
    // frame 0:byte 0..1 = imagecount = 1 → word-offset = 1 → byte offset = 2
    // RLE data 从 byte 2 起
    const buf = new Uint8Array([
      0x01,
      0x00, // imagecount = 1;同时 frame[0] word-offset = 1 (=byte 2)
      0x02,
      0x00,
      0x02,
      0x00,
      0x04,
      0xaa,
      0xaa,
      0xaa,
      0xaa, // RLE 2×2 at byte 2
    ])
    const frames = parseSpriteChunk(buf)
    expect(frames).toHaveLength(1)
    expect(frames[0]).toEqual({
      width: 2,
      height: 2,
      pixels: new Uint8Array([0xaa, 0xaa, 0xaa, 0xaa]),
      opaque: new Uint8Array([1, 1, 1, 1]),
    })
  })

  it('中间与末尾空槽都不占返回下标，完整帧保持原顺序', () => {
    // Four slots: frame0@8, empty, frame2@14, final zero sentinel.
    const buf = new Uint8Array([4, 0, 0, 0, 7, 0, 0, 0, 1, 0, 1, 0, 1, 0x11, 1, 0, 1, 0, 1, 0x33])
    expect(parseSpriteChunk(buf)).toEqual([
      { width: 1, height: 1, pixels: new Uint8Array([0x11]), opaque: new Uint8Array([1]) },
      { width: 1, height: 1, pixels: new Uint8Array([0x33]), opaque: new Uint8Array([1]) },
    ])
  })

  it('broken-sprite 尾帧 guard:width/height > 400 跳过', () => {
    // SDLPal documents a bad trailing offset; the <=400 dimension filter is TS policy.
    // This fixture tests that TS policy, not native sprite filtering.
    // 构造:imagecount=2,frame0 正常(1×1),frame1 病态(w=500,h=1)
    const buf = new Uint8Array(20)
    const v = new DataView(buf.buffer)
    v.setUint16(0, 2, true) // imagecount = 2(byte 0..1;同时 frame0 word-offset = 2)
    v.setUint16(2, 5, true) // frame1 word-offset = 5 → byte 10
    // frame0 at byte 4(imagecount=2 → word 2 → byte 4):1×1 RLE
    v.setUint16(4, 1, true) // w=1
    v.setUint16(6, 1, true) // h=1
    buf[8] = 0x01 // 直 1 像素
    buf[9] = 0x22 // 像素值
    // frame1 at byte 10:病态 w=500 h=1
    v.setUint16(10, 500, true) // w=500
    v.setUint16(12, 1, true) // h=1
    const frames = parseSpriteChunk(buf)
    expect(frames).toEqual([
      { width: 1, height: 1, pixels: new Uint8Array([0x22]), opaque: new Uint8Array([1]) },
    ])
  })

  it('宽容入口跳过截断坏帧并保留后续合法帧', () => {
    const buf = new Uint8Array([
      0x02,
      0x00, // imagecount = 2
      0x05,
      0x00, // frame 1 at byte 10
      0x0a,
      0x00,
      0x01,
      0x00, // frame 0: complete 10×1 header passes the dimension guard
      0x0a,
      0xaa, // literal needs 10 bytes; only 7 remain even including frame 1
      0x01,
      0x00,
      0x01,
      0x00,
      0x01,
      0x55, // frame 1: valid 1×1, preserved after the decoder rejects frame 0
    ])
    const frames = parseSpriteChunk(buf)
    expect(frames).toEqual([
      { width: 1, height: 1, pixels: new Uint8Array([0x55]), opaque: new Uint8Array([1]) },
    ])
  })
})

describe('parseWorldSpriteChunk', () => {
  it('拒绝运行时传入的未知 profile，不能默认落入 legacy 宽容路径', () => {
    expect(() =>
      Reflect.apply(parseWorldSpriteChunk, undefined, [
        new Uint8Array([1, 0, 1, 0, 1, 0, 1, 0x44]),
        'unknown',
      ]),
    ).toThrow(/未知 world sprite profile/)
  })

  it('legacy-migrated 只跳过不可解的非零尾槽', () => {
    const buf = new Uint8Array(16)
    const view = new DataView(buf.buffer)
    view.setUint16(0, 2, true) // frame0 at byte 4
    view.setUint16(2, 5, true) // 坏尾 at byte 10
    view.setUint16(4, 1, true)
    view.setUint16(6, 1, true)
    buf[8] = 1
    buf[9] = 0x33
    view.setUint16(10, 500, true)
    view.setUint16(12, 1, true)

    expect(() => parseWorldSpriteChunk(buf, 'canonical')).toThrow('sprite chunk frame 1 尺寸非法')
    expect(parseWorldSpriteChunk(buf, 'legacy-migrated')).toEqual({
      frames: [
        { width: 1, height: 1, pixels: new Uint8Array([0x33]), opaque: new Uint8Array([1]) },
      ],
      declaredSlots: 2,
      trailingSentinel: false,
      skippedLegacyTailSlots: 1,
    })
  })

  it('坏槽之后仍有可解帧时拒绝，不能把中间空洞伪装成坏尾', () => {
    const buf = new Uint8Array(18)
    const view = new DataView(buf.buffer)
    view.setUint16(0, 3, true)
    view.setUint16(2, 0, true)
    view.setUint16(4, 6, true)
    for (const offset of [6, 12]) {
      view.setUint16(offset, 1, true)
      view.setUint16(offset + 2, 1, true)
      buf[offset + 4] = 1
      buf[offset + 5] = 0x77
    }
    expect(() => parseWorldSpriteChunk(buf, 'legacy-migrated')).toThrow(/坏尾后仍可解/)
  })

  it('首个坏尾槽本身仍指向可解帧时拒绝，不能把重复 offset 当历史坏尾', () => {
    const buf = new Uint8Array(12)
    const view = new DataView(buf.buffer)
    view.setUint16(0, 3, true) // frame0 at byte 6
    view.setUint16(2, 3, true) // 重复指回同一可解帧
    view.setUint16(4, 0, true)
    view.setUint16(6, 1, true)
    view.setUint16(8, 1, true)
    buf[10] = 1
    buf[11] = 0x66

    expect(() => parseWorldSpriteChunk(buf, 'legacy-migrated')).toThrow(/坏尾后仍可解/)
  })
})
