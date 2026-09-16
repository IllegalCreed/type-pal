/**
 * TEST-FOUNDATION-COVERAGE-1 A3：YJ2 解压边界（合同见 yj2.ts:8-20 文件头/树/符号语义）。
 * 固定向量由文档化的初始树结构导出（fixture 注释），期望值全部来自符号语义推导，
 * 非用解码器回算。待证（见回执）：自适应树归约(weight==0x8000)分支与空窗口回引
 * (dst-pos-1<0)不能在不复制生产算法的前提下独立构造，列待证不作绿色宣称。
 */
import { describe, expect, it } from 'vitest'
import {
  YJ2_BACKREF_OVERLAP,
  YJ2_EARLY_EOS,
  YJ2_THREE_LITERALS,
} from './__tests__/glm-foundation-fixtures.js'
import { decompressYj2 } from './yj2.js'

describe('decompressYj2 已定义头错误', () => {
  it('源 <4 字节拒绝', () => {
    expect(() => decompressYj2(Uint8Array.from([1, 2, 3]))).toThrow(/too small/)
  })
})

describe('decompressYj2 非空字面向量', () => {
  it('三字面流：输出 = 字面值按序（语义：symbol 0..0xFF 顺序输出）', () => {
    const out = decompressYj2(YJ2_THREE_LITERALS)
    expect(Array.from(out)).toEqual([0x06, 0xaa, 0xbb])
  })

  it('uncompLen=0：零长输出（循环不进入）', () => {
    const out = decompressYj2(Uint8Array.from([0, 0, 0, 0]))
    expect(out.byteLength).toBe(0)
  })
})

describe('decompressYj2 回引向量', () => {
  it('字面 ABC + 回引(pos=2,len=4)：重叠顺序复制 → ABCABCA', () => {
    // 语义推导：preStart = dst-pos-1 = 0；out[3+j] = out[0+j]，j=0..3 → A,B,C,A
    const out = decompressYj2(YJ2_BACKREF_OVERLAP)
    expect(Array.from(out)).toEqual([0x41, 0x42, 0x43, 0x41, 0x42, 0x43, 0x41])
  })

  it('提前结束（pos==0xFFF）：余量保持 Uint8Array 零初始化', () => {
    // 语义推导：字面 0x41 后 EOS，uncompLen=5 → [0x41,0,0,0,0]
    const out = decompressYj2(YJ2_EARLY_EOS)
    expect(Array.from(out)).toEqual([0x41, 0, 0, 0, 0])
  })
})
