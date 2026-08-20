import type { AssetCatalogV1, AssetKind } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { PAL_ASSET_ROLES } from './pal-assets.js'
import { buildPalCurrentManifest } from './pal-manifest.js'

function kindOf(id: string): AssetKind {
  if (id === 'color.project-standard') return 'color-table'
  if (id.startsWith('video.')) return 'video'
  if (id.startsWith('music.')) return 'music'
  if (id.startsWith('soundfont.')) return 'soundfont'
  return 'sound'
}

function catalog(): AssetCatalogV1 {
  return {
    version: 1,
    assets: Object.fromEntries(
      Object.values(PAL_ASSET_ROLES).map((id) => [
        id,
        {
          kind: kindOf(id),
          path: `assets/${id}`,
          mediaType: 'application/octet-stream',
          bytes: 1,
          sha256: 'a'.repeat(64),
          origin: { kind: 'generated' },
        },
      ]),
    ),
  }
}

describe('PAL current manifest', () => {
  test('只生成 content16/SAVE8，且没有迁移描述或 legacy 资源通道', () => {
    const manifest = buildPalCurrentManifest(catalog())
    expect(manifest.contentVersion).toBe(16)
    expect(manifest.minimumSaveVersion).toBe(8)
    expect(manifest.assets).toEqual({ catalog: 'assets/index.json', roles: PAL_ASSET_ROLES })
    expect(manifest).not.toHaveProperty('migrations')
    expect(manifest.assets).not.toHaveProperty('legacy')
    expect(manifest.content).not.toHaveProperty('scripts')
  })

  test('资源角色必须全部存在于 catalog', () => {
    expect(() => buildPalCurrentManifest({ version: 1, assets: {} })).toThrow('不存在')
  })
})
