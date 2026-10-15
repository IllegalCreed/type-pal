/**
 * misc-mkf 测试 —— RGM / BALL / FIRE parser及真实FIRE解压接线。
 *
 * sdlpal 真值来源:
 *   RGM.MKF  — global.h fpRGM "character face bitmaps"; text.c PAL_DialogAddText
 *   BALL.MKF — global.h fpBALL "item bitmaps"; itemmenu.c wBitmap
 *   FIRE.MKF — global.h fpFIRE "fire effect sprites"; fight.c PAL_MKFDecompressChunk
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { assert, describe, expect, it } from 'vitest'
import { chunkCount, openMkf, readChunk } from '../../../io/mkf.js'
import { decompressYj2 } from '../../../io/yj2.js'
import { framesToOut, parseSpriteChunk } from '../../sprite.js'
import { decodeBallIcon } from '../ball.js'
import { parseFirSprite } from '../fire.js'
import { decodeRgmPortrait } from '../rgm.js'
import { createFrameDigest } from './indexed-frame-digest.js'

// ── helpers ────────────────────────────────────────────────────────────────

function makeFakeSpriteChunk(frameCount: number): Uint8Array {
  // 每帧:4 字节 header(w=1,h=1) + 2 字节 RLE = 6 字节
  const frameDataSize = 6
  const headerSize = frameCount * 2
  const buf = new Uint8Array(headerSize + frameCount * frameDataSize)
  const view = new DataView(buf.buffer)
  for (let i = 0; i < frameCount; i++) {
    const byteOffset = headerSize + i * frameDataSize
    view.setUint16(i * 2, byteOffset >> 1, true)
    view.setUint16(byteOffset, 1, true)
    view.setUint16(byteOffset + 2, 1, true)
    buf[byteOffset + 4] = 0x01 // 1 opaque pixel
    buf[byteOffset + 5] = 0xaa // palette index
  }
  return buf
}

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../../../../..')

function rawMkfPath(name: string): string {
  return resolve(REPO_ROOT, 'data/raw', name)
}

// ── decodeRgmPortrait ──────────────────────────────────────────────────────
//
// M5.6 audit 第 2 真漏洞修(2026-05-27 T10d):RGM.MKF 原 raw dump 改为 RLE 解 → PNG。
// 与 BALL.MKF 同模式(`02 00 00 00` file header skip → decodeRle → encodeIndexedPng)。

describe('decodeRgmPortrait', () => {
  it('empty chunk(0 byte)→ null', () => {
    expect(decodeRgmPortrait(0, new Uint8Array(0))).toBe(null)
  })

  it('real RGM.MKF — 92 chunks，88张头像身份/尺寸/SDLPal全部RGBA', () => {
    const p = rawMkfPath('RGM.MKF')
    const mkf = openMkf(new Uint8Array(readFileSync(p)))
    expect(chunkCount(mkf)).toBe(92)
    const empty = new Set([0, 20, 78, 79])
    const digest = createFrameDigest()
    let decoded = 0
    for (let i = 0; i < chunkCount(mkf); i++) {
      const chunk = readChunk(mkf, i)
      const portrait = decodeRgmPortrait(i, chunk)
      if (empty.has(i)) {
        expect(chunk).toHaveLength(0)
        expect(portrait).toBeNull()
        continue
      }
      assert(portrait !== null, `RGM chunk ${i} must decode`)
      expect(portrait.chunkIndex).toBe(i)
      digest.add(i, [{ ...portrait, index: 0 }])
      decoded++
    }
    expect(decoded).toBe(88)
    expect(digest.hex()).toBe('02fc89a8685182e696959c23034da168d72983b6564d6ab98726438d15645636')
  })
})

// ── decodeBallIcon ─────────────────────────────────────────────────────────

describe('decodeBallIcon', () => {
  it('empty chunk(0 byte)→ null', () => {
    expect(decodeBallIcon(0, new Uint8Array(0))).toBe(null)
  })

  it('real BALL.MKF — 252 chunks，251图标身份/尺寸/SDLPal全部RGBA', () => {
    const p = rawMkfPath('BALL.MKF')
    const mkf = openMkf(new Uint8Array(readFileSync(p)))
    expect(chunkCount(mkf)).toBe(252)
    const digest = createFrameDigest()
    let decoded = 0
    for (let i = 0; i < chunkCount(mkf); i++) {
      const chunk = readChunk(mkf, i)
      const icon = decodeBallIcon(i, chunk)
      if (i === 0) {
        expect(chunk).toHaveLength(0)
        expect(icon).toBeNull()
        continue
      }
      assert(icon !== null, `BALL chunk ${i} must decode`)
      expect(icon.chunkIndex).toBe(i)
      digest.add(i, [{ ...icon, index: 0 }])
      decoded++
    }
    expect(decoded).toBe(251)
    expect(digest.hex()).toBe('0362a6ae24e5df2ee042924f2b7e0545a3917116bd6e989eed21d4fee68795b3')
  })
})

// ── parseFirSprite ─────────────────────────────────────────────────────────

describe('parseFirSprite', () => {
  // 空块的完整输出合同由fire.glm-runtime-resource.test.ts承接，不重复计数。

  it('one-byte raw input preserves chunkIndex and returns no frames', () => {
    // 1-byte buffer: too short for sprite header after any decompression path
    // Should return frameCount=0 gracefully
    const buf = new Uint8Array([0x01])
    const r = parseFirSprite(5, buf)
    expect(r).toEqual({ chunkIndex: 5, frameCount: 0, frames: [] })
  })

  it('fake raw sprite chunk after YJ2 failure returns two exact PNG frames', () => {
    // 合成raw容器的YJ2解压确实失败，当前fallback实际解出两帧；不是条件循环smoke。
    const buf = makeFakeSpriteChunk(2)
    expect(() => decompressYj2(buf)).toThrow()
    const r = parseFirSprite(9, buf)
    expect(r.chunkIndex).toBe(9)
    expect(r.frameCount).toBe(2)
    expect(r.frames.map(({ index, width, height }) => ({ index, width, height }))).toEqual([
      { index: 0, width: 1, height: 1 },
      { index: 1, width: 1, height: 1 },
    ])
    expect(r.frames.map((frame) => [...PNG.sync.read(Buffer.from(frame.pngBytes)).data])).toEqual([
      [0xaa, 0xaa, 0xaa, 255],
      [0xaa, 0xaa, 0xaa, 255],
    ])
  })

  it('real FIRE.MKF — 55 chunks，837帧身份/尺寸/SDLPal全部RGBA', () => {
    const p = rawMkfPath('FIRE.MKF')
    const mkf = openMkf(new Uint8Array(readFileSync(p)))
    expect(chunkCount(mkf)).toBe(55)
    const digest = createFrameDigest()
    let totalFrames = 0
    for (let i = 0; i < chunkCount(mkf); i++) {
      const buf = readChunk(mkf, i)
      expect(buf.byteLength).toBeGreaterThan(0)
      const r = parseFirSprite(i, buf)
      expect(r.chunkIndex).toBe(i)
      expect(r.frameCount).toBe(r.frames.length)
      totalFrames += r.frameCount
      digest.add(i, r.frames)
    }
    expect(totalFrames).toBe(837)
    expect(digest.hex()).toBe('d85331a890c2d76f95a222f4bbf7009321bf75e15a518803b32f01a19111a5d1')
  })
})

// ── FIRE.MKF via parseSpriteChunk directly ────────────────────────────────

describe('FIRE.MKF chunks — parseSpriteChunk after YJ2 decompress', () => {
  it('chunk 0 decompresses → valid sprite with frames', () => {
    const p = rawMkfPath('FIRE.MKF')
    const mkf = openMkf(new Uint8Array(readFileSync(p)))
    const raw = readChunk(mkf, 0)
    // 真实FIRE0的SDLPal路径必须成功YJ2解压，不能catch后用raw掩盖格式失败。
    const frames = parseSpriteChunk(decompressYj2(raw))
    expect(frames).toHaveLength(8)
    const digest = createFrameDigest()
    digest.add(0, framesToOut(frames))
    expect(digest.hex()).toBe('c10ba6a45c3b1a3831b17dc89ee3b2326084c9d14c8af07275448a0dea938bce')
  })
})
