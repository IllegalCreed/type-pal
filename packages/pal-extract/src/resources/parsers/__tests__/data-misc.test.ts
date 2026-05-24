/**
 * data-misc.ts 测试 —— parseLevelUpExp / parseLevelUpMagic / parseBattleEffectIndex。
 *
 * sdlpal 真值来源:
 *   chunk 14 → rgLevelUpExp[MAX_LEVELS+1=100] (WORD × 100 = 200 字节)
 *   chunk 6  → lprgLevelUpMagic (LEVELUPMAGIC_ALL × N = {LEVELUPMAGIC m[5]} × N)
 *              LEVELUPMAGIC = {WORD wLevel; WORD wMagic}(sdlpal global.h:384-388)
 *              MAX_PLAYABLE_PLAYER_ROLES = 5
 *   chunk 11 → rgwBattleEffectIndex[10][2] (WORD × 20 = 40 字节)
 */
import { describe, expect, it } from 'vitest'
import { parseBattleEffectIndex, parseLevelUpExp, parseLevelUpMagic } from '../data-misc.js'

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
    view.setUint16(0, 5, true)   // wLevel
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
