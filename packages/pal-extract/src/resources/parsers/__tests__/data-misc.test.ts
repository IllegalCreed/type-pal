/**
 * data-misc.ts 测试 —— parseLevelUpExp / parseLevelUpMagic / parseBattleEffectIndex。
 *
 * sdlpal 真值来源:
 *   chunk 14 → rgLevelUpExp[MAX_LEVELS+1=100] (WORD × 100 = 200 字节)
 *   chunk 6  → lprgLevelUpMagic (LEVELUPMAGIC_ALL × N = {LEVELUPMAGIC m[5]} × N)
 *              LEVELUPMAGIC = {WORD wLevel; WORD wMagic}(sdlpal global.h:384-388)
 *              MAX_PLAYABLE_PLAYER_ROLES = 5
 *   chunk 11 → rgwBattleEffectIndex[10][2] (WORD × 20 = 40 字节)
 *   chunk 9  → SPRITEUI(单 sprite group,PAL_SpriteGetFrame flat index)
 *   chunk 10 → lpEffectSprite(单 sprite group,PAL_SpriteGetFrame flat index)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { openMkf, readChunk } from '../../../io/mkf.js'
import { framesToOut, parseSpriteChunk } from '../../sprite.js'
import { parseBattleEffectIndex, parseLevelUpExp, parseLevelUpMagic } from '../data-misc.js'
import { createFrameDigest } from './indexed-frame-digest.js'

describe('parseLevelUpExp', () => {
  it('parses sdlpal rgLevelUpExp shape: 100 WORD entries', () => {
    // sdlpal global.h: WORD g_GameData.rgLevelUpExp[MAX_LEVELS+1]; MAX_LEVELS=99
    const buf = new Uint8Array(200)
    new DataView(buf.buffer).setUint16(2, 100, true)
    new DataView(buf.buffer).setUint16(4, 250, true)
    new DataView(buf.buffer).setUint16(6, 500, true)
    const result = parseLevelUpExp(buf)
    expect(result).toHaveLength(100)
    expect(result[1]).toBe(100)
    expect(result[2]).toBe(250)
    expect(result[3]).toBe(500)
  })

  it('buf 小于 200 字节时截断处理,不抛错', () => {
    // 50 字节 → 25 条
    const buf = new Uint8Array(50)
    new DataView(buf.buffer).setUint16(0, 999, true)
    const result = parseLevelUpExp(buf)
    expect(result).toHaveLength(25)
    expect(result[0]).toBe(999)
  })
})

describe('parseLevelUpMagic', () => {
  it('20 entries × 5 roles(sdlpal LEVELUPMAGIC_ALL × 20)', () => {
    // LEVELUPMAGIC_ALL = { LEVELUPMAGIC m[5] }; LEVELUPMAGIC = { WORD wLevel; WORD wMagic }
    // 20 entries × 5 roles × 4 bytes = 400 字节
    const buf = new Uint8Array(400)
    const view = new DataView(buf.buffer)
    // entry 0, role 0: wLevel=5, wMagic=100
    view.setUint16(0, 5, true) // wLevel
    view.setUint16(2, 100, true) // wMagic
    // entry 0, role 1: wLevel=10, wMagic=200
    view.setUint16(4, 10, true)
    view.setUint16(6, 200, true)
    const result = parseLevelUpMagic(buf, 5)
    expect(result).toHaveLength(20)
    expect(result[0]).toHaveLength(5)
    expect(result[0]![0]).toEqual({ level: 5, magic: 100 })
    expect(result[0]![1]).toEqual({ level: 10, magic: 200 })
  })

  it('wMagic = 0 的 entry 仍被保留(不过滤)', () => {
    const buf = new Uint8Array(20) // 1 entry × 5 roles × 4 bytes
    // all zero → wMagic=0
    const result = parseLevelUpMagic(buf, 5)
    expect(result).toHaveLength(1)
    expect(result[0]![0]).toEqual({ level: 0, magic: 0 })
  })

  it('roleCount = 0 返回空数组', () => {
    const buf = new Uint8Array(20)
    const result = parseLevelUpMagic(buf, 0)
    expect(result).toHaveLength(0)
  })
})

describe('parseBattleEffectIndex', () => {
  it('parses WORD array', () => {
    const buf = new Uint8Array(20)
    new DataView(buf.buffer).setUint16(0, 42, true)
    new DataView(buf.buffer).setUint16(2, 43, true)
    expect(parseBattleEffectIndex(buf)).toEqual([42, 43, 0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('40 字节(sdlpal rgwBattleEffectIndex[10][2] = 20 WORD)解出 20 项', () => {
    const buf = new Uint8Array(40)
    const view = new DataView(buf.buffer)
    for (let i = 0; i < 20; i++) view.setUint16(i * 2, i + 1, true)
    const result = parseBattleEffectIndex(buf)
    expect(result).toHaveLength(20)
    expect(result[0]).toBe(1)
    expect(result[19]).toBe(20)
  })
})

// ── chunk 9 (SPRITEUI) + chunk 10 (battle effect sprite) ─────────────────

// 原盘是本文件的必需输入，缺失直接失败；fast既有排除不由测试内部假passed替代。
const DATA_MKF_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../../data/raw/DATA.MKF',
)

/**
 * 合成 sprite group chunk:N 帧,每帧 1×1 RLE。
 * sdlpal PAL_SpriteGetFrame 格式:
 *   byte 0..1 = imagecount(u16 LE);同时是 frame[0] word-offset
 *   byte 2*i .. 2*i+1 = frame[i] word-offset(u16 LE)
 *   frame data 从 word-offset * 2 字节处起:u16 w, u16 h, RLE...
 * frame[0] 的 byte-offset = imagecount * 2。
 */
function makeFakeSpriteChunk(frameCount: number): Uint8Array {
  // 每帧:4 字节 header(w=1,h=1) + 1 run长度 + 1 pixel = 6 字节，无行尾标记。
  // frame byte-offset 起点 = frameCount * 2
  const frameDataSize = 6 // 1×1 RLE: w(2) + h(2) + 0x01 run + 0xaa pixel = 6
  const headerSize = frameCount * 2
  const totalSize = headerSize + frameCount * frameDataSize
  const buf = new Uint8Array(totalSize)
  const view = new DataView(buf.buffer)
  for (let i = 0; i < frameCount; i++) {
    const byteOffset = headerSize + i * frameDataSize
    const wordOffset = byteOffset >> 1 // byteOffset / 2
    view.setUint16(i * 2, wordOffset, true)
    // frame data: w=1, h=1, RLE byte 0x01=run(1 pixel) then 0xaa
    view.setUint16(byteOffset, 1, true) // width = 1
    view.setUint16(byteOffset + 2, 1, true) // height = 1
    buf[byteOffset + 4] = 0x01 // RLE: 1 opaque pixel
    buf[byteOffset + 5] = 0xaa // palette index
  }
  return buf
}

describe('chunk 9 SPRITEUI sprite group — parseSpriteChunk + framesToOut', () => {
  it('合成 72 帧 sprite group 正确解出 72 帧(同 chunk 9 imagecount 真值)', () => {
    // sdlpal ui.h: SPRITENUM_ITEMBOX = 70 是已知最高 frame index;实测 imagecount = 72
    const buf = makeFakeSpriteChunk(72)
    const frames = parseSpriteChunk(buf)
    // 合成 chunk 全有效帧 — 应全部解出
    expect(frames).toHaveLength(72)
    expect(frames[0]!.width).toBe(1)
    expect(frames[0]!.height).toBe(1)
  })

  it('framesToOut 输出含 index + pngBytes(PNG 魔数 0x89)', () => {
    const buf = makeFakeSpriteChunk(3)
    const out = framesToOut(parseSpriteChunk(buf))
    expect(out).toHaveLength(3)
    expect(out[0]!.index).toBe(0)
    expect(out[2]!.index).toBe(2)
    expect(out[0]!.pngBytes[0]).toBe(0x89) // PNG magic
  })

  it('real DATA.MKF chunk 9 — 71有效帧与SDLPal全部RGBA', () => {
    const mkf = openMkf(new Uint8Array(readFileSync(DATA_MKF_PATH)))
    const chunk9 = readChunk(mkf, 9)
    expect(chunk9.byteLength).toBe(25532)
    const frames = parseSpriteChunk(chunk9)
    // imagecount=72包含末尾0 offset；SDLPal有效槽为0..70，共71帧。
    expect(frames).toHaveLength(71)
    const digest = createFrameDigest()
    digest.add(9, framesToOut(frames))
    // 未改SDLPal两底色绘制得到的全部RGBA与chunk/slot/尺寸摘要，见本卡native-proof。
    expect(digest.hex()).toBe('8b75275668872322a4c933eee3a65cb6b1d38722e659a13795501648051b4b5b')
  })
})

describe('chunk 10 battle effect sprite — parseSpriteChunk + framesToOut', () => {
  it('合成 86 帧 sprite group 正确解出 86 帧(同 chunk 10 imagecount 真值)', () => {
    // 实测 chunk 10 imagecount = 86(fight.c 中按顺序 index 消费帧)
    const buf = makeFakeSpriteChunk(86)
    const frames = parseSpriteChunk(buf)
    expect(frames).toHaveLength(86)
  })

  it('real DATA.MKF chunk 10 — 85有效帧与SDLPal全部RGBA', () => {
    const mkf = openMkf(new Uint8Array(readFileSync(DATA_MKF_PATH)))
    const chunk10 = readChunk(mkf, 10)
    expect(chunk10.byteLength).toBe(17478)
    const frames = parseSpriteChunk(chunk10)
    expect(frames).toHaveLength(85) // 86个声明槽，最后一个是0 offset。
    const digest = createFrameDigest()
    digest.add(10, framesToOut(frames))
    expect(digest.hex()).toBe('1d2ae53fae5d912b3307c0a4d7f09404304b61b19c39e7e35bb8e0244517d3bb')
  })
})

it('parseLevelUpMagic：负roleCount与不足一条输入返回空', () => {
  expect(parseLevelUpMagic(new Uint8Array(20), -3)).toEqual([])
  expect(parseLevelUpMagic(new Uint8Array(19), 5)).toEqual([])
})
