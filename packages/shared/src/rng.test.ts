import { describe, expect, it } from 'vitest'
import { decodeRngFrames, rngBlitDelta } from './rng.js'

// 纯逻辑单测(shared 为同构包,不依赖 node:fs)。真实 RNG.MKF 集成解码覆盖在
// pal-extract `rng-frames.test.ts`(decodeRngAnim 走同一份 shared decodeRngFrames)。
describe('rngBlitDelta (RLE delta opcodes)', () => {
  it('0x06 写 1 个 2-byte literal pair', () => {
    const s = new Uint8Array(8)
    rngBlitDelta(new Uint8Array([0x06, 0xaa, 0xbb]), s)
    expect(Array.from(s.slice(0, 4))).toEqual([0xaa, 0xbb, 0, 0])
  })

  it('0x02 skip 2 bytes 后再写', () => {
    const s = new Uint8Array(8)
    rngBlitDelta(new Uint8Array([0x02, 0x06, 0xaa, 0xbb]), s)
    expect(Array.from(s.slice(0, 4))).toEqual([0, 0, 0xaa, 0xbb])
  })

  it('0x0d 同 2-byte 重复 2 次', () => {
    const s = new Uint8Array(8)
    rngBlitDelta(new Uint8Array([0x0d, 0xaa, 0xbb]), s)
    expect(Array.from(s.slice(0, 4))).toEqual([0xaa, 0xbb, 0xaa, 0xbb])
  })

  it('0x00 end frame:不再写', () => {
    const s = new Uint8Array(4).fill(0x11)
    rngBlitDelta(new Uint8Array([0x00, 0x06, 0xaa, 0xbb]), s)
    expect(Array.from(s)).toEqual([0x11, 0x11, 0x11, 0x11])
  })

  it('未知 opcode 抛错', () => {
    expect(() => rngBlitDelta(new Uint8Array([0x7f]), new Uint8Array(4))).toThrow(/unknown opcode/)
  })

  it('delta 累加:第二次 blit 基于已有 surface(不清零)', () => {
    const s = new Uint8Array(8)
    rngBlitDelta(new Uint8Array([0x06, 0xaa, 0xbb]), s) // [aa bb ..]
    rngBlitDelta(new Uint8Array([0x02, 0x06, 0xcc, 0xdd]), s) // skip2, 写 cc dd
    expect(Array.from(s.slice(0, 4))).toEqual([0xaa, 0xbb, 0xcc, 0xdd])
  })
})

describe('decodeRngFrames', () => {
  it('空 chunk → 空帧数组', () => {
    expect(decodeRngFrames(new Uint8Array(0))).toEqual([])
  })
})
