import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { type AssetCatalogV1, palBattleSpriteAssetId, palSpriteAssetId } from '@type-pal/content'
import { parseIndexedRleChunk, parseSpriteChunk, parseWorldSpriteChunk } from '@type-pal/shared'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256 } from './migration-baseline.js'
import {
  formatPalBattleSpriteReport,
  formatPalWorldSpriteReport,
  loadPalBattleSprites,
  loadPalSoundAssets,
  loadPalWorldSprites,
  materializePalAssets,
  PAL_BATTLE_SPRITE_ENEMY_TUPLE_DIGEST,
  PAL_BATTLE_SPRITE_LEGACY_TAIL_ANOMALIES,
  PAL_BATTLE_SPRITE_PLAYER_TUPLE_DIGEST,
  PAL_BATTLE_SPRITE_TUPLE_DIGEST,
  PAL_WORLD_SPRITE_LEGACY_TAIL_ANOMALIES,
  PAL_WORLD_SPRITE_TUPLE_DIGEST,
  type PalBinaryAssetSource,
} from './pal-assets.js'
import {
  PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS,
  PAL_PLAYER_BATTLE_SPRITE_FRAME_COUNTS,
} from './pal-battle-sprites.js'

const roots: string[] = []
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('PAL 二进制资源所有权物化', () => {
  test('四类静态图 authored 接管后逐字节保留，不物化对应迁移源', () => {
    const temp = mkdtempSync(resolve(tmpdir(), 'type-pal-static-assets-'))
    roots.push(temp)
    const families = [
      ['portrait.pal.001', 'portrait'],
      ['face.pal.li-xiaoyao', 'face'],
      ['item-icon.pal.001', 'item-icon'],
      ['battle-background.pal.006', 'battle-background'],
    ] as const
    const binaries: PalBinaryAssetSource[] = []
    const catalog: AssetCatalogV1 = { version: 1, assets: {} }
    for (const [id, kind] of families) {
      const migrated = Uint8Array.from([1, 2, 3])
      const authored = Uint8Array.from([9, kind.length, 7, 6])
      const migratedPath = `assets/migrated/${kind}/source.png`
      const authoredPath = `assets/authored/${kind}.png`
      binaries.push({
        id,
        bytes: migrated,
        record: {
          kind,
          path: migratedPath,
          mediaType: 'image/png',
          bytes: migrated.byteLength,
          sha256: sha256(migrated),
          origin: { kind: 'legacy-migrated' },
        },
      })
      catalog.assets[id] = {
        kind,
        path: authoredPath,
        mediaType: 'image/png',
        bytes: authored.byteLength,
        sha256: sha256(authored),
        origin: { kind: 'authored' },
      }
      const target = resolve(temp, 'projects/pal', authoredPath)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, authored)
    }

    expect(materializePalAssets({ repo: temp, catalog, binaries })).toEqual({
      written: 0,
      unchanged: 0,
      authored: 4,
      files: 4,
      bytes: Object.values(catalog.assets).reduce((sum, record) => sum + record.bytes, 0),
    })
    for (const [id, kind] of families) {
      const record = catalog.assets[id]!
      expect(readFileSync(resolve(temp, 'projects/pal', record.path))).toEqual(
        Buffer.from([9, kind.length, 7, 6]),
      )
      expect(existsSync(resolve(temp, `projects/pal/assets/migrated/${kind}/source.png`))).toBe(
        false,
      )
    }
  })

  test('同 AssetId 被作者接管后保留 authored 路径与字节，不复制迁移源', () => {
    const repo = mkdtempSync(resolve(tmpdir(), 'type-pal-assets-'))
    roots.push(repo)
    const migrated = Uint8Array.from([1, 2])
    const authored = Uint8Array.from([9, 8, 7])
    const source: PalBinaryAssetSource = {
      id: 'video.pal.001',
      bytes: migrated,
      record: {
        kind: 'video',
        path: 'assets/migrated/videos/001.mp4',
        mediaType: 'video/mp4',
        bytes: migrated.byteLength,
        sha256: sha256(migrated),
        origin: { kind: 'legacy-migrated' },
      },
    }
    const authoredPath = 'assets/authored/video/replacement.mp4'
    const destination = resolve(repo, 'projects/pal', authoredPath)
    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, authored)
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: {
        'video.pal.001': {
          kind: 'video',
          path: authoredPath,
          mediaType: 'video/mp4',
          bytes: authored.byteLength,
          sha256: sha256(authored),
          origin: { kind: 'authored' },
        },
      },
    }

    expect(materializePalAssets({ repo, catalog, binaries: [source] })).toEqual({
      written: 0,
      unchanged: 0,
      authored: 1,
      files: 1,
      bytes: authored.byteLength,
    })
    expect(readFileSync(destination)).toEqual(Buffer.from(authored))
    expect(() =>
      readFileSync(resolve(repo, 'projects/pal/assets/migrated/videos/001.mp4')),
    ).toThrow()
  })

  test('非 authored 记录不得改写迁移器控制的路径或 hash', () => {
    const repo = mkdtempSync(resolve(tmpdir(), 'type-pal-assets-'))
    roots.push(repo)
    const bytes = Uint8Array.from([1, 2])
    const source: PalBinaryAssetSource = {
      id: 'video.pal.001',
      bytes,
      record: {
        kind: 'video',
        path: 'assets/migrated/videos/001.mp4',
        mediaType: 'video/mp4',
        bytes: bytes.byteLength,
        sha256: sha256(bytes),
        origin: { kind: 'legacy-migrated' },
      },
    }
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: {
        'video.pal.001': {
          ...source.record,
          path: 'assets/migrated/videos/wrong.mp4',
        },
      },
    }
    expect(() => materializePalAssets({ repo, catalog, binaries: [source] })).toThrow(
      '被非 authored 记录改写',
    )
  })

  test('非 authored 记录不得漂移迁移器控制的 origin', () => {
    const temp = mkdtempSync(resolve(tmpdir(), 'type-pal-assets-origin-'))
    roots.push(temp)
    const bytes = Uint8Array.from([1, 2])
    const source: PalBinaryAssetSource = {
      id: 'video.pal.001',
      bytes,
      record: {
        kind: 'video',
        path: 'assets/migrated/videos/001.mp4',
        mediaType: 'video/mp4',
        bytes: bytes.byteLength,
        sha256: sha256(bytes),
        origin: { kind: 'legacy-migrated', ref: 'video/1.avi' },
      },
    }
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: {
        [source.id]: {
          ...source.record,
          origin: { kind: 'legacy-migrated', ref: 'video/wrong.avi' },
        },
      },
    }
    expect(() => materializePalAssets({ repo: temp, catalog, binaries: [source] })).toThrow(
      '.origin 被非 authored 记录改写',
    )
    expect(existsSync(resolve(temp, 'projects/pal/assets/migrated/videos/001.mp4'))).toBe(false)
  })

  test('全部迁移源预检通过前不写任何目标', () => {
    const temp = mkdtempSync(resolve(tmpdir(), 'type-pal-assets-'))
    roots.push(temp)
    const good = Uint8Array.from([1, 2])
    const invalid = Uint8Array.from([3])
    const sources: PalBinaryAssetSource[] = [
      {
        id: 'video.pal.001',
        bytes: good,
        record: {
          kind: 'video',
          path: 'assets/migrated/videos/001.mp4',
          mediaType: 'video/mp4',
          bytes: good.byteLength,
          sha256: sha256(good),
          origin: { kind: 'legacy-migrated' },
        },
      },
      {
        id: 'video.pal.002',
        bytes: invalid,
        record: {
          kind: 'video',
          path: 'assets/migrated/videos/002.mp4',
          mediaType: 'video/mp4',
          bytes: 2,
          sha256: sha256(Uint8Array.from([3, 4])),
          origin: { kind: 'legacy-migrated' },
        },
      },
    ]
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: Object.fromEntries(sources.map((source) => [source.id, source.record])),
    }
    expect(() => materializePalAssets({ repo: temp, catalog, binaries: sources })).toThrow(
      'bytes/hash',
    )
    expect(existsSync(resolve(temp, 'projects/pal/assets/migrated/videos/001.mp4'))).toBe(false)
  })

  test('写入前拒绝两个 AssetId 共用同一目标路径', () => {
    const temp = mkdtempSync(resolve(tmpdir(), 'type-pal-assets-'))
    roots.push(temp)
    const bytes = Uint8Array.from([1])
    const record = {
      kind: 'video' as const,
      path: 'assets/migrated/videos/shared.mp4',
      mediaType: 'video/mp4',
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
      origin: { kind: 'legacy-migrated' as const },
    }
    const sources: PalBinaryAssetSource[] = [
      { id: 'video.pal.001', bytes, record },
      { id: 'video.pal.002', bytes, record },
    ]
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: Object.fromEntries(sources.map((source) => [source.id, source.record])),
    }
    expect(() => materializePalAssets({ repo: temp, catalog, binaries: sources })).toThrow(
      '资源路径冲突',
    )
    expect(existsSync(resolve(temp, 'projects/pal/assets/migrated/videos/shared.mp4'))).toBe(false)
  })
})

describe('PAL 大世界精灵全源门禁', () => {
  test('真实 606 个 canonical 与 30 个坏尾源逐帧对齐宽松真值', () => {
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
      const looseTruth = parseSpriteChunk(raw)
      const legacy = parseWorldSpriteChunk(raw, 'legacy-migrated')
      if (legacy.frames.length !== looseTruth.length)
        throw new Error(`${source.id}: legacy/loose 帧数不一致`)
      for (let frame = 0; frame < looseTruth.length; frame++) {
        const actual = legacy.frames[frame]!
        const expected = looseTruth[frame]!
        if (
          actual.width !== expected.width ||
          actual.height !== expected.height ||
          !Buffer.from(actual.pixels).equals(expected.pixels) ||
          !Buffer.from(actual.opaque).equals(expected.opaque)
        )
          throw new Error(`${source.id}: frame ${frame} 与宽松真值不一致`)
      }
      if (anomalies.has(number)) {
        legacyTail++
        expect(legacy.skippedLegacyTailSlots, source.id).toBeGreaterThan(0)
        expect(() => parseWorldSpriteChunk(raw, 'canonical'), source.id).toThrow()
      } else {
        canonical++
        expect(legacy.skippedLegacyTailSlots, source.id).toBe(0)
        const strict = parseWorldSpriteChunk(raw, 'canonical').frames
        if (strict.length !== looseTruth.length)
          throw new Error(`${source.id}: canonical/loose 帧数不一致`)
      }
    }
    expect({ canonical, legacyTail }).toEqual({ canonical: 606, legacyTail: 30 })
  }, 20_000)

  test('636 tuple/字节/帧/坏尾清单与 CLI 证据精确冻结', () => {
    const loaded = loadPalWorldSprites(repo)
    expect(loaded.report).toEqual({
      sprites: 636,
      spriteBytes: 1_332_725,
      spriteFrames: 4_133,
      spriteMalformedTailSlots: 30,
      spriteTupleDigest: PAL_WORLD_SPRITE_TUPLE_DIGEST,
      spriteLegacyTailAnomalies: [...PAL_WORLD_SPRITE_LEGACY_TAIL_ANOMALIES],
    })
    expect(formatPalWorldSpriteReport(loaded.report)).toBe(
      `[大世界精灵资源] sprites=636 bytes=1332725 frames=4133 ` +
        `malformed-tail-slots=30 tuple-digest=${PAL_WORLD_SPRITE_TUPLE_DIGEST}`,
    )
  })

  test('全 636 源逐文件物化 byte-exact，二次物化零写入', () => {
    const loaded = loadPalWorldSprites(repo)
    const temp = mkdtempSync(resolve(tmpdir(), 'type-pal-world-sprites-'))
    roots.push(temp)
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
    const temp = mkdtempSync(resolve(tmpdir(), 'type-pal-battle-sprites-'))
    roots.push(temp)
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

describe('PAL sound 提取闭包', () => {
  test('metadata、asset-manifest 与目录精确闭合为 363 个 RIFF/WAVE', () => {
    const loaded = loadPalSoundAssets(repo)
    expect(loaded.report).toEqual({ sounds: 363, emptySounds: 142, soundBytes: 18_110_864 })
    expect(loaded.binaries).toHaveLength(363)
    expect(new Set(loaded.binaries.map((source) => source.id)).size).toBe(363)
    expect(loaded.binaries.find((source) => source.id === 'sound.pal.122')).toBeUndefined()
    expect(loaded.binaries.find((source) => source.id === 'sound.pal.045')?.record).toMatchObject({
      kind: 'sound',
      path: 'assets/migrated/sounds/045.wav',
      mediaType: 'audio/wav',
      origin: { kind: 'legacy-migrated', ref: 'sounds/45.wav' },
    })
  })
})
