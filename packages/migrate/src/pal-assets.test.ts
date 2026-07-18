import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AssetCatalogV1 } from '@type-pal/content'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256 } from './migration-baseline.js'
import {
  loadPalSoundAssets,
  materializePalAssets,
  type PalBinaryAssetSource,
} from './pal-assets.js'

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
