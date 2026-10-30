/**
 * TEST-FOUNDATION-COVERAGE-1 A3：YJ2 解压边界（合同见 yj2.ts 模块头的文件头/树/符号语义）。
 * 固定向量由文档化的初始树结构导出（fixture 注释），期望值全部来自符号语义推导，
 * 非用解码器回算。空窗口回引已有本文件末例的独立字节反例；
 * 树归约向量由未改SDLPal树函数编码并由原C解码验证；期望来自独立字面序列，见shared-codecs证据。
 */
import { describe, expect, it } from 'vitest'
import {
  YJ2_BACKREF_OVERLAP,
  YJ2_EARLY_EOS,
  YJ2_THREE_LITERALS,
} from './__tests__/glm-foundation-fixtures.js'
import rescale from './__tests__/yj2-rescale.json' with { type: 'json' }
import { decompressYj2 } from './yj2.js'

describe('decompressYj2 已定义头错误', () => {
  it('源 <4 字节拒绝', () => {
    expect(() => decompressYj2(Uint8Array.from([1, 2, 3]))).toThrow('YJ2: source too small')
  })

  it('非空输出没有任何 Huffman 位流时显式失败', () => {
    expect(() => decompressYj2(Uint8Array.from([1, 0, 0, 0]))).toThrow('YJ2: bitstream truncated')
  })

  it('完整回引 symbol 后缺少位置参数时显式失败', () => {
    // 初始树的 symbol 0x100 路径是 01111110（低位先：0x7e）；位置位流缺失。
    expect(() => decompressYj2(Uint8Array.from([3, 0, 0, 0, 0x7e]))).toThrow(
      'YJ2: bitstream truncated at bit 8',
    )
  })
})

describe('decompressYj2 非空字面向量', () => {
  it('三字面流：输出 = 字面值按序（语义：symbol 0..0xFF 顺序输出）', () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      expect(Array.from(decompressYj2(YJ2_THREE_LITERALS))).toEqual([0x06, 0xaa, 0xbb])
    }
  })

  it('uncompLen=0：零长输出（循环不进入）', () => {
    const out = decompressYj2(Uint8Array.from([0, 0, 0, 0, 0xff]))
    expect(out).toEqual(new Uint8Array(0))
  })
})

describe('decompressYj2 回引向量', () => {
  it('字面 ABC + 回引(pos=2,len=4)：重叠顺序复制 → ABCABCA', () => {
    // 语义推导：preStart = dst-pos-1 = 0；out[3+j] = out[0+j]，j=0..3 → A,B,C,A
    for (let attempt = 0; attempt < 2; attempt++) {
      expect(Array.from(decompressYj2(YJ2_BACKREF_OVERLAP))).toEqual([
        0x41, 0x42, 0x43, 0x41, 0x42, 0x43, 0x41,
      ])
    }
  })

  it('提前结束（pos==0xFFF）：余量保持 Uint8Array 零初始化', () => {
    // 语义推导：字面 0x41 后 EOS，uncompLen=5 → [0x41,0,0,0,0]
    const out = decompressYj2(YJ2_EARLY_EOS)
    expect(Array.from(out)).toEqual([0x41, 0, 0, 0, 0])
  })

  it('回引长度超过目标输出剩余空间时显式失败', () => {
    const malformed = YJ2_BACKREF_OVERLAP.slice()
    malformed[0] = 4 // 保留 ABC + 回引的位流，只让目标长度不足以容纳完整回引
    expect(() => decompressYj2(malformed)).toThrow('YJ2: back-reference exceeds output')
  })

  it('第一条指令回引尚未产生的输出时显式失败', () => {
    // symbol 0x100（长度3）+ pos=0 的位置位流 111000000：窗口起点为 -1。
    expect(() => decompressYj2(Uint8Array.from([3, 0, 0, 0, 0x7e, 0x07, 0]))).toThrow(
      'YJ2: back-reference starts before output (-1)',
    )
  })
})

describe('decompressYj2 自适应树归约', () => {
  it('跨过0x8000权重后仍按原字面序列解码', () => {
    // Frozen SDLPal encoder traverses the original tree; its unchanged decoder checks all bytes.
    // 32600 A bytes cross one reduction, then a changing suffix distinguishes stale weights.
    const compressed = Uint8Array.from(rescale.compressedHex.matchAll(/../g), (m) =>
      Number.parseInt(m[0], 16),
    )
    const expected = Uint8Array.from({ length: 33024 }, (_, i) =>
      i < 32600 ? 0x41 : (i * 17 + 23) & 255,
    )
    let actual: Uint8Array | undefined
    expect(() => {
      actual = decompressYj2(compressed)
    }).not.toThrow()
    expect(actual).toEqual(expected)
  })
})
