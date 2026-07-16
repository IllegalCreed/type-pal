import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import type { AssetCatalogV1 } from '@type-pal/content'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256 } from './migration-baseline.js'
import { materializePalAssets, type PalBinaryAssetSource } from './pal-assets.js'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('PAL 二进制资源所有权物化', () => {
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
})
