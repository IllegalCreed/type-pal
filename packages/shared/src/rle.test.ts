import { describe, expect, it } from 'vitest'
import {
  decodeRle,
  parseSpriteChunk,
  parseSpriteChunkStrict,
  parseWorldSpriteChunk,
} from './rle.js'

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
    expect(frames[0]!.width).toBe(2)
    expect(frames[0]!.height).toBe(2)
  })

  it('跳过 word-offset=0 的空帧(键连续性铁律:返回数组下标 = tile 索引)', () => {
    // 2 帧:frame 0 byte 0..1 = imagecount = 2(也是 frame[0] word-offset = 2 = byte 4,有效)
    //       frame 1 byte 2..3 = 0(空缺)
    // RLE for frame 0 at byte 4
    const buf = new Uint8Array([
      0x02,
      0x00, // imagecount = 2 (= frame[0] word-offset = 2, byte 4)
      0x00,
      0x00, // frame[1] word-offset = 0 → 空
      0x01,
      0x00,
      0x01,
      0x00,
      0x01,
      0xbb, // 1×1 RLE at byte 4
    ])
    const frames = parseSpriteChunk(buf)
    expect(frames).toHaveLength(1) // 只有 frame 0
    expect(frames[0]!.width).toBe(1)
    expect(frames[0]!.height).toBe(1)
  })

  it('多帧返回下标连续(0,1,2,...),即使中间有空帧', () => {
    // 键一致性:parseSpriteChunk 返回的下标 = framesToOut 的 index
    // 空帧不占下标(continue 跳过),实帧连续排
    const buf = new Uint8Array([
      0x03,
      0x00, // imagecount = 3
      // frame[0] word-offset = 3 → byte 6(双身份:imagecount 3 = word 3 = byte 6)
      0x00,
      0x00, // frame[1] word-offset = 0 → 空,跳过
      // frame[2] word-offset = ?  需指向有效 RLE。设 byte offset = 12 → word 6
      0x06,
      0x00, // frame[2] word-offset = 6 → byte 12
      // byte 6: frame[0] RLE 1×1
      0x01,
      0x00,
      0x01,
      0x00,
      0x01,
      0x11, // 6 bytes (byte 6..11)
      // byte 12: frame[2] RLE 1×1
      0x01,
      0x00,
      0x01,
      0x00,
      0x01,
      0x33, // 6 bytes (byte 12..17)
    ])
    const frames = parseSpriteChunk(buf)
    expect(frames).toHaveLength(2)
    // 下标 0 = frame[0],下标 1 = frame[2](frame[1] 空缺,不占下标)
    expect(Array.from(frames[0]!.pixels)).toEqual([0x11])
    expect(Array.from(frames[1]!.pixels)).toEqual([0x33])
  })

  it('broken-sprite 尾帧 guard:width/height > 400 跳过', () => {
    // sdlpal "Bloody-Mouth Bug" hack:imagecount 可能多 1,尾帧 offset 指向任意位置,
    // 被当 RLE 解会得到天文数字 w/h。parseSpriteChunk 的 SPRITE_DIM_MAX guard 跳过它。
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
    expect(frames).toHaveLength(1) // 病态尾帧被 guard 跳过
    expect(frames[0]!.width).toBe(1)
  })
})

describe('parseSpriteChunkStrict', () => {
  it('接受作者编码的无 sentinel 单帧容器', () => {
    const buf = new Uint8Array([1, 0, 1, 0, 1, 0, 1, 0xbb])
    expect(parseSpriteChunkStrict(buf)).toHaveLength(1)
  })

  it('接受 PAL 末尾唯一 0 sentinel，并且不把 sentinel 计为帧', () => {
    const buf = new Uint8Array([
      2,
      0, // declaredCount=2，同时 frame0 word offset=2(byte 4)
      0,
      0, // 唯一末尾 sentinel
      1,
      0,
      1,
      0,
      1,
      0x44,
    ])
    const frames = parseSpriteChunkStrict(buf)
    expect(frames).toHaveLength(1)
    expect([...frames[0]!.pixels]).toEqual([0x44])
  })

  it('拒绝中间 0 offset 空洞', () => {
    const buf = new Uint8Array(16)
    const view = new DataView(buf.buffer)
    view.setUint16(0, 3, true)
    view.setUint16(2, 0, true)
    view.setUint16(4, 6, true)
    expect(() => parseSpriteChunkStrict(buf)).toThrow(/frame 1 offset 越界/)
  })

  it('拒绝零帧容器', () => {
    expect(() => parseSpriteChunkStrict(new Uint8Array([0, 0]))).toThrow(/不含帧/)
  })
})

describe('parseWorldSpriteChunk', () => {
  it('拒绝运行时传入的未知 profile，不能默认落入 legacy 宽容路径', () => {
    expect(() =>
      parseWorldSpriteChunk(new Uint8Array([1, 0, 1, 0, 1, 0, 1, 0x44]), 'unknown' as never),
    ).toThrow(/未知 world sprite profile/)
  })

  it('canonical 报告正常 PAL sentinel，不把它算成坏尾', () => {
    const buf = new Uint8Array([2, 0, 0, 0, 1, 0, 1, 0, 1, 0x44])
    expect(parseWorldSpriteChunk(buf, 'canonical')).toMatchObject({
      declaredSlots: 2,
      trailingSentinel: true,
      skippedLegacyTailSlots: 0,
    })
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

    expect(() => parseWorldSpriteChunk(buf, 'canonical')).toThrow()
    const parsed = parseWorldSpriteChunk(buf, 'legacy-migrated')
    expect(parsed.frames).toHaveLength(1)
    expect(parsed.trailingSentinel).toBe(false)
    expect(parsed.skippedLegacyTailSlots).toBe(1)
  })

  it('legacy-migrated 支持坏倒数第二槽 + 最后零 sentinel', () => {
    const buf = new Uint8Array(18)
    const view = new DataView(buf.buffer)
    view.setUint16(0, 3, true) // frame0 at byte 6
    view.setUint16(2, 6, true) // 坏尾 at byte 12
    view.setUint16(4, 0, true) // 正常末尾 sentinel
    view.setUint16(6, 1, true)
    view.setUint16(8, 1, true)
    buf[10] = 1
    buf[11] = 0x55
    view.setUint16(12, 500, true)
    view.setUint16(14, 1, true)

    const parsed = parseWorldSpriteChunk(buf, 'legacy-migrated')
    expect(parsed.frames).toHaveLength(1)
    expect(parsed.trailingSentinel).toBe(true)
    expect(parsed.skippedLegacyTailSlots).toBe(1)
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
