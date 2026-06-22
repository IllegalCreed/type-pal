import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openMkf, readChunk } from './mkf.js'
import { RNG_HEIGHT, RNG_WIDTH, decodeRngFrames, rngBlitDelta } from './rng.js'

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

const RNG_MKF = resolve(__dirname, '../../../data/raw/RNG.MKF')
const hasData = existsSync(RNG_MKF)

describe.skipIf(!hasData)('decodeRngFrames (真实 RNG.MKF)', () => {
  it('chunk 6(trademark fallback)解出多帧 320×200,且每帧是独立拷贝', () => {
    const mkf = openMkf(new Uint8Array(readFileSync(RNG_MKF)))
    const frames = decodeRngFrames(readChunk(mkf, 6))
    expect(frames.length).toBeGreaterThan(1)
    for (const f of frames) {
      expect(f.pixels.length).toBe(RNG_WIDTH * RNG_HEIGHT)
    }
    // 关键:delta surface 被逐帧拷贝(slice),帧间不共享同一 buffer —— 否则全部指向末帧
    expect(frames[0]!.pixels).not.toBe(frames[1]!.pixels)
    const differ = frames[0]!.pixels.some((v, i) => v !== frames[1]!.pixels[i])
    expect(differ).toBe(true)
  })

  it('空 chunk → 空帧数组', () => {
    expect(decodeRngFrames(new Uint8Array(0))).toEqual([])
  })
})

if (!hasData) {
  // biome-ignore lint/suspicious/noConsole: skip 提示
  console.warn('[rng.test skip] data/raw/RNG.MKF 缺失 —— 真实解码集成跳过')
}
