/**
 * TEST-MIGRATION-BOUNDARIES-1 T06：source-facts 剩余轴（source-facts.ts）。
 * 既有 translate-events.test:91 已覆盖六 WORD 名字映射与未知 fail-loud——不重复。
 * 本文件：名字 WORD 边界（36/41 命中、35/42/非整数 undefined）、legacyEventObjectEntityId
 * 边界（1→e0、0xfffe→e65533、0/0xffff/负/非整数拒绝）、partyPosToGrid 非对称 h 真值、
 * signExtendI16、sceneSlug 补零。
 */
import { describe, expect, test } from 'vitest'
import {
  FACING_BY_DIR,
  legacyEventObjectEntityId,
  partyPosToGrid,
  roleSlugForNameWord,
  sceneSlug,
  signExtendI16,
} from './source-facts.js'

describe('T06 source-facts 边界', () => {
  test('名字 WORD：36..41 命中（含 39=anu/40=wu-hou 指针对调修正），35/42/非整数 undefined', () => {
    expect(roleSlugForNameWord(36)).toBe('li-xiaoyao')
    expect(roleSlugForNameWord(39)).toBe('anu')
    expect(roleSlugForNameWord(40)).toBe('wu-hou')
    expect(roleSlugForNameWord(41)).toBe('gai-luojiao')
    expect(roleSlugForNameWord(35)).toBeUndefined()
    expect(roleSlugForNameWord(42)).toBeUndefined()
    expect(roleSlugForNameWord(36.5)).toBeUndefined()
  })
  test('legacyEventObjectEntityId：1-based→0-based；0/0xffff/负/非整数精确拒绝', () => {
    expect(legacyEventObjectEntityId(1)).toBe('e0')
    expect(legacyEventObjectEntityId(2)).toBe('e1')
    expect(legacyEventObjectEntityId(0xfffe)).toBe('e65533')
    expect(() => legacyEventObjectEntityId(0)).toThrow('非法 PAL EventObject ID: 0')
    expect(() => legacyEventObjectEntityId(0xffff)).toThrow('非法 PAL EventObject ID: 65535')
    expect(() => legacyEventObjectEntityId(-1)).toThrow('非法 PAL EventObject ID: -1')
    expect(() => legacyEventObjectEntityId(1.5)).toThrow('非法 PAL EventObject ID: 1.5')
  })
  test('partyPosToGrid：col/row/h 独立轴（px=col*32+h*16, py=row*16+h*8 真值）；signExtend/sceneSlug', () => {
    // 独立轴：只动 col → col 变 row 不变
    expect(partyPosToGrid(0, 0, 0)).toEqual({ col: 0, row: 0, height: 0 })
    // px=32,py=0 → a=2,b=0 → col=1,row=-1（菱形负半轴照常 round）
    expect(partyPosToGrid(1, 0, 0)).toEqual({ col: 1, row: -1, height: 0 })
    expect(partyPosToGrid(0, 1, 0)).toEqual({ col: 1, row: 1, height: 0 })
    // h 抬升同时影响像素 x/y（菱形）
    expect(partyPosToGrid(0, 0, 2)).toEqual({ col: 2, row: 0, height: 0 })
    expect(partyPosToGrid(3, 2, 1)).toEqual(partyPosToGrid(3 + 0.5, 2 + 0.5, 0))
    expect(signExtendI16(0x7fff)).toBe(0x7fff)
    expect(signExtendI16(0x8000)).toBe(-0x8000)
    expect(signExtendI16(0xffff)).toBe(-1)
    expect(sceneSlug(0)).toBe('s000')
    expect(sceneSlug(42)).toBe('s042')
    expect(FACING_BY_DIR).toEqual(['down', 'left', 'up', 'right'])
  })
})
