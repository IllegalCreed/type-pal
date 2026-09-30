import type { AssetCatalogV1, AssetRecordV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { palSoundAssetForSources } from './pal-sound-assets.js'

const HEX_64 = `${'a'.repeat(63)}b`

function catalogWith(
  entries: Record<string, { kind: AssetRecordV1['kind']; path: string; mediaType: string }>,
): AssetCatalogV1 {
  return {
    version: 1,
    assets: Object.fromEntries(
      Object.entries(entries).map(([id, record]) => [
        id,
        {
          ...record,
          bytes: 1,
          sha256: HEX_64,
          origin: { kind: 'legacy-migrated', ref: record.path },
        },
      ]),
    ),
  }
}

describe('palSoundAssetForSources：显式 catalog 的音效身份与缺失反馈', () => {
  test('catalog 内 kind=sound 的源号映射到同一 AssetId；缺失/非 sound/非法号一律 undefined', () => {
    const catalog = catalogWith({
      'sound.pal.001': {
        kind: 'sound',
        path: 'assets/migrated/sounds/001.wav',
        mediaType: 'audio/wav',
      },
      'sound.pal.045': {
        kind: 'sound',
        path: 'assets/migrated/sounds/045.wav',
        mediaType: 'audio/wav',
      },
      'sound.pal.003': {
        kind: 'video',
        path: 'assets/migrated/videos/003.mp4',
        mediaType: 'video/mp4',
      },
    })
    const input = structuredClone(catalog)
    const resolve = palSoundAssetForSources({ assetCatalog: catalog })
    expect(resolve(1)).toBe('sound.pal.001')
    expect(resolve(45)).toBe('sound.pal.045')
    expect(resolve(2)).toBeUndefined()
    expect(resolve(3)).toBeUndefined()
    expect(resolve(0)).toBeUndefined()
    expect(resolve(-3)).toBeUndefined()
    expect(resolve(1.5)).toBeUndefined()
    expect(catalog).toEqual(input)
  })

  test('同一 resolver 重复调用输出稳定（幂等身份解析）', () => {
    const resolve = palSoundAssetForSources({ assetCatalog: catalogWith({}) })
    expect(resolve(7)).toBeUndefined()
    expect(resolve(7)).toBeUndefined()
  })
})
