/**
 * misc-mkf 测试 —— RGM / BALL / FIRE parser及真实FIRE解压接线。
 *
 * sdlpal 真值来源:
 *   RGM.MKF  — global.h fpRGM "character face bitmaps"; text.c PAL_DialogAddText
 *   BALL.MKF — global.h fpBALL "item bitmaps"; itemmenu.c wBitmap
 *   FIRE.MKF — global.h fpFIRE "fire effect sprites"; fight.c PAL_MKFDecompressChunk
 */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { assert, describe, expect, it } from 'vitest'
import { chunkCount, openMkf, readChunk } from '../../../io/mkf.js'
import { decompressYj2 } from '../../../io/yj2.js'
import { writeFireAssets } from '../../animation-assets.js'
import { framesToOut, parseSpriteChunk } from '../../sprite.js'
import { decodeBallIcon } from '../ball.js'
import { decodeRgmPortrait } from '../rgm.js'
import { createFrameDigest } from './indexed-frame-digest.js'

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

// FIRE 原盘 oracle 从当前 writer 发布的 blob 读取，不调用已退役 PNG 适配器。
describe('writeFireAssets', () => {
  it('real FIRE.MKF — 55 chunks，837帧身份/尺寸/SDLPal全部RGBA', ({ onTestFinished }) => {
    const work = mkdtempSync(join(tmpdir(), 'type-pal-fire-oracle-'))
    onTestFinished(() => rmSync(work, { recursive: true, force: true }))
    const raw = join(work, 'raw')
    const out = join(work, 'output')
    mkdirSync(raw)
    copyFileSync(rawMkfPath('FIRE.MKF'), join(raw, 'FIRE.MKF'))
    writeFireAssets(raw, out)
    const p = rawMkfPath('FIRE.MKF')
    const mkf = openMkf(new Uint8Array(readFileSync(p)))
    expect(chunkCount(mkf)).toBe(55)
    const digest = createFrameDigest()
    let totalFrames = 0
    for (let i = 0; i < chunkCount(mkf); i++) {
      const buf = readChunk(mkf, i)
      expect(buf.byteLength).toBeGreaterThan(0)
      const relative = `data/magic/fire-${String(i).padStart(2, '0')}.rle`
      const published = gunzipSync(readFileSync(join(out, relative)))
      const frames = framesToOut(parseSpriteChunk(published))
      totalFrames += frames.length
      digest.add(i, frames)
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
