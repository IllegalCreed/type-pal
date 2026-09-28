/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R01（shared/rle.ts）。
 * 去重账：rle.test 覆盖基础游程/palette0/sentinel/坏尾；rle.boundaries（RESOURCE-TOOLS-COVERAGE-1 R01）
 * 覆盖严格容器手列字节/零长指令/段越界/canonical-legacy 区分；game rle-decode.test 有 1 例
 * skipFilePrefix 正控。本文件只做未占用合同：skipFilePrefix 选项矩阵、帧后尾随字节截断边界、
 * 子数组 byteOffset 传播、严格容器末帧未消费 payload、legacy 两个合法邻接拒绝分支。
 */
import { describe, expect, test } from 'vitest'
import { decodeRle, parseIndexedRleChunk, parseSpriteChunk, parseSpriteChunkStrict } from './rle.js'

/** 1×2 帧：跳1透明 + 实心 palette-0。 */
const FRAME_1X2 = new Uint8Array([0x01, 0x00, 0x02, 0x00, 0x81, 0x01, 0x00])

describe('R01 decodeRle skipFilePrefix 选项矩阵', () => {
  test('0x00000002 前缀 + 选项：从 byte 4 解码（sdlpal palcommon.c:722-728 单帧整-chunk 头）', () => {
    const buf = new Uint8Array([0x02, 0x00, 0x00, 0x00, ...FRAME_1X2])
    const frame = decodeRle(buf, { skipFilePrefix: true })
    expect(frame.width).toBe(1)
    expect(frame.height).toBe(2)
    expect([...frame.opaque]).toEqual([0, 1])
    expect(frame.pixels[1]).toBe(0) // opaque palette-0 保真
  })

  test('同缓冲不传选项：不跳前缀，头从 byte 0 读（w=2,h=0 空帧）', () => {
    const buf = new Uint8Array([0x02, 0x00, 0x00, 0x00, ...FRAME_1X2])
    const frame = decodeRle(buf)
    expect(frame.width).toBe(2)
    expect(frame.height).toBe(0)
    expect(frame.pixels).toHaveLength(0)
  })

  test('传选项但首 4 字节非该前缀：不跳，正常解码', () => {
    const buf = new Uint8Array([0x01, 0x00, 0x01, 0x00, 0x01, 0x5a])
    const frame = decodeRle(buf, { skipFilePrefix: true })
    expect(frame.width).toBe(1)
    expect(frame.height).toBe(1)
    expect(frame.pixels[0]).toBe(0x5a)
    expect(frame.opaque[0]).toBe(1)
  })

  test('缓冲 <4 字节 + 选项：长度守卫不跳、不挂起，解出零尺寸帧', () => {
    const frame = decodeRle(new Uint8Array([0x02, 0x00, 0x00]), { skipFilePrefix: true })
    expect(frame.width).toBe(2)
    expect(frame.height).toBe(0)
  })
})

describe('R01 decodeRle 帧后尾随字节（截断边界自上侧）', () => {
  test('完整帧后追加任意字节：解码结果与精确长度输入逐字段相等', () => {
    const exact = decodeRle(FRAME_1X2)
    const padded = new Uint8Array([...FRAME_1X2, 0xff, 0x00, 0x7f, 0x33])
    const fromPadded = decodeRle(padded)
    expect(fromPadded.width).toBe(exact.width)
    expect(fromPadded.height).toBe(exact.height)
    expect([...fromPadded.pixels]).toEqual([...exact.pixels])
    expect([...fromPadded.opaque]).toEqual([...exact.opaque])
  })
})

describe('R01 子数组 byteOffset 传播', () => {
  /** 把 bytes 嵌进奇数偏移的大缓冲（前后垫垃圾），返回 subarray 视图。 */
  function oddView(bytes: Uint8Array): Uint8Array {
    const start = 7
    const parent = new Uint8Array(start + bytes.length + 5)
    parent.fill(0xab)
    parent.set(bytes, start)
    return parent.subarray(start, start + bytes.length)
  }

  test('decodeRle / parseSpriteChunk / strict / indexed 在 subarray 上与独立缓冲等价', () => {
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

    expect(decodeRle(oddView(FRAME_1X2))).toStrictEqual(decodeRle(FRAME_1X2))

    const fromView = parseSpriteChunk(oddView(withSentinel))
    expect(fromView).toHaveLength(1)
    expect(fromView[0]!.pixels[0]).toBe(0x3c)

    const strictStandalone = parseSpriteChunkStrict(withSentinel)
    const strictView = parseSpriteChunkStrict(oddView(withSentinel))
    expect(strictView).toStrictEqual(strictStandalone)

    const reportStandalone = parseIndexedRleChunk(noSentinel, 'canonical')
    const reportView = parseIndexedRleChunk(oddView(noSentinel), 'canonical')
    expect(reportView).toStrictEqual(reportStandalone)
    expect(reportView.frames).toHaveLength(1)
    expect(reportView.trailingSentinel).toBe(false)
  })
})

describe('R01 严格容器末帧未消费 payload（rle.ts:162 帧边界唯一真值）', () => {
  test('末帧指令流后残留对齐字节：解析成功且帧语义与精确长度版本相等', () => {
    const rawFrame = new Uint8Array([0x01, 0x00, 0x01, 0x00, 0x01, 0x3c]) // 1×1 裸帧（w,h + 流）
    const tableBytes = 2
    const chunk = new Uint8Array(tableBytes + rawFrame.length + 3) // 帧后 3 个未消费 payload
    const view = new DataView(chunk.buffer)
    view.setUint16(0, 1, true) // frameCount=1 兼 slot0 word offset=1 → byte 2 = 表长
    chunk.set(rawFrame, tableBytes)
    chunk.set([0x00, 0xee, 0x7f], tableBytes + rawFrame.length)

    const parsed = parseSpriteChunkStrict(chunk)
    expect(parsed).toHaveLength(1)
    const exact = parseSpriteChunkStrict(
      new Uint8Array([0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x3c]),
    )
    expect(parsed[0]).toStrictEqual(exact[0])
  })
})

describe('R01 legacy 合法邻接拒绝分支', () => {
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
