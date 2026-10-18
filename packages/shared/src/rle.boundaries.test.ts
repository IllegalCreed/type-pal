/**
 * TEST-RESOURCE-TOOLS-COVERAGE-1 R01：严格 RLE 容器边界（shared/rle.ts）。
 * 与 rle.test / rle.glm-o 在 sentinel、坏尾等轴存在相邻重叠（入口、oracle、错误
 * 合同不全相同；跨文件排重映射另核，不在此声称互斥）。
 * 本文件：手列严格容器字节核完整 pixels/opaque/report、有界零长度指令单轴、
 * 段越界/尺寸/offset 单轴与相邻正控、canonical 与 legacy-migrated 精确区分。
 */
import { describe, expect, test } from 'vitest'
import { parseIndexedRleChunk, parseSpriteChunkStrict } from './rle.js'

/** 帧字节：u16LE 宽/高 + 指令流。 */
function frameBytes(width: number, height: number, commands: number[]): Uint8Array {
  return new Uint8Array([width & 0xff, width >> 8, height & 0xff, height >> 8, ...commands])
}

/** 偶对齐帧 + 严格容器（offset 表 word 偏移递增、frame0=表长）。 */
function strictChunk(frames: readonly Uint8Array[], sentinel = false): Uint8Array {
  const padded = frames.map((f) => (f.byteLength % 2 === 0 ? f : new Uint8Array([...f, 0x00])))
  const declared = padded.length + (sentinel ? 1 : 0)
  const tableBytes = declared * 2
  const offsets: number[] = []
  let at = tableBytes
  for (const f of padded) {
    offsets.push(at)
    at += f.byteLength
  }
  const out = new Uint8Array(at + (sentinel ? 2 : 0))
  const view = new DataView(out.buffer)
  view.setUint16(0, declared, true)
  padded.forEach((_f, i) => view.setUint16(i * 2, offsets[i]! / 2, true))
  // sentinel 槽在表尾（word 0）
  padded.forEach((f, i) => out.set(f, offsets[i]!))
  return out
}

describe('R01 parseSpriteChunkStrict 手列字节完整核', () => {
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
    const report = parseIndexedRleChunk(strictChunk([f0], true), 'canonical')
    expect(report.frames).toHaveLength(1)
    expect(report.declaredSlots).toBe(2)
    expect(report.trailingSentinel).toBe(true)
    expect(report.skippedLegacyTailSlots).toBe(0)
    expect(report.frames[0]!.pixels).toEqual(new Uint8Array([0x07]))
  })
})

describe('R01 严格拒绝单轴与相邻正控', () => {
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
  test('像素段越界 / 透明段越界 / 指令流截断 / 尺寸非法各单轴', () => {
    expect(
      () => parseSpriteChunkStrict(strictChunk([frameBytes(2, 2, [0x04, 0x01, 0x02])])), // 声明 4 字节只给 3
    ).toThrow('像素段越界')
    expect(
      () => parseSpriteChunkStrict(strictChunk([frameBytes(2, 2, [0x88])])), // 跳 8 > total 4
    ).toThrow('透明段越界')
    expect(
      () => parseSpriteChunkStrict(strictChunk([frameBytes(2, 2, [0x81, 0x02, 0xaa, 0xbb])])), // 3 px 后流恰尽，target<total
    ).toThrow('指令流截断')
    // w=h=0 → 走尺寸非法轴（header 边界轴由「相邻 offset 截断帧头」例覆盖）
    expect(() => parseSpriteChunkStrict(strictChunk([new Uint8Array(4)]))).toThrow('尺寸非法')
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
    expect(() => parseIndexedRleChunk(chunk, 'canonical')).toThrow()
    const legacy = parseIndexedRleChunk(chunk, 'legacy-migrated')
    expect(legacy.frames).toHaveLength(1)
    expect(legacy.declaredSlots).toBe(3)
    expect(legacy.skippedLegacyTailSlots).toBe(1)
    expect(legacy.trailingSentinel).toBe(true) // 末槽仍是唯一 0 sentinel；坏尾在其前
  })
})
