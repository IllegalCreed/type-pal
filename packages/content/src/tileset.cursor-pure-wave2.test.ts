/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C4：validateTilesets 先过匹配 catalog。
 * 无 catalog 正控、错 kind 拒绝已由 tileset.test / map-index.contracts 证明。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap, tilesetCatalogRecord } from './__tests__/cursor-pure-wave2-fixtures.js'
import { validateAssetCatalog } from './asset.js'
import { resolveTilesetAsset, validateTilesets } from './tileset.js'

describe('C4 tileset 剩余合同', () => {
  test('匹配 tileset catalog 通过且输入不变，旁 sprite 记录不入解析', () => {
    const catalog = validateAssetCatalog({
      version: 1,
      assets: {
        'tileset.grass': tilesetCatalogRecord('tileset.grass'),
        'sprite.unused': {
          kind: 'sprite',
          path: 'assets/generated/sprite.unused.png',
          mediaType: 'image/png',
          bytes: 3,
          sha256: 'b'.repeat(64),
          origin: { kind: 'generated' },
        },
      },
    })
    const tilesets = [{ id: 'grass', name: '草地', category: 'outdoor', asset: 'tileset.grass' }]
    const catalogSnap = inputSnap(catalog)
    const tilesetSnap = inputSnap(tilesets)
    expect(validateTilesets(tilesets, catalog)).toEqual(tilesets)
    expect(tilesets).toEqual(tilesetSnap)
    expect(catalog).toEqual(catalogSnap)
    expect(resolveTilesetAsset('grass', tilesets)).toBe('tileset.grass')
    expect(catalog.assets['sprite.unused']?.kind).toBe('sprite')
  })
})
