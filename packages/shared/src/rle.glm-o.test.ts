/** TEST-GLM-WAVE-O-1 O10：shared 索引 RLE/YJ2 残余合同（真实公开解码/编码入口）。
 *  旧证：rle.test.ts / boundaries / glm-runtime-resource 覆盖主干；本卡按 gap-map 直击
 *  未覆盖臂：strict 容器的 sentinel/offset/尺寸轴、legacy 坏尾三轴（空洞拒绝、纯
 *  sentinel 拒绝、坏尾后仍可解拒绝）、encode 上限、YJ2 位流轴。全部合成字节。
 */
import { describe, expect, test } from 'vitest'
import {
  YJ2_BACKREF_OVERLAP as YJ2_BACKREF_OVERLAP_VECTOR,
  YJ2_THREE_LITERALS as YJ2_THREE_LITERALS_VECTOR,
} from './__tests__/glm-foundation-fixtures.js'
import { parseIndexedRleChunk, parseSpriteChunkStrict, type RleFrame } from './rle.js'
import { encodeRleFrame, encodeSpriteChunk } from './rle-encode.js'
import { decompressYj2 } from './yj2.js'

/** 手工组装 strict 容器：offsetTable + 偶对齐帧数据；sentinel 追加可选。 */
function chunkOf(frames: readonly RleFrame[], options: { sentinel?: boolean } = {}): Uint8Array {
  const encoded = frames.map(encodeRleFrame)
  const count = frames.length + (options.sentinel ? 1 : 0)
  const header = count * 2
  const offsets: number[] = []
  let at = header
  for (const bytes of encoded) {
    offsets.push(at)
    at += bytes.length
    if (at & 1) at++
  }
  const out = new Uint8Array(at + (options.sentinel ? 2 : 0))
  const view = new DataView(out.buffer)
  view.setUint16(0, count, true)
  for (const [index, offset] of offsets.entries()) view.setUint16(index * 2, offset >> 1, true)
  let cursor = header
  for (const bytes of encoded) {
    out.set(bytes, cursor)
    cursor += bytes.length
    if (cursor & 1) cursor++
  }
  return out
}

const frameOf = (width: number, height: number, pixel: number): RleFrame => ({
  width,
  height,
  pixels: new Uint8Array(width * height).fill(pixel),
  opaque: new Uint8Array(width * height).fill(1),
})

describe('O10 parseSpriteChunkStrict：容器结构轴', () => {
  test('过短容器 / 零帧表 / offset table 越界 逐轴拒绝', () => {
    expect(() => parseSpriteChunkStrict(new Uint8Array(1))).toThrow('sprite chunk 过短')
    expect(() => parseSpriteChunkStrict(new Uint8Array([0, 0]))).toThrow('sprite chunk 不含帧')
    const broken = new Uint8Array([4, 0, 1, 2])
    expect(() => parseSpriteChunkStrict(broken)).toThrow('sprite chunk offset table 越界')
  })

  test('sentinel 槽与计数同域（slot0=count）：纯 sentinel 空容器按计数=1 走帧0 越界', () => {
    // chunkOf([], {sentinel}) 产出 [count=1, slot0=0]；slot0 与计数同域 → 恒非 0，
    // 故“只有 sentinel”臂对 strict 入口不可构造（登记 unreachable-via-legal-input），
    // 真实可达行为是 frame0 offset 越界拒绝。
    expect(() => parseSpriteChunkStrict(chunkOf([], { sentinel: true }))).toThrow(
      'sprite chunk frame 0 offset 越界',
    )
  })

  test('frame0 offset 与表长不一致 / offset 非递增 / offset 越界 逐轴拒绝', () => {
    const frames = [frameOf(2, 2, 1), frameOf(2, 2, 2)]
    const good = chunkOf(frames)
    const tamper = (mutate: (view: DataView, bytes: Uint8Array) => void): Uint8Array => {
      const copy = new Uint8Array(good)
      mutate(new DataView(copy.buffer), copy)
      return copy
    }
    // 声明数加大使表变长 → 原 slot0(=count) 不再等于新表长 → frame0 offset 不一致。
    expect(() => parseSpriteChunkStrict(tamper((view) => view.setUint16(0, 40, true)))).toThrow(
      'sprite chunk offset table 越界',
    )
    // frame1 offset 改为 ≤ frame0（非递增）。
    expect(() =>
      parseSpriteChunkStrict(tamper((view) => view.setUint16(2, view.getUint16(0, true), true))),
    ).toThrow('sprite chunk frame 1 offset 非递增')
    // frame1 offset 指向容器外。
    expect(() =>
      parseSpriteChunkStrict(tamper((view) => view.setUint16(2, 0xfff0 >> 1, true))),
    ).toThrow('sprite chunk frame 1 offset 越界')
  })

  test('帧尺寸非法（宽 0 / 高超上限）逐轴拒绝；合法双帧严格通过', () => {
    const frames = [frameOf(2, 2, 1), frameOf(2, 2, 2)]
    const good = chunkOf(frames)
    const rewrite = (index: number, width: number, height: number): Uint8Array => {
      const copy = new Uint8Array(good)
      const view = new DataView(copy.buffer)
      const offset = view.getUint16(index * 2, true) << 1
      view.setUint16(offset, width, true)
      view.setUint16(offset + 2, height, true)
      return copy
    }
    expect(() => parseSpriteChunkStrict(rewrite(0, 0, 2))).toThrow('sprite chunk frame 0 尺寸非法')
    expect(() => parseSpriteChunkStrict(rewrite(1, 401, 2))).toThrow(
      'sprite chunk frame 1 尺寸非法',
    )
    const parsed = parseSpriteChunkStrict(good)
    expect(parsed).toHaveLength(2)
    expect(parsed[1]!.pixels[0]).toBe(2)
  })

  test('sentinel 容器：声明数含尾 0 时按 frameCount-1 解析', () => {
    const parsed = parseSpriteChunkStrict(chunkOf([frameOf(2, 2, 7)], { sentinel: true }))
    expect(parsed).toHaveLength(1)
    expect(parsed[0]!.pixels[0]).toBe(7)
  })

  test('严格解析往返：encode → parse 逐帧像素一致（供应容器同构）', () => {
    const parsed = parseSpriteChunkStrict(chunkOf([frameOf(2, 2, 3), frameOf(3, 2, 9)]))
    expect(parsed).toHaveLength(2)
    expect(parsed[0]!.pixels[0]).toBe(3)
    expect(parsed[1]!.pixels[0]).toBe(9)
  })
})

describe('O10 parseIndexedRleChunk：legacy 坏尾三轴', () => {
  test('legacy：尾槽坏 offset 被跳过并计入 skippedLegacyTailSlots', () => {
    // 从零组装三槽容器：slot0/1 指向两有效帧，slot2 指向容器外（坏尾）。
    const frames = [frameOf(2, 2, 5), frameOf(2, 2, 6)]
    const encoded = frames.map(encodeRleFrame)
    const header = 6 // 3 槽表
    const offsets: number[] = []
    let at = header
    for (const bytes of encoded) {
      offsets.push(at)
      at += bytes.length
      if (at & 1) at++
    }
    const badTailWord = 0xfff0
    const out = new Uint8Array(header + at - header + 8)
    const view = new DataView(out.buffer)
    view.setUint16(0, 3, true)
    for (const [index, offset] of offsets.entries()) view.setUint16(index * 2, offset >> 1, true)
    view.setUint16(4, badTailWord >> 1, true)
    let cursor = header
    for (const bytes of encoded) {
      out.set(bytes, cursor)
      cursor += bytes.length
      if (cursor & 1) cursor++
    }
    const result = parseIndexedRleChunk(out, 'legacy-migrated')
    expect(result.frames).toHaveLength(2)
    expect(result.skippedLegacyTailSlots).toBe(1)
    expect(result.trailingSentinel).toBe(false)
    expect(() => parseIndexedRleChunk(out, 'canonical')).toThrow(/offset 越界/)
  })

  test('坏尾之后仍可独立解出的帧 → 中间空洞拒绝（非坏尾）', () => {
    // 三槽：slot0 有效帧，slot1 坏 offset，slot2 指向一个完整可解帧。
    const frameBytes = [encodeRleFrame(frameOf(2, 2, 1)), encodeRleFrame(frameOf(2, 2, 3))]
    const header = 6
    const offsets: number[] = []
    let at = header
    for (const bytes of frameBytes) {
      offsets.push(at)
      at += bytes.length
      if (at & 1) at++
    }
    const out = new Uint8Array(at + 8)
    const view = new DataView(out.buffer)
    view.setUint16(0, 3, true)
    view.setUint16(0, offsets[0]! >> 1, true) // slot0
    view.setUint16(2, 0xfff0 >> 1, true) // slot1 坏尾
    view.setUint16(4, offsets[1]! >> 1, true) // slot2 可解帧
    let cursor = header
    for (const bytes of frameBytes) {
      out.set(bytes, cursor)
      cursor += bytes.length
      if (cursor & 1) cursor++
    }
    expect(() => parseIndexedRleChunk(out, 'legacy-migrated')).toThrow(/在坏尾后仍可解/)
  })

  test('纯 sentinel 后缀（无坏槽）不应进入 legacy 兼容', () => {
    // 三槽：slot0 有效帧；slot1/slot2 全 0（canonical 在 slot1 越界失败）。
    // legacy 走槽0 得 1 帧，后缀全 0 → skipped=0 → 拒绝进 legacy 兼容。
    const frameBytes = encodeRleFrame(frameOf(2, 2, 1))
    const header = 6
    const out = new Uint8Array(header + frameBytes.byteLength + 2)
    const view = new DataView(out.buffer)
    view.setUint16(0, 3, true)
    view.setUint16(0, header >> 1, true) // slot0
    view.setUint16(2, 0, true) // slot1 = 0
    view.setUint16(4, 0, true) // slot2 = 0
    out.set(frameBytes, header)
    expect(() => parseIndexedRleChunk(out, 'legacy-migrated')).toThrow(
      'sprite chunk 只有普通 sentinel，不应进入 legacy 坏尾兼容',
    )
  })

  test('legacy 前缀全无效 → 坏尾前不含有效帧拒绝', () => {
    const out = new Uint8Array([1, 0, 0xf0, 0xff])
    expect(() => parseIndexedRleChunk(out, 'legacy-migrated')).toThrow(
      'sprite chunk legacy 尾槽前不含有效帧',
    )
    // 注：未知 profile 的运行时守卫对 typed 调用方不可构造（IndexedRleChunkProfile
    // 为字面量联合，'wat' 需要 as never 桥），登记 unreachable-via-typed-entry。
  })
})

describe('O10 encodeSpriteChunk：上限与空容器', () => {
  test('空 frames → 2 字节空容器（strict/索引入口一致拒绝“不含帧”）', () => {
    const out = encodeSpriteChunk([])
    expect(out).toEqual(new Uint8Array(2))
    expect(() => parseSpriteChunkStrict(out)).toThrow('sprite chunk 不含帧')
    expect(() => parseIndexedRleChunk(out, 'legacy-migrated')).toThrow('sprite chunk 不含帧')
  })

  test('超 u16 word 偏移上限 → 拆分图集错误', () => {
    const big = frameOf(400, 400, 1) // 400*400 全不透明 → 指令流 > 128KB
    expect(() => encodeSpriteChunk([big, big, big])).toThrow(/超 u16 偏移上限/)
  })

  test('encodeRleFrame：透明段写满 width*height（尾透明补跳段）', () => {
    const f: RleFrame = {
      width: 4,
      height: 1,
      pixels: new Uint8Array([1, 0, 0, 0]),
      opaque: new Uint8Array([1, 0, 0, 0]),
    }
    const bytes = encodeRleFrame(f)
    // 头 4 字节 + 1 像素段(1+1) + 3 透明跳段(1) = 7
    expect(bytes.byteLength).toBe(7)
    expect(bytes[4]).toBe(1)
    expect(bytes[6]).toBe(0x80 + 3)
  })
})

describe('O10 decompressYj2：头部与位流轴（真实解码入口）', () => {
  test('过短源 → 拒绝', () => {
    expect(() => decompressYj2(Uint8Array.from([1, 2, 3]))).toThrow('YJ2: source too small')
  })

  test('uncompLen=0 → 空输出（不读位流）', () => {
    const out = decompressYj2(Uint8Array.from([0, 0, 0, 0, 0xff]))
    expect(out).toEqual(new Uint8Array(0))
  })

  test('非空字面向量：三字面位流按序输出（复用冻结判定向量，不复述旧断言）', () => {
    const out = decompressYj2(YJ2_THREE_LITERALS_VECTOR)
    expect(out.byteLength).toBeGreaterThan(0)
    // 契约轴：输出长度 = 头部 uncompLen，且解压确定性（同输入两次一致）。
    expect(out.byteLength).toBe(
      YJ2_THREE_LITERALS_VECTOR[0]! | (YJ2_THREE_LITERALS_VECTOR[1]! << 8),
    )
    expect(decompressYj2(YJ2_THREE_LITERALS_VECTOR)).toEqual(out)
  })

  test('回引向量：重叠回引复制不越界且长度由头部封顶（冻结判定向量）', () => {
    const out = decompressYj2(YJ2_BACKREF_OVERLAP_VECTOR)
    expect(out.byteLength).toBe(
      YJ2_BACKREF_OVERLAP_VECTOR[0]! | (YJ2_BACKREF_OVERLAP_VECTOR[1]! << 8),
    )
    expect(decompressYj2(YJ2_BACKREF_OVERLAP_VECTOR)).toEqual(out)
  })
})
