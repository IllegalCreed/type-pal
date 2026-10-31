/** Strict container structure, indexed legacy reports and bounded payload rejection. */
import { describe, expect, test } from 'vitest'
import { frameBytes, strictChunk } from './__tests__/rle-bytes.js'
import { parseIndexedRleChunk, parseSpriteChunkStrict } from './rle.js'
import { encodeSpriteChunk } from './rle-encode.js'

describe('container structure and rejected slots', () => {
  test.each([
    ['过短', new Uint8Array(1)],
    ['不含帧', new Uint8Array([0, 0])],
    ['offset table 越界', new Uint8Array([4, 0, 1, 2])],
  ])('%s：拒绝非法容器头', (message, bytes) => {
    expect(() => parseSpriteChunkStrict(bytes)).toThrow(`sprite chunk ${message}`)
  })

  test('声明1槽但没有完整帧头的容器不能伪装成纯sentinel', () => {
    // Count and slot0 share WORD0: [1,0] means count=1 and offset=2, never a zero sentinel.
    expect(() => parseSpriteChunkStrict(new Uint8Array([1, 0, 0, 0]))).toThrow(
      'sprite chunk frame 0 offset 越界',
    )
  })

  test.each([
    ['offset 非递增', 4],
    ['offset 越界', 0xfff0],
  ])('%s：第二帧独立拒绝', (message, offset) => {
    const bytes = strictChunk([
      frameBytes(2, 2, [4, 1, 1, 1, 1]),
      frameBytes(2, 2, [4, 2, 2, 2, 2]),
    ])
    // WORD0 is both count and slot0. Mutate slot1 only, keeping the table valid.
    new DataView(bytes.buffer).setUint16(2, offset / 2, true)
    expect(() => parseSpriteChunkStrict(bytes)).toThrow(`sprite chunk frame 1 ${message}`)
  })

  test.each([
    ['宽为0', 0, 0, 2],
    ['高超上限', 1, 2, 401],
  ])('%s：拒绝该帧尺寸', (_label, index, width, height) => {
    const bytes = strictChunk([
      frameBytes(2, 2, [4, 1, 1, 1, 1]),
      frameBytes(2, 2, [4, 2, 2, 2, 2]),
    ])
    const view = new DataView(bytes.buffer)
    const offset = view.getUint16(index * 2, true) << 1
    view.setUint16(offset, width, true)
    view.setUint16(offset + 2, height, true)
    expect(() => parseSpriteChunkStrict(bytes)).toThrow(`sprite chunk frame ${index} 尺寸非法`)
  })

  test('合法双帧完整通过，pixels与opaque均保序', () => {
    const bytes = strictChunk([
      frameBytes(2, 2, [4, 1, 1, 1, 1]),
      frameBytes(2, 2, [4, 2, 2, 2, 2]),
    ])
    expect(parseSpriteChunkStrict(bytes)).toEqual([
      {
        width: 2,
        height: 2,
        pixels: new Uint8Array([1, 1, 1, 1]),
        opaque: new Uint8Array([1, 1, 1, 1]),
      },
      {
        width: 2,
        height: 2,
        pixels: new Uint8Array([2, 2, 2, 2]),
        opaque: new Uint8Array([1, 1, 1, 1]),
      },
    ])
  })

  test('空 frames → 2 字节空容器（strict/索引入口一致拒绝“不含帧”）', () => {
    const out = encodeSpriteChunk([])
    expect(out).toEqual(new Uint8Array(2))
    expect(() => parseSpriteChunkStrict(out)).toThrow('sprite chunk 不含帧')
    expect(() => parseIndexedRleChunk(out, 'legacy-migrated')).toThrow('sprite chunk 不含帧')
  })
})

describe('strict payload and sentinel rules', () => {
  test('两帧混合游程：pixels/opaque 逐字节精确、palette-0 实心不混淆（无 sentinel 容器构造）', () => {
    // 帧0（2×3）：跳1透明 + 实心3（含 palette 0）+ 跳2 → 6 px 满
    const f0 = frameBytes(2, 3, [0x81, 0x03, 0x00, 0x2a, 0x2b, 0x82])
    // 帧1（3×1）：实心2 + 跳1
    const f1 = frameBytes(3, 1, [0x02, 0x11, 0x00, 0x81])
    const parsed = parseSpriteChunkStrict(strictChunk([f0, f1]))
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toEqual({
      width: 2,
      height: 3,
      pixels: new Uint8Array([0, 0x00, 0x2a, 0x2b, 0, 0]),
      opaque: new Uint8Array([0, 1, 1, 1, 0, 0]),
    })
    expect(parsed[1]).toEqual({
      width: 3,
      height: 1,
      pixels: new Uint8Array([0x11, 0x00, 0]),
      opaque: new Uint8Array([1, 1, 0]),
    })
  })

  test('末尾唯一 0 sentinel：不计帧、trailingSentinel=true、skippedLegacyTailSlots=0', () => {
    const f0 = frameBytes(1, 1, [0x01, 0x07])
    const bytes = strictChunk([f0], true)
    const expected = [
      { width: 1, height: 1, pixels: new Uint8Array([7]), opaque: new Uint8Array([1]) },
    ]
    expect(parseSpriteChunkStrict(bytes)).toEqual(expected)
    const report = parseIndexedRleChunk(bytes, 'canonical')
    expect(report).toEqual({
      frames: expected,
      declaredSlots: 2,
      trailingSentinel: true,
      skippedLegacyTailSlots: 0,
    })
  })

  test('零长度指令拒绝；同容器把 0 换成合法 2 长度 literal 即过（相邻正控）', () => {
    const bad = frameBytes(2, 1, [0x00, 0x00, 0x00, 0x00]) // 指令 0 = 零长度
    expect(() => parseSpriteChunkStrict(strictChunk([bad]))).toThrow(
      'sprite chunk frame 0 含零长度指令',
    )
    const good = frameBytes(2, 1, [0x02, 0xaa, 0xbb]) // 实心 2 满
    expect(parseSpriteChunkStrict(strictChunk([good]))[0]!.opaque).toEqual(new Uint8Array([1, 1]))
  })

  test('零长度透明段 0x80 也拒绝；不能以无进度命令卡住严格 parser', () => {
    const bad = frameBytes(1, 1, [0x80])
    expect(() => parseSpriteChunkStrict(strictChunk([bad]))).toThrow(
      'sprite chunk frame 0 含零长度指令',
    )
  })

  test.each([
    ['像素段越界', frameBytes(2, 2, [0x04, 0x01, 0x02])],
    ['透明段越界', frameBytes(2, 2, [0x88])],
    ['指令流截断', frameBytes(2, 2, [0x81, 0x02, 0xaa, 0xbb])],
    ['尺寸非法', new Uint8Array(4)],
  ])('%s：单一坏帧明确拒绝', (message, frame) => {
    expect(() => parseSpriteChunkStrict(strictChunk([frame]))).toThrow(message)
  })

  test('相邻 offset 截断前一帧帧头时拒绝，不把下一帧当作当前帧内容', () => {
    const bytes = new Uint8Array(10)
    const view = new DataView(bytes.buffer)
    view.setUint16(0, 2, true) // 两个 frame slot；frame0 offset=4
    view.setUint16(2, 3, true) // frame1 offset=6，只够截断 frame0 的两字节
    view.setUint16(6, 1, true)
    view.setUint16(8, 1, true)

    expect(() => parseSpriteChunkStrict(bytes)).toThrow('sprite chunk frame 0 offset 越界')
  })

  test('canonical 拒坏尾；同输入 legacy-migrated 跳 1 槽并精确报告', () => {
    // 帧0 合法 + 坏尾槽：offset 指向 chunk 内但 width/height=0x0FFF(4095) 超 SPRITE_DIM_MAX 不可解
    const good = frameBytes(1, 1, [0x01, 0x07])
    const badTail = frameBytes(0x0fff, 0x0fff, [0x01, 0x00])
    const declared = 3
    const tableBytes = declared * 2
    const goodLen = good.byteLength + (good.byteLength % 2)
    const parts = [good, new Uint8Array(goodLen - good.byteLength), badTail]
    const total = tableBytes + parts.reduce((sum, p) => sum + p.byteLength, 0)
    const chunk = new Uint8Array(total)
    const view = new DataView(chunk.buffer)
    // 槽 i 的 word 偏移在 byte i*2：byte0=frameCount（兼 slot0）、byte2=slot1、byte4=slot2 sentinel（保持 0）
    view.setUint16(0, declared, true)
    view.setUint16(2, (tableBytes + goodLen) / 2, true)
    chunk.set(good, tableBytes)
    chunk.set(badTail, tableBytes + goodLen)
    expect(() => parseIndexedRleChunk(chunk, 'canonical')).toThrow('sprite chunk frame 1 尺寸非法')
    const legacy = parseIndexedRleChunk(chunk, 'legacy-migrated')
    expect(legacy).toEqual({
      frames: [{ width: 1, height: 1, pixels: new Uint8Array([7]), opaque: new Uint8Array([1]) }],
      declaredSlots: 3,
      skippedLegacyTailSlots: 1,
      trailingSentinel: true,
    })
  })

  test('末帧后残留payload：仍解出独立预期的完整帧', () => {
    const rawFrame = new Uint8Array([0x01, 0x00, 0x01, 0x00, 0x01, 0x3c]) // 1×1 裸帧（w,h + 流）
    const tableBytes = 2
    const chunk = new Uint8Array(tableBytes + rawFrame.length + 3) // 帧后 3 个未消费 payload
    const view = new DataView(chunk.buffer)
    view.setUint16(0, 1, true) // frameCount=1 兼 slot0 word offset=1 → byte 2 = 表长
    chunk.set(rawFrame, tableBytes)
    chunk.set([0x00, 0xee, 0x7f], tableBytes + rawFrame.length)

    expect(parseSpriteChunkStrict(chunk)).toEqual([
      { width: 1, height: 1, pixels: new Uint8Array([0x3c]), opaque: new Uint8Array([1]) },
    ])
  })
})

describe('legacy tail ownership and refusal boundaries', () => {
  test('legacy：尾槽坏offset被跳过，保留全部有效帧并精确报告', () => {
    const out = strictChunk([
      frameBytes(2, 2, [4, 5, 5, 5, 5]),
      frameBytes(2, 2, [4, 6, 6, 6, 6]),
      new Uint8Array(),
    ])
    new DataView(out.buffer).setUint16(4, 0xfff0 >> 1, true)
    expect(parseIndexedRleChunk(out, 'legacy-migrated')).toEqual({
      frames: [
        {
          width: 2,
          height: 2,
          pixels: new Uint8Array([5, 5, 5, 5]),
          opaque: new Uint8Array([1, 1, 1, 1]),
        },
        {
          width: 2,
          height: 2,
          pixels: new Uint8Array([6, 6, 6, 6]),
          opaque: new Uint8Array([1, 1, 1, 1]),
        },
      ],
      declaredSlots: 3,
      skippedLegacyTailSlots: 1,
      trailingSentinel: false,
    })
    expect(() => parseIndexedRleChunk(out, 'canonical')).toThrow('sprite chunk frame 2 offset 越界')
  })

  test('坏尾之后仍可独立解出的帧 → 中间空洞拒绝（非坏尾）', () => {
    const out = strictChunk([
      frameBytes(2, 2, [4, 1, 1, 1, 1]),
      new Uint8Array(),
      frameBytes(2, 2, [4, 3, 3, 3, 3]),
    ])
    new DataView(out.buffer).setUint16(2, 0xfff0 >> 1, true)
    expect(() => parseIndexedRleChunk(out, 'legacy-migrated')).toThrow(
      'sprite chunk frame 2 在坏尾后仍可解，拒绝中间空洞',
    )
  })

  test('canonical 空洞 + 全零后缀：legacy 拒「只有普通 sentinel，不应进入 legacy 坏尾兼容」', () => {
    const frame = new Uint8Array([0x01, 0x00, 0x01, 0x00, 0x01, 0x3c])
    const chunk = new Uint8Array(6 + frame.length)
    const view = new DataView(chunk.buffer)
    view.setUint16(0, 3, true) // 3 槽：slot0 word=3 → @6 = 表长；slot1/slot2 = 0
    chunk.set(frame, 6)

    expect(() => parseSpriteChunkStrict(chunk)).toThrow('frame 1 offset 越界')
    expect(() => parseIndexedRleChunk(chunk, 'legacy-migrated')).toThrow('只有普通 sentinel')
  })

  test('坏槽前无任何有效帧：canonical 拒「尺寸非法」，legacy 拒「尾槽前不含有效帧」', () => {
    const chunk = new Uint8Array(8)
    const view = new DataView(chunk.buffer)
    view.setUint16(0, 2, true) // slot0 word=2 → @4；slot1 = 0 sentinel
    view.setUint16(4, 0xffff, true) // w = 65535 > 400
    view.setUint16(6, 1, true)

    expect(() => parseSpriteChunkStrict(chunk)).toThrow('尺寸非法')
    expect(() => parseIndexedRleChunk(chunk, 'legacy-migrated')).toThrow('尾槽前不含有效帧')
  })
})
