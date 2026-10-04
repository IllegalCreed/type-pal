/**
 * TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 · pal-extract 散落守卫残余分支。
 *
 * 排重 basis（旧 fullName 不重复）：各模块既有 *.test.ts / *.boundaries.test.ts /
 * *.glm-runtime-resource.test.ts 已覆盖合法路径与主边界（见各文件头注）；本文件只补
 * fast lcov 一手测量的未覆盖 edge：
 * - map.ts:37 parseMap 长度守卫精确拒绝。
 * - palette.ts:11-13 decodePalette 短缓冲 `?? 0` 三通道回退。
 * - io/word.ts:94 parseWordDat 短缓冲 flat 截断 break。
 * - font/bdf-to-json.ts:47 非法 hex 位图行 `parseInt || 0` 回退。
 * - resources/asset-manifest.ts:31 buildManifest 相同 path 排序相等臂 + 非资源排除。
 * - resources/sprite.ts:76 extractCharacterSprites 缺 chunk skip。
 * - parsers/enemies.ts:210/240 两个 OBJECT_ENEMY map 建造器短缓冲提前返回。
 * - parsers/items.ts:75 parseItems 截断精确拒绝。
 * - parsers/rgm.ts:46 decodeRgmPortrait 0 宽/高帧返回 null。
 * - parsers/spells.ts:146 无 words 时不填 _name。
 * - parsers/stores.ts:29 / battle-fields.ts:45 尺寸不整除精确拒绝。
 * - parsers/data-misc.ts:68/70 parseLevelUpMagic roleCount<=0 与短缓冲返回空。
 * - parsers/enemy-teams.ts:106 槽位查无名字不进入 _names；全无名不设 _names 键。
 * 不覆盖（ledger）：scene.ts:52 `if (!scene) continue`（dumpAllEventObjects 循环上界为
 * scenes.length，dense 数组构造上不可达）、player-roles.ts:211 cursor 守卫（入函数先验
 * 900B 长度 + 固定步进，cursor 恒等于 PLAYER_ROLES_BYTES，构造上不可达）。
 */

import { encodeSpriteChunk } from '@type-pal/shared'
import { describe, expect, test, vi } from 'vitest'
import { parseBdf } from '../font/bdf-to-json.js'
import { parseWordDat } from '../io/word.js'
import { buildManifest } from '../resources/asset-manifest.js'
import { parseMap } from '../resources/map.js'
import { decodePalette } from '../resources/palette.js'
import { parseBattleFields } from '../resources/parsers/battle-fields.js'
import { parseLevelUpMagic } from '../resources/parsers/data-misc.js'
import {
  buildEnemyObjectNameMap,
  buildObjectIndexToEnemyIdMap,
} from '../resources/parsers/enemies.js'
import { parseEnemyTeams } from '../resources/parsers/enemy-teams.js'
import { parseItems } from '../resources/parsers/items.js'
import { decodeRgmPortrait } from '../resources/parsers/rgm.js'
import { parseSpells } from '../resources/parsers/spells.js'
import { parseStores } from '../resources/parsers/stores.js'
import { extractCharacterSprites } from '../resources/sprite.js'

function u16le(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true)
}

describe('KIMI-R1 pal-extract 散落守卫', () => {
  test('parseMap：非 65536 字节精确拒绝', () => {
    expect(() => parseMap(new Uint8Array(100), new Uint8Array(0))).toThrow(
      'parseMap: expected 65536 bytes, got 100',
    )
  })

  test('parseMap：合法 65536B 全零图 + sprite chunk → 全 0 cell 与帧列表', () => {
    const gop = encodeSpriteChunk([
      {
        width: 4,
        height: 4,
        pixels: new Uint8Array(16).fill(3),
        opaque: new Uint8Array(16).fill(1),
      },
    ])
    const result = parseMap(new Uint8Array(65536), gop)
    expect(result.tilemap.width).toBe(64)
    expect(result.tilemap.height).toBe(128)
    expect(result.tilemap.cells).toHaveLength(128)
    expect(result.tilemap.cells[0]).toHaveLength(64)
    expect(result.tilemap.cells[0]![0]).toEqual({ lower: 0, upper: 0 })
    expect(result.tilemap.cells[127]![63]).toEqual({ lower: 0, upper: 0 })
    expect(result.tilemap.tileset).toBe('')
    expect(result.tiles).toHaveLength(1)
  })

  test('decodePalette：短缓冲三通道 `?? 0` 回退为全黑且无夜色', () => {
    const palette = decodePalette(new Uint8Array([0x3f]))
    expect(palette.colors).toHaveLength(256)
    expect(palette.colors[0]).toEqual([255, 0, 0]) // 仅第 0 字节有值：63 → (63<<2)|(63>>4)=255
    expect(palette.colors[1]).toEqual([0, 0, 0]) // 越界字节全部 ?? 0
    expect(palette.colors[255]).toEqual([0, 0, 0])
    expect(palette.nightColors).toBeUndefined()
  })

  test('parseWordDat：短缓冲 flat 在越界处 break，分类切片仍按偏移读取', () => {
    // 5650B 全量 → flat 565；100B → flat 恰 10 条即 break
    const words = parseWordDat(new Uint8Array(100).fill(0x20))
    expect(words.flat).toHaveLength(10)
    expect(words.flat[0]).toBe('') // 全空格记录剥尾后为空串
    expect(words.persons).toHaveLength(6) // readBlock 越界 subarray 钳制为空串
    expect(words.items).toHaveLength(235)
    expect(words.system).toHaveLength(36)
    expect(words.battleUi).toHaveLength(19)
  })

  test('parseBdf：位图行非法 hex 回退 0，合法行保真', () => {
    const text = [
      'STARTFONT 2.1',
      'STARTCHAR A',
      'ENCODING 65',
      'BBX 8 2 0 0 0',
      'BITMAP',
      'ZZ', // 非法 hex → NaN || 0 → 0
      '0F',
      'ENDCHAR',
      'ENDFONT',
    ].join('\n')
    const glyphs = parseBdf(text)
    expect(glyphs).toHaveLength(1)
    expect(glyphs[0]!.codepoint).toBe(65)
    expect([...glyphs[0]!.bitmap]).toEqual([0, 0x0f])
  })

  test('parseBdf：位图行循环内遇 ENDCHAR 提前截断（rowIdx < height 即 break）', () => {
    const text = [
      'STARTFONT 2.1',
      'STARTCHAR T',
      'ENCODING 84',
      'BBX 8 4 0 0 0', // 声明 4 行，只给 1 行即 ENDCHAR → 行内 break
      'BITMAP',
      '0F',
      'ENDCHAR',
      'ENDFONT',
    ].join('\n')
    const glyphs = parseBdf(text)
    expect(glyphs).toHaveLength(1)
    expect(glyphs[0]!.codepoint).toBe(84)
    expect([...glyphs[0]!.bitmap]).toEqual([0x0f, 0, 0, 0]) // 余下行保持 0
  })

  test('parseBdf：零宽字形 bytesPerRow=0，位图行循环零次进入', () => {
    const text = [
      'STARTFONT 2.1',
      'STARTCHAR Z',
      'ENCODING 90',
      'BBX 0 2 0 0 0', // width 0 → bytesPerRow = 0 → 内层 for 不进入
      'BITMAP',
      'FF',
      'FF',
      'ENDCHAR',
      'ENDFONT',
    ].join('\n')
    const glyphs = parseBdf(text)
    expect(glyphs).toHaveLength(1)
    expect(glyphs[0]!.width).toBe(0)
    expect(glyphs[0]!.bitmap).toHaveLength(0)
  })

  test('buildManifest：相同 path 排序稳定（comparator 相等臂）且排除自身与 .DS_Store', () => {
    const manifest = buildManifest([
      { path: 'b/2.png', size: 2 },
      { path: 'asset-manifest.json', size: 999 }, // SELF 排除
      { path: 'a/.DS_Store', size: 5 }, // 排除
      { path: 'a/1.png', size: 1 },
      { path: 'b/2.png', size: 2 }, // 与首项同 path 同 size → sort 相等臂
    ])
    expect(manifest.files).toEqual([
      { path: 'a/1.png', size: 1 },
      { path: 'b/2.png', size: 2 },
      { path: 'b/2.png', size: 2 },
    ])
    expect(manifest.fileCount).toBe(3)
    expect(manifest.totalBytes).toBe(5)
  })

  test('extractCharacterSprites：spriteIds 中的缺 chunk 项 warn 后 skip', () => {
    const chunk = encodeSpriteChunk([
      { width: 2, height: 2, pixels: new Uint8Array(4).fill(3), opaque: new Uint8Array(4).fill(1) },
    ])
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const out = extractCharacterSprites([1, 99], new Map([[1, chunk]]))
      expect(out).toHaveLength(1)
      expect(out[0]!.spriteId).toBe(1)
      expect(out[0]!.frames).toHaveLength(1)
      expect(warn).toHaveBeenCalledWith('[pal-extract] sprite 99: MGO.MKF chunk 未找到,skip')
    } finally {
      warn.mockRestore()
    }
  })

  test('buildEnemyObjectNameMap / buildObjectIndexToEnemyIdMap：短缓冲提前返回空 map', () => {
    const words = parseWordDat(new Uint8Array(5650).fill(0x20))
    const short = new Uint8Array(100)
    expect(buildEnemyObjectNameMap(short, words).size).toBe(0)
    expect(buildObjectIndexToEnemyIdMap(short).size).toBe(0)
  })

  test('parseItems：截断精确拒绝（报实测与所需字节数）', () => {
    expect(() => parseItems(new Uint8Array(100))).toThrow(
      'parseItems: SSS.MKF chunk 2 truncated (got 100B, need ≥ 4144B for items 0..234)',
    )
  })

  test('decodeRgmPortrait：0 宽 / 0 高帧返回 null（不写 PNG）', () => {
    const header = [0x02, 0x00, 0x00, 0x00]
    expect(decodeRgmPortrait(7, new Uint8Array([...header, 0, 0, 2, 0]))).toBeNull() // width=0
    expect(decodeRgmPortrait(8, new Uint8Array([...header, 2, 0, 0, 0]))).toBeNull() // height=0
  })

  test('parseSpells：无 words 时不填 _name 注释', () => {
    const objBuf = new Uint8Array((296 + 102) * 14)
    const spells = parseSpells(objBuf)
    expect(spells).toHaveLength(103) // 102 法术段 + 梦蛇追加
    expect(spells[0]!.id).toBe(296)
    expect('_name' in spells[0]!).toBe(false)
  })

  test('parseStores / parseBattleFields：尺寸不整除精确拒绝', () => {
    expect(() => parseStores(new Uint8Array(7))).toThrow(
      'parseStores: DATA.MKF chunk 0 size 7 不能被 STORE_RECORD_SIZE=18 整除',
    )
    expect(() => parseBattleFields(new Uint8Array(7))).toThrow(
      'parseBattleFields: DATA.MKF chunk 5 size 7 不能被 FIELD_RECORD_SIZE=12 整除',
    )
  })

  test('parseLevelUpMagic：roleCount<=0 与短缓冲均返回空', () => {
    expect(parseLevelUpMagic(new Uint8Array(20), 0)).toEqual([])
    expect(parseLevelUpMagic(new Uint8Array(20), -3)).toEqual([])
    expect(parseLevelUpMagic(new Uint8Array(19), 5)).toEqual([]) // 19B < 5×4B 一条
  })

  test('parseEnemyTeams：槽位查无名字不进 _names；全无名不设 _names 键', () => {
    // 2 支队伍 × 5 槽 u16；team0 槽 [398,401,0,0xffff,0]，team1 槽 [401,0,0,0,0]
    const buf = new Uint8Array(20)
    const view = new DataView(buf.buffer)
    u16le(view, 0, 398)
    u16le(view, 2, 401)
    u16le(view, 4, 0)
    u16le(view, 6, 0xffff)
    u16le(view, 10, 401)
    const names = new Map([[398, '蛇妖']]) // 401 查无名字
    const teams = parseEnemyTeams(buf, names)
    expect(teams).toHaveLength(2)
    expect(teams[0]!._names).toEqual(['蛇妖']) // 401 无名跳过；0/0xffff 空槽跳过
    expect('_names' in teams[1]!).toBe(false) // 全槽无名 → 不设键
  })
})
