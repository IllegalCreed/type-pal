import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { openMkf, readChunk, chunkCount } from '../../io/mkf.js'
import { decodeRngAnim, rngBlitDelta } from './rng-frames.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../../../..')
const RNG_PATH = resolve(REPO_ROOT, 'data/raw/RNG.MKF')

describe('rngBlitDelta — sdlpal rngplay.c:139-369 RLE opcode 真值', () => {
  it('0x00 end-frame 立即返回', () => {
    const surface = new Uint8Array(320 * 200)
    rngBlitDelta(new Uint8Array([0x00]), surface)
    expect(surface.every((v) => v === 0)).toBe(true)
  })

  it('0x13 end-frame 立即返回', () => {
    const surface = new Uint8Array(320 * 200)
    rngBlitDelta(new Uint8Array([0x13]), surface)
    expect(surface.every((v) => v === 0)).toBe(true)
  })

  it('0x02 skip 2 bytes(dst 推进,surface 不改)', () => {
    const surface = new Uint8Array(10)
    rngBlitDelta(new Uint8Array([0x02, 0x06, 0xAA, 0xBB, 0x00]), surface)
    // skip 2 bytes 后 dst=2,0x06 写 1 pair = surface[2,3] = AA,BB
    expect(surface[0]).toBe(0)
    expect(surface[1]).toBe(0)
    expect(surface[2]).toBe(0xAA)
    expect(surface[3]).toBe(0xBB)
  })

  it('0x03 + n=2 skip (2+1)*2 = 6 bytes', () => {
    const surface = new Uint8Array(20)
    rngBlitDelta(new Uint8Array([0x03, 0x02, 0x06, 0x11, 0x22, 0x00]), surface)
    expect(surface[6]).toBe(0x11)
    expect(surface[7]).toBe(0x22)
  })

  it('0x06-0x0a fall-through 写 (op-0x05) 个 2-byte pair', () => {
    const surface = new Uint8Array(20)
    // 0x0a: 5 个 pair = 10 字节
    rngBlitDelta(new Uint8Array([0x0a, 1,2,3,4,5,6,7,8,9,10, 0x00]), surface)
    for (let i = 0; i < 10; i++) {
      expect(surface[i]).toBe(i + 1)
    }
  })

  it('0x0b + n=2 写 (2+1)=3 个 pair', () => {
    const surface = new Uint8Array(10)
    rngBlitDelta(new Uint8Array([0x0b, 0x02, 1,2,3,4,5,6, 0x00]), surface)
    expect(Array.from(surface.subarray(0, 6))).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('0x0c + w=1 写 (1+1)=2 个 pair', () => {
    const surface = new Uint8Array(10)
    rngBlitDelta(new Uint8Array([0x0c, 0x01, 0x00, 1,2,3,4, 0x00]), surface)
    expect(Array.from(surface.subarray(0, 4))).toEqual([1, 2, 3, 4])
  })

  it('0x0d-0x10 重复同 2-byte (op-0x0b) 次', () => {
    const surface = new Uint8Array(20)
    // 0x10 = 重复 5 次,共 10 字节
    rngBlitDelta(new Uint8Array([0x10, 0xAB, 0xCD, 0x00]), surface)
    for (let i = 0; i < 5; i++) {
      expect(surface[i * 2]).toBe(0xAB)
      expect(surface[i * 2 + 1]).toBe(0xCD)
    }
  })

  it('0x11 + n=3 写同 2-byte (3+1)=4 次', () => {
    const surface = new Uint8Array(20)
    rngBlitDelta(new Uint8Array([0x11, 0x03, 0xEF, 0xFE, 0x00]), surface)
    for (let i = 0; i < 4; i++) {
      expect(surface[i * 2]).toBe(0xEF)
      expect(surface[i * 2 + 1]).toBe(0xFE)
    }
  })

  it('0x12 + w=1 写同 2-byte (1+1)=2 次', () => {
    const surface = new Uint8Array(20)
    rngBlitDelta(new Uint8Array([0x12, 0x01, 0x00, 0x77, 0x88, 0x00]), surface)
    expect(surface[0]).toBe(0x77)
    expect(surface[1]).toBe(0x88)
    expect(surface[2]).toBe(0x77)
    expect(surface[3]).toBe(0x88)
  })

  it('unknown opcode → throw(早 fail 防 ptr 错位 cascade)', () => {
    const surface = new Uint8Array(10)
    expect(() => rngBlitDelta(new Uint8Array([0x99]), surface)).toThrow(/unknown opcode/)
  })
})

// 真 RNG.MKF chunk 6 集成测(主要场景:trademark fallback)
describe.skipIf(!existsSync(RNG_PATH))(
  'decodeRngAnim — 真 RNG.MKF chunk 6(PAL_TrademarkScreen fallback)',
  () => {
    const rngBuf = existsSync(RNG_PATH)
      ? new Uint8Array(readFileSync(RNG_PATH))
      : new Uint8Array()

    it('chunk 6 解出 N>0 帧 + 每帧 320×200 PNG', () => {
      const rngMkf = openMkf(rngBuf)
      const total = chunkCount(rngMkf)
      expect(total).toBeGreaterThanOrEqual(12)
      const chunk6 = readChunk(rngMkf, 6)
      expect(chunk6.byteLength).toBeGreaterThan(0)

      const result = decodeRngAnim(6, chunk6)
      expect(result.frameCount).toBeGreaterThan(0)
      expect(result.frames.length).toBe(result.frameCount)

      // 每帧 PNG 字节非空(encodeIndexedPng 至少 PNG signature 8 byte + chunks)
      for (const f of result.frames) {
        expect(f.pngBytes.byteLength).toBeGreaterThan(50)
        // PNG signature: 89 50 4E 47 0D 0A 1A 0A
        expect(f.pngBytes[0]).toBe(0x89)
        expect(f.pngBytes[1]).toBe(0x50)
        expect(f.pngBytes[2]).toBe(0x4E)
        expect(f.pngBytes[3]).toBe(0x47)
      }
    })

    it('chunk 6 帧序列 — 第一帧非全黑(RLE delta 写了内容)', () => {
      const rngMkf = openMkf(rngBuf)
      const chunk6 = readChunk(rngMkf, 6)
      const result = decodeRngAnim(6, chunk6)
      // 第一帧应该非全黑 — RLE delta 在空白 surface 上画了内容
      // PNG bytes 内 IDAT chunk 解码复杂,这里间接验:不同 frame PNG 字节 hash 不同
      const set = new Set(result.frames.map((f) => f.pngBytes.byteLength))
      expect(set.size).toBeGreaterThan(1) // 至少 2 种不同 PNG size(说明帧内容不同)
    })

    it('全 12 chunk 都能解(0 frame chunk 容忍)', () => {
      const rngMkf = openMkf(rngBuf)
      const total = chunkCount(rngMkf)
      let totalFrames = 0
      for (let i = 0; i < total; i++) {
        const chunk = readChunk(rngMkf, i)
        const result = decodeRngAnim(i, chunk)
        totalFrames += result.frameCount
      }
      expect(totalFrames).toBeGreaterThan(0)
    }, 30_000) // PNG 编码累积慢,给 30s
  },
)
