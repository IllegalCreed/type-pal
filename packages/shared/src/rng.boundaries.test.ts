/**
 * TEST-FOUNDATION-COVERAGE-1 A2：RNG RLE delta 与帧解码边界（合同见 rng.ts:19-35 opcode 表）。
 * 既有 rng.test.ts 已覆盖 0x00/0x02/0x06/0x0d 与 unknown throw；本文件补齐其余 opcode 族、
 * 精确未触字节断言与 decodeRngFrames 的合成容器链路。只比较 Uint8Array 数值，不渲染。
 */
import { describe, expect, it } from 'vitest'
import { RNG_HEIGHT, RNG_WIDTH, decodeRngFrames, rngBlitDelta } from './rng.js'
import { mkMkf, YJ2_RNG_PAIR, YJ2_RNG_SKIP_THEN_PAIR } from './__tests__/glm-foundation-fixtures.js'

const MARK = 0xee
const surface = () => new Uint8Array(RNG_WIDTH * RNG_HEIGHT).fill(MARK)
/** 断言 [from,to) 之外全部保持 MARK 且 [from,to) 精确等于 expected。 */
const expectExact = (s: Uint8Array, from: number, expected: number[]) => {
  expect(Array.from(s.subarray(from, from + expected.length))).toEqual(expected)
  expect(s.subarray(0, from).every((b) => b === MARK)).toBe(true)
  expect(s.subarray(from + expected.length).every((b) => b === MARK)).toBe(true)
}

describe('rngBlitDelta skip 族（未触字节精确保持）', () => {
  it('0x03 + n：dst += (n+1)*2，其后写入落点精确', () => {
    const s = surface()
    rngBlitDelta(Uint8Array.from([0x03, 0x04, 0x06, 0xaa, 0xbb]), s)
    expectExact(s, 10, [0xaa, 0xbb])
  })

  it('0x04 + 2byte LE w：dst += (w+1)*2（跨字节 w=0x01FF）', () => {
    const s = surface()
    rngBlitDelta(Uint8Array.from([0x04, 0xff, 0x01, 0x06, 0xcc, 0xdd]), s)
    expectExact(s, 0x200 * 2, [0xcc, 0xdd])
  })
})

describe('rngBlitDelta literal pair 族', () => {
  it('0x07-0x0a 分别写 2/3/4/5 对（0x06=1 已有测试，此处补齐族）', () => {
    const pairs: Array<[number, number[]]> = [
      [0x07, [1, 1, 2, 2]],
      [0x08, [1, 1, 2, 2, 3, 3]],
      [0x09, [1, 1, 2, 2, 3, 3, 4, 4]],
      [0x0a, [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]],
    ]
    for (const [op, expected] of pairs) {
      const s = surface()
      const payload = [op]
      for (let i = 0; i < expected.length / 2; i++) payload.push(i + 1, i + 1)
      rngBlitDelta(Uint8Array.from(payload), s)
      expectExact(s, 0, expected)
    }
  })

  it('0x0b + n：写 (n+1) 对', () => {
    const s = surface()
    rngBlitDelta(Uint8Array.from([0x0b, 0x02, 9, 9, 8, 8, 7, 7]), s)
    expectExact(s, 0, [9, 9, 8, 8, 7, 7])
  })

  it('0x0c + 2byte LE w：写 (w+1) 对', () => {
    const s = surface()
    rngBlitDelta(Uint8Array.from([0x0c, 0x01, 0x00, 5, 5, 6, 6]), s)
    expectExact(s, 0, [5, 5, 6, 6])
  })
})

describe('rngBlitDelta 同对重复族', () => {
  it('0x0e/0x0f/0x10 分别重复 3/4/5 次（0x0d=2 已有测试）', () => {
    const reps: Array<[number, number]> = [
      [0x0e, 3],
      [0x0f, 4],
      [0x10, 5],
    ]
    for (const [op, n] of reps) {
      const s = surface()
      rngBlitDelta(Uint8Array.from([op, 0xc1, 0xc2]), s)
      expectExact(s, 0, Array.from({ length: n * 2 }, (_, i) => (i % 2 === 0 ? 0xc1 : 0xc2)))
    }
  })

  it('0x11 + n：重复 (n+1) 次', () => {
    const s = surface()
    rngBlitDelta(Uint8Array.from([0x11, 0x03, 0x77, 0x88]), s)
    expectExact(s, 0, Array.from({ length: 8 }, (_, i) => (i % 2 === 0 ? 0x77 : 0x88)))
  })

  it('0x12 + 2byte LE：重复 (w+1) 次（跨字节 w=0x0100）', () => {
    const s = surface()
    rngBlitDelta(Uint8Array.from([0x12, 0x00, 0x01, 0x99, 0xaa]), s)
    expectExact(
      s,
      0,
      Array.from({ length: 0x101 * 2 }, (_, i) => (i % 2 === 0 ? 0x99 : 0xaa)),
    )
  })
})

describe('rngBlitDelta 终止与混合', () => {
  it('0x13 终止：其后字节被忽略，无写入无错误', () => {
    const s = surface()
    rngBlitDelta(Uint8Array.from([0x13, 0x06, 0xaa, 0xbb, 0x7f]), s)
    expect(s.every((b) => b === MARK)).toBe(true)
  })

  it('连续帧基面保留：同 surface 上两次 delta，第一次写入保持', () => {
    const s = surface()
    rngBlitDelta(Uint8Array.from([0x06, 0x10, 0x20]), s)
    rngBlitDelta(Uint8Array.from([0x02, 0x06, 0x30, 0x40]), s)
    expectExact(s, 0, [0x10, 0x20, 0x30, 0x40])
  })
})

describe('decodeRngFrames（合成 sub-MKF 容器链路）', () => {
  it('空输入返回空数组（已定义，非错误）', () => {
    expect(decodeRngFrames(Uint8Array.of())).toEqual([])
  })

  it('两帧链：每帧基于上一帧 delta，pixels 为拷贝（帧0 不被帧1 写入污染）', () => {
    // 帧0 payload=[0x06,AA,BB]（写1对@0）；帧1 payload=[0x02,0x06,CC,DD]（skip2→写@2,3）
    const chunk = mkMkf([YJ2_RNG_PAIR, YJ2_RNG_SKIP_THEN_PAIR])
    const frames = decodeRngFrames(chunk)
    expect(frames.map((f) => f.index)).toEqual([0, 1])
    expect(Array.from(frames[0]!.pixels.subarray(0, 4))).toEqual([0xaa, 0xbb, 0, 0])
    expect(Array.from(frames[1]!.pixels.subarray(0, 6))).toEqual([0xaa, 0xbb, 0xcc, 0xdd, 0, 0])
    // 拷贝语义直接反证：帧0 像素在帧1 解码后仍为 AA BB 0 0（若为共享 surface 视图则已被改写）
    expect(frames[0]!.pixels.byteLength).toBe(RNG_WIDTH * RNG_HEIGHT)
  })

  it('空 sub-chunk 跳过，帧 index 保持 sub-chunk 下标', () => {
    const chunk = mkMkf([Uint8Array.of(), YJ2_RNG_PAIR])
    const frames = decodeRngFrames(chunk)
    expect(frames.map((f) => f.index)).toEqual([1])
    expect(Array.from(frames[0]!.pixels.subarray(0, 2))).toEqual([0xaa, 0xbb])
  })

  it('非法 YJ2 sub-chunk（<4 字节）跳过，不中断后续帧', () => {
    const chunk = mkMkf([Uint8Array.from([0x00, 0x01]), YJ2_RNG_PAIR])
    const frames = decodeRngFrames(chunk)
    expect(frames.map((f) => f.index)).toEqual([1])
  })
})
