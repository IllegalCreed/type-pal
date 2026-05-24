/**
 * misc-mkf 测试 —— RNG / RGM / BALL / FIRE parser。
 *
 * sdlpal 真值来源:
 *   RNG.MKF  — rngplay.c::PAL_RNGReadFrame(sub-MKF + RLE delta frames)
 *   RGM.MKF  — global.h fpRGM "character face bitmaps"; text.c PAL_DialogAddText
 *   BALL.MKF — global.h fpBALL "item bitmaps"; itemmenu.c wBitmap
 *   FIRE.MKF — global.h fpFIRE "fire effect sprites"; fight.c PAL_MKFDecompressChunk
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { chunkCount, openMkf, readChunk } from '../../../io/mkf.js'
import { decompressYj2 } from '../../../io/yj2.js'
import { framesToOut, parseSpriteChunk } from '../../sprite.js'
import { dumpBallChunk } from '../ball.js'
import { parseFirSprite } from '../fire.js'
import { dumpRgmChunk } from '../rgm.js'
import { dumpRngAnim } from '../rng.js'

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
const REPO_ROOT = resolve(HERE, '../../../../..')

function rawMkfPath(name: string): string {
  return resolve(REPO_ROOT, 'data/raw', name)
}

// ── dumpRngAnim ────────────────────────────────────────────────────────────

describe('dumpRngAnim', () => {
  it('returns raw dump with chunkIndex + size + base64 + sdlpalHint + todo', () => {
    const r = dumpRngAnim(5, new Uint8Array([0x01, 0x02, 0x03]))
    expect(r.chunkIndex).toBe(5)
    expect(r.size).toBe(3)
    expect(r.base64).toBeTruthy()
    expect(Buffer.from(r.base64, 'base64')).toEqual(Buffer.from([0x01, 0x02, 0x03]))
    expect(r.sdlpalHint).toContain('RNG.MKF')
    expect(r.sdlpalHint).toContain('rngplay.c')
    expect(r.todo).toContain('M5')
  })

  it('empty chunk → size=0, base64 empty string', () => {
    const r = dumpRngAnim(0, new Uint8Array(0))
    expect(r.size).toBe(0)
    expect(r.base64).toBe('')
  })

  it('real RNG.MKF — 12 chunks, all non-empty', () => {
    const p = rawMkfPath('RNG.MKF')
    if (!existsSync(p)) {
      console.warn('[rng test skip] data/raw/RNG.MKF 不存在,需原盘')
      return
    }
    const mkf = openMkf(new Uint8Array(readFileSync(p)))
    expect(chunkCount(mkf)).toBe(12)
    for (let i = 0; i < 12; i++) {
      const buf = readChunk(mkf, i)
      expect(buf.byteLength).toBeGreaterThan(0)
      const r = dumpRngAnim(i, buf)
      expect(r.chunkIndex).toBe(i)
      expect(r.size).toBe(buf.byteLength)
    }
  })
})

// ── dumpRgmChunk ───────────────────────────────────────────────────────────

describe('dumpRgmChunk', () => {
  it('returns raw dump with chunkIndex + size + sdlpalHint + todo', () => {
    const r = dumpRgmChunk(3, new Uint8Array([0xab, 0xcd]))
    expect(r.chunkIndex).toBe(3)
    expect(r.size).toBe(2)
    expect(r.sdlpalHint).toContain('RGM.MKF')
    expect(r.sdlpalHint).toContain('fpRGM')
    expect(r.todo).toContain('M5')
  })

  it('real RGM.MKF — 92 chunks(character face bitmaps)', () => {
    const p = rawMkfPath('RGM.MKF')
    if (!existsSync(p)) {
      console.warn('[rgm test skip] data/raw/RGM.MKF 不存在,需原盘')
      return
    }
    const mkf = openMkf(new Uint8Array(readFileSync(p)))
    expect(chunkCount(mkf)).toBe(92)
    // 随机抽一个非空 chunk
    let hasNonEmpty = false
    for (let i = 0; i < chunkCount(mkf); i++) {
      if (readChunk(mkf, i).byteLength > 0) { hasNonEmpty = true; break }
    }
    expect(hasNonEmpty).toBe(true)
  })
})

// ── dumpBallChunk ──────────────────────────────────────────────────────────

describe('dumpBallChunk', () => {
  it('returns raw dump with chunkIndex + size + sdlpalHint + todo', () => {
    const r = dumpBallChunk(7, new Uint8Array(8))
    expect(r.chunkIndex).toBe(7)
    expect(r.size).toBe(8)
    expect(r.sdlpalHint).toContain('BALL.MKF')
    expect(r.sdlpalHint).toContain('wBitmap')
    expect(r.todo).toContain('M5')
  })

  it('real BALL.MKF — 252 chunks(item icon bitmaps)', () => {
    const p = rawMkfPath('BALL.MKF')
    if (!existsSync(p)) {
      console.warn('[ball test skip] data/raw/BALL.MKF 不存在,需原盘')
      return
    }
    const mkf = openMkf(new Uint8Array(readFileSync(p)))
    expect(chunkCount(mkf)).toBe(252)
    let hasNonEmpty = false
    for (let i = 0; i < chunkCount(mkf); i++) {
      if (readChunk(mkf, i).byteLength > 0) { hasNonEmpty = true; break }
    }
    expect(hasNonEmpty).toBe(true)
  })
})

// ── parseFirSprite ─────────────────────────────────────────────────────────

describe('parseFirSprite', () => {
  it('empty buf → frameCount=0, frames=[]', () => {
    const r = parseFirSprite(0, new Uint8Array(0))
    expect(r.chunkIndex).toBe(0)
    expect(r.frameCount).toBe(0)
    expect(r.frames).toEqual([])
  })

  it('returns chunkIndex + frameCount + frames structure', () => {
    // 1-byte buffer: too short for sprite header after any decompression path
    // Should return frameCount=0 gracefully
    const buf = new Uint8Array([0x01])
    const r = parseFirSprite(5, buf)
    expect(r.chunkIndex).toBe(5)
    expect(typeof r.frameCount).toBe('number')
    expect(Array.isArray(r.frames)).toBe(true)
    expect(r.frameCount).toBe(r.frames.length)
  })

  it('fake raw sprite chunk parsed after YJ2 fallback returns valid PNG bytes if frames exist', () => {
    // Build a fake sprite chunk that parseSpriteChunk can handle
    const buf = makeFakeSpriteChunk(2)
    // Wrap in parseFirSprite: YJ2 will fail or produce garbage, fallback to raw
    // The raw buf IS a valid sprite group, so after fallback parseSpriteChunk should succeed
    const r = parseFirSprite(9, buf)
    expect(r.chunkIndex).toBe(9)
    // YJ2 may or may not succeed; just verify contract
    expect(r.frameCount).toBe(r.frames.length)
    for (const f of r.frames) {
      expect(f.pngBytes[0]).toBe(0x89)
    }
  })

  it('real FIRE.MKF — 55 chunks, sprite groups with frames', () => {
    const p = rawMkfPath('FIRE.MKF')
    if (!existsSync(p)) {
      console.warn('[fire test skip] data/raw/FIRE.MKF 不存在,需原盘')
      return
    }
    const mkf = openMkf(new Uint8Array(readFileSync(p)))
    expect(chunkCount(mkf)).toBe(55)
    let totalFrames = 0
    for (let i = 0; i < chunkCount(mkf); i++) {
      const buf = readChunk(mkf, i)
      if (buf.byteLength === 0) continue
      const r = parseFirSprite(i, buf)
      expect(r.chunkIndex).toBe(i)
      totalFrames += r.frameCount
      // Each frame should have valid dimensions
      for (const f of r.frames) {
        expect(f.width).toBeGreaterThan(0)
        expect(f.height).toBeGreaterThan(0)
        expect(f.width).toBeLessThanOrEqual(400)
        expect(f.height).toBeLessThanOrEqual(400)
        expect(f.pngBytes[0]).toBe(0x89) // PNG magic
      }
    }
    expect(totalFrames).toBeGreaterThan(0)
  })
})

// ── FIRE.MKF via parseSpriteChunk directly ────────────────────────────────

describe('FIRE.MKF chunks — parseSpriteChunk after YJ2 decompress', () => {
  it('chunk 0 decompresses → valid sprite with frames', () => {
    const p = rawMkfPath('FIRE.MKF')
    if (!existsSync(p)) {
      console.warn('[fire direct test skip] 需原盘')
      return
    }
    const mkf = openMkf(new Uint8Array(readFileSync(p)))
    const raw = readChunk(mkf, 0)
    expect(raw.byteLength).toBeGreaterThan(0)
    let decompressed: Uint8Array
    try {
      decompressed = decompressYj2(raw)
    } catch {
      decompressed = raw
    }
    const frames = parseSpriteChunk(decompressed)
    expect(frames.length).toBeGreaterThan(0)
    const out = framesToOut(frames)
    expect(out[0]!.pngBytes[0]).toBe(0x89)
  })
})
