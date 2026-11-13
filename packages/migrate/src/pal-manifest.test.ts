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
          path: `assets/generated/${id}`,
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
  test('只生成 canonical content23/SAVE12，且没有旧顶层启动字段或 legacy 通道', () => {
    const manifest = buildPalCurrentManifest(catalog())
    expect(manifest.contentVersion).toBe(23)
    expect(manifest.minimumSaveVersion).toBe(12)
    expect(manifest.defaultEntryId).toBe('new-game')
    expect(manifest.entryPoints).toEqual([
      expect.objectContaining({
        id: 'new-game',
        scene: 's000',
        startWorld: expect.objectContaining({ party: ['li-xiaoyao'] }),
      }),
    ])
    expect(manifest).not.toHaveProperty('entryScene')
    expect(manifest).not.toHaveProperty('startWorld')
    expect(manifest.entryPoints[0]?.startWorld).not.toHaveProperty('learnedSkills')
    expect(manifest.assets).toEqual({ catalog: 'assets/index.json', roles: PAL_ASSET_ROLES })
    expect(manifest).not.toHaveProperty('migrations')
    expect(manifest.assets).not.toHaveProperty('legacy')
    expect(manifest.content).not.toHaveProperty('scripts')
  })

  test('必需资源角色必须全部存在于 catalog', () => {
    expect(() => buildPalCurrentManifest({ version: 1, assets: {} })).toThrow('不存在')
  })

  test('没有死亡曲资源时省略可选角色', () => {
    const source = catalog()
    delete source.assets['music.pal.001']
    expect(buildPalCurrentManifest(source).assets.roles).not.toHaveProperty(['audio.defeatMusic'])
  })

  test('死亡曲资产存在但类型错误时拒绝发布', () => {
    const source = catalog()
    const record = source.assets['music.pal.001']
    if (!record) throw new Error('死亡曲资源夹具缺失')
    record.kind = 'sound'
    expect(() => buildPalCurrentManifest(source)).toThrow(
      'PAL current manifest.assets.roles.audio.defeatMusic: 期望 music，实际 sound',
    )
  })
})
