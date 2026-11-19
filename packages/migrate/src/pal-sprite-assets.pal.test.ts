import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { type AssetCatalogV1, palBattleSpriteAssetId, palSpriteAssetId } from '@type-pal/content'
import {
  parseIndexedRleChunk,
  parsePalSpriteChunk,
  parsePalSpriteChunkStrict,
  parseWorldSpriteChunk,
} from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { tempRepo } from './__tests__/pal-asset-fixtures.js'
import { sha256 } from './migration-baseline.js'
import {
  formatPalBattleSpriteReport,
  formatPalWorldSpriteReport,
  loadPalBattleSprites,
  loadPalWorldSprites,
  materializePalAssets,
  PAL_BATTLE_SPRITE_ENEMY_TUPLE_DIGEST,
  PAL_BATTLE_SPRITE_LEGACY_TAIL_ANOMALIES,
  PAL_BATTLE_SPRITE_PLAYER_TUPLE_DIGEST,
  PAL_BATTLE_SPRITE_TUPLE_DIGEST,
  PAL_WORLD_SPRITE_LEGACY_TAIL_ANOMALIES,
  PAL_WORLD_SPRITE_TUPLE_DIGEST,
} from './pal-assets.js'

const repo = fileURLToPath(new URL('../../../', import.meta.url))

const PAL_PLAYER_BATTLE_SPRITE_FRAME_COUNTS = [
  11, 10, 10, 10, 10, 10, 10, 10, 10, 11, 4, 13, 2, 6, 2, 5, 3, 5, 7,
] as const

const PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS = [
  4, 3, 4, 2, 3, 4, 3, 4, 3, 4, 4, 3, 3, 3, 3, 3, 4, 3, 3, 3, 6, 3, 3, 4, 5, 2, 3, 2, 2, 3, 4, 4, 3,
  5, 4, 5, 5, 3, 2, 5, 4, 6, 5, 7, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 2, 3, 2, 2, 1,
  7, 3, 3, 4, 2, 1, 1, 3, 4, 3, 3, 7, 4, 5, 9, 5, 5, 8, 10, 5, 5, 4, 3, 3, 3, 4, 4, 4, 4, 6, 3, 15,
  3, 11, 5, 5, 1, 6, 4, 4, 7, 2, 2, 4, 3, 3, 10, 5, 16, 4, 3, 5, 9, 9, 5, 2, 2, 4, 4, 9, 7, 3, 3, 8,
  4, 16, 2, 2, 4, 4, 4, 2, 6, 9, 1, 1, 1, 1, 1, 1, 1, 9, 7, 2, 3, 3, 2,
] as const

describe('PAL 大世界精灵全源门禁', () => {
  test('checks all 636 source chunks against the frozen strict and legacy parsing split', () => {
    const loaded = loadPalWorldSprites(repo)
    const anomalies = new Set<number>(
      PAL_WORLD_SPRITE_LEGACY_TAIL_ANOMALIES.map(({ sprite }) => sprite),
    )
    let canonical = 0
    let legacyTail = 0
    for (const source of loaded.binaries) {
      const number = Number(source.id.slice(source.id.lastIndexOf('.') + 1))
      if (!source.sourcePath) throw new Error(`${source.id} 缺文件来源`)
      const raw = gunzipSync(readFileSync(source.sourcePath))
      const looseFrames = parsePalSpriteChunk(raw)
      const legacy = parseWorldSpriteChunk(raw, 'legacy-migrated')
      if (legacy.frames.length !== looseFrames.length)
        throw new Error(`${source.id}: legacy/loose 帧数不一致`)
      for (let frame = 0; frame < looseFrames.length; frame++) {
        const actual = legacy.frames[frame]!
        const expected = looseFrames[frame]!
        if (
          actual.width !== expected.width ||
          actual.height !== expected.height ||
          !Buffer.from(actual.pixels).equals(expected.pixels) ||
          !Buffer.from(actual.opaque).equals(expected.opaque)
        )
          throw new Error(`${source.id}: frame ${frame} 与宽松解析不一致`)
      }
      if (anomalies.has(number)) {
        legacyTail++
        expect(legacy.skippedLegacyTailSlots, source.id).toBeGreaterThan(0)
        expect(() => parsePalSpriteChunkStrict(raw), source.id).toThrow()
      } else {
        canonical++
        expect(legacy.skippedLegacyTailSlots, source.id).toBe(0)
        const strict = parsePalSpriteChunkStrict(raw)
        if (strict.length !== looseFrames.length)
          throw new Error(`${source.id}: canonical/loose 帧数不一致`)
      }
    }
    expect({ canonical, legacyTail }).toEqual({ canonical: 607, legacyTail: 29 })
  }, 20_000)

  test('636 tuple/字节/帧/坏尾清单与 CLI 证据精确冻结', () => {
    const loaded = loadPalWorldSprites(repo)
    expect(loaded.report).toEqual({
      sprites: 636,
      spriteBytes: 1_332_725,
      spriteFrames: 4_134,
      spriteMalformedTailSlots: 29,
      spriteTupleDigest: PAL_WORLD_SPRITE_TUPLE_DIGEST,
      spriteLegacyTailAnomalies: [...PAL_WORLD_SPRITE_LEGACY_TAIL_ANOMALIES],
    })
    expect(formatPalWorldSpriteReport(loaded.report)).toBe(
      `[大世界精灵资源] sprites=636 bytes=1332725 frames=4134 ` +
        `malformed-tail-slots=29 tuple-digest=${PAL_WORLD_SPRITE_TUPLE_DIGEST}`,
    )
  })

  test('全 636 源逐文件物化 byte-exact，二次物化零写入', () => {
    const loaded = loadPalWorldSprites(repo)
    const temp = tempRepo()
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: Object.fromEntries(loaded.binaries.map((source) => [source.id, source.record])),
    }

    expect(materializePalAssets({ repo: temp, catalog, binaries: loaded.binaries })).toEqual({
      written: 636,
      unchanged: 0,
      authored: 0,
      files: 636,
      bytes: 1_332_725,
    })
    for (let number = 1; number <= 636; number++) {
      const asset = palSpriteAssetId(number)
      const source = loaded.binaries[number - 1]!
      const record = catalog.assets[asset]!
      if (!source.sourcePath) throw new Error(`${asset} 缺文件来源`)
      expect(source.id).toBe(asset)
      expect(record).toMatchObject({
        kind: 'sprite',
        path: `assets/migrated/sprites/${String(number).padStart(3, '0')}.rle`,
        mediaType: 'application/vnd.type-pal.rle',
        origin: { kind: 'legacy-migrated', ref: `sprite/${number}.rle` },
      })
      const sourceBytes = readFileSync(source.sourcePath)
      const targetBytes = readFileSync(resolve(temp, 'projects/pal', record.path))
      expect(targetBytes.equals(sourceBytes)).toBe(true)
      expect(targetBytes[0]).toBe(0x1f)
      expect(targetBytes[1]).toBe(0x8b)
      expect(targetBytes.byteLength).toBe(record.bytes)
      expect(sha256(targetBytes)).toBe(record.sha256)
    }
    expect(materializePalAssets({ repo: temp, catalog, binaries: loaded.binaries })).toEqual({
      written: 0,
      unchanged: 636,
      authored: 0,
      files: 636,
      bytes: 1_332_725,
    })
  }, 20_000)
})

describe('PAL 战斗精灵资源闭包', () => {
  test('player 19 全 canonical；enemy 147 canonical + 6 个 legacy 坏尾，同号跨 channel 不冲突', () => {
    const loaded = loadPalBattleSprites(repo)
    expect(loaded.binaries).toHaveLength(172)
    expect(new Set(loaded.binaries.map(({ id }) => id)).size).toBe(172)
    expect(loaded.binaries.some(({ id }) => id === palBattleSpriteAssetId('player', 1))).toBe(true)
    expect(loaded.binaries.some(({ id }) => id === palBattleSpriteAssetId('enemy', 1))).toBe(true)
    const canonicalFailures: Array<{ channel: 'player' | 'enemy'; sprite: number }> = []
    for (const source of loaded.binaries) {
      if (!source.sourcePath) throw new Error(`${source.id} 缺文件来源`)
      const match = /^battle-sprite\.pal\.(player|enemy)\.(\d{3})$/.exec(source.id)
      if (!match) throw new Error(`非法 battle AssetId ${source.id}`)
      const channel = match[1] as 'player' | 'enemy'
      const sprite = Number(match[2])
      const raw = gunzipSync(readFileSync(source.sourcePath))
      try {
        parseIndexedRleChunk(raw, 'canonical')
      } catch {
        canonicalFailures.push({ channel, sprite })
      }
      const decoded = parseIndexedRleChunk(raw, 'legacy-migrated')
      const expectedFrames =
        channel === 'player'
          ? PAL_PLAYER_BATTLE_SPRITE_FRAME_COUNTS[sprite]
          : PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS[sprite - 1]
      expect(decoded.frames.length, source.id).toBe(expectedFrames)
    }
    expect(canonicalFailures).toEqual(
      PAL_BATTLE_SPRITE_LEGACY_TAIL_ANOMALIES.map(({ channel, sprite }) => ({
        channel,
        sprite,
      })),
    )
  })

  test('172 资源数/字节/帧/坏尾/digest 与 CLI 证据精确冻结', () => {
    const loaded = loadPalBattleSprites(repo)
    expect(loaded.report).toEqual({
      battleSprites: 172,
      battleSpriteBytes: 900_973,
      battleSpriteRawBytes: 2_313_598,
      battleSpriteFrames: 775,
      battleSpriteMalformedTailSlots: 6,
      battleSpritePlayerTupleDigest: PAL_BATTLE_SPRITE_PLAYER_TUPLE_DIGEST,
      battleSpriteEnemyTupleDigest: PAL_BATTLE_SPRITE_ENEMY_TUPLE_DIGEST,
      battleSpriteTupleDigest: PAL_BATTLE_SPRITE_TUPLE_DIGEST,
      battleSpritePlayerFrameCounts: [...PAL_PLAYER_BATTLE_SPRITE_FRAME_COUNTS],
      battleSpriteEnemyFrameCounts: [...PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS],
      battleSpriteLegacyTailAnomalies: [...PAL_BATTLE_SPRITE_LEGACY_TAIL_ANOMALIES],
    })
    expect(formatPalBattleSpriteReport(loaded.report)).toBe(
      `[战斗精灵资源] sprites=172 bytes=900973 raw-bytes=2313598 frames=775 ` +
        `malformed-tail-slots=6 player-digest=${PAL_BATTLE_SPRITE_PLAYER_TUPLE_DIGEST} ` +
        `enemy-digest=${PAL_BATTLE_SPRITE_ENEMY_TUPLE_DIGEST} ` +
        `tuple-digest=${PAL_BATTLE_SPRITE_TUPLE_DIGEST}`,
    )
  })

  test('全 172 源逐文件物化 byte-exact，二次物化零写入', () => {
    const loaded = loadPalBattleSprites(repo)
    const temp = tempRepo()
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: Object.fromEntries(loaded.binaries.map((source) => [source.id, source.record])),
    }
    expect(materializePalAssets({ repo: temp, catalog, binaries: loaded.binaries })).toEqual({
      written: 172,
      unchanged: 0,
      authored: 0,
      files: 172,
      bytes: 900_973,
    })
    for (const source of loaded.binaries) {
      if (!source.sourcePath) throw new Error(`${source.id} 缺文件来源`)
      const record = catalog.assets[source.id]!
      const match = /^battle-sprite\.pal\.(player|enemy)\.(\d{3})$/.exec(source.id)
      if (!match) throw new Error(`非法 battle AssetId ${source.id}`)
      const channel = match[1]!
      const padded = match[2]!
      const number = Number(padded)
      expect(record).toMatchObject({
        kind: 'battle-sprite',
        path: `assets/migrated/battle-sprites/${channel}/${padded}.rle`,
        mediaType: 'application/vnd.type-pal.rle',
        origin: {
          kind: 'legacy-migrated',
          ref: `battle-sprite/${channel}/${number}.rle`,
        },
      })
      const sourceBytes = readFileSync(source.sourcePath)
      const targetBytes = readFileSync(resolve(temp, 'projects/pal', record.path))
      expect(targetBytes.equals(sourceBytes), source.id).toBe(true)
      expect(targetBytes.subarray(0, 2)).toEqual(Buffer.from([0x1f, 0x8b]))
      expect(targetBytes.byteLength).toBe(record.bytes)
      expect(sha256(targetBytes)).toBe(record.sha256)
    }
    expect(materializePalAssets({ repo: temp, catalog, binaries: loaded.binaries })).toEqual({
      written: 0,
      unchanged: 172,
      authored: 0,
      files: 172,
      bytes: 900_973,
    })
  }, 20_000)
})
