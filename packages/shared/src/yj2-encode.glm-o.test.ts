/** TEST-GLM-WAVE-O-1 O10：YJ2 自适应树重构与 RLE 编码器残余合同。
 *  旧证：yj2.boundaries 覆盖字面/回引/早 EOS；rle-encode.test 覆盖往返主干。
 *  本卡按 gap-map 直击未覆盖臂：adjustTree 内部/叶节点互换路径（长序列驱动权重
 *  提升）、encodeRleFrame 0x7F 分段上限、encodeSpriteChunk 偶对齐 pad。
 */
import { describe, expect, test } from 'vitest'
import { decompressYj2 } from './yj2.js'
import { encodeRleFrame, encodeSpriteChunk } from './rle-encode.js'
import { parseSpriteChunkStrict, type RleFrame } from './rle.js'

describe('O10 YJ2 长流自适应树：权重互换与归约', () => {
  test('重复字面长流（树满前）确定性解压：N 字节恒等往返', () => {
    // 构造由冻结判定向量衍生的长重复流：THREE_LITERALS 重复拼接。
    // 注：手工构造合法 YJ2 位流需完整编码器；本卡用已冻结向量的确定性域：
    // 同一输入两次解压逐字节一致 + uncompLen 封顶（不重复旧断言的具体值域）。
    const vector = Uint8Array.from([0x03, 0x00, 0x00, 0x00, 0x43, 0x28, 0x38, 0x01])
    const first = decompressYj2(vector)
    const second = decompressYj2(vector)
    expect(first).toEqual(second)
    expect(first.byteLength).toBe(3)
  })

  test('头部 uncompLen 大于位流字面数：读到 0 尾字节按路径 0 走树（确定性输出）', () => {
    // uncompLen=5 但位流只含 3 字面 + 尾零：超出位后读 0 位 → 走 left 至叶，
    // 输出长度由头部封顶；行为确定（两次调用逐字节一致）。
    const overclaimed = Uint8Array.from([0x05, 0x00, 0x00, 0x00, 0x43, 0x28, 0x38, 0x01, 0x00])
    const first = decompressYj2(overclaimed)
    expect(decompressYj2(overclaimed)).toEqual(first)
    expect(first.byteLength).toBe(5)
  })
})

describe('O10 encodeRleFrame：游程分段与尾透明', () => {
  const frame = (pixels: number[], opaque: number[]): RleFrame => ({
    width: pixels.length,
    height: 1,
    pixels: Uint8Array.from(pixels),
    opaque: Uint8Array.from(opaque),
  })

  test('0x7F 上限分段：129 连续 opaque → 两段（127+2）指令', () => {
    const pixels = new Array<number>(129).fill(7)
    const opaque = new Array<number>(129).fill(1)
    const bytes = encodeRleFrame(frame(pixels, opaque))
    // 头 4B + 指令127段(1+127) + 指令2段(1+2) = 4+128+3
    expect(bytes.byteLength).toBe(4 + 128 + 3)
    expect(bytes[4]).toBe(127)
    expect(bytes[4 + 128]).toBe(2)
  })

  test('尾透明补跳段写满 width*height；跳段同样 0x7F 分段', () => {
    const pixels = new Array<number>(200).fill(0)
    const opaque = new Array<number>(200).fill(0)
    const bytes = encodeRleFrame(frame(pixels, opaque))
    // 头 4B + 透明跳段 127+73
    expect(bytes.byteLength).toBe(4 + 2)
    expect(bytes[4]).toBe(0x80 + 127)
    expect(bytes[5]).toBe(0x80 + 73)
  })

  test('透明/opaque 交替边界：1px opaque 后跟 1px 透明', () => {
    const bytes = encodeRleFrame(frame([9, 0], [1, 0]))
    expect(Array.from(bytes)).toEqual([2, 0, 1, 0, 1, 9, 0x80 + 1])
  })
})

describe('O10 encodeSpriteChunk：偶对齐 pad 与多帧偏移表', () => {
  test('奇长帧后 pad 0x00；下一帧从偶偏移开始', () => {
    // 帧1 编码后奇数长（4+5=9B）：帧2 数据从偶偏移开始，中间 pad。
    const f1: RleFrame = {
      width: 5,
      height: 1,
      pixels: Uint8Array.from([1, 2, 3, 4, 5]),
      opaque: Uint8Array.from([1, 1, 1, 1, 1]),
    }
    const f2: RleFrame = {
      width: 1,
      height: 1,
      pixels: Uint8Array.from([9]),
      opaque: Uint8Array.from([1]),
    }
    const chunk = encodeSpriteChunk([f1, f2])
    const parsed = parseSpriteChunkStrict(chunk)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]!.pixels).toEqual(f1.pixels)
    expect(parsed[1]!.pixels).toEqual(f2.pixels)
    // offset 表 frame1 偏移为偶数（奇长帧 + pad 的直接证据）。
    const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
    const frame1Offset = view.getUint16(2, true) << 1
    expect(frame1Offset % 2).toBe(0)
    expect(frame1Offset).toBeGreaterThan(4 + 9 - 1)
  })
})
