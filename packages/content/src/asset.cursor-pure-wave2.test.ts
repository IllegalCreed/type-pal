/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C4：tileset 注册表边。
 * sprite/scene/command walker 已由 asset.test 证明，从不传入 source.tilesets。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap, tilesetCatalogRecord } from './__tests__/cursor-pure-wave2-fixtures.js'
import { collectAssetReferences, validateAssetCatalog } from './asset.js'
import { validateTilesets } from './tileset.js'

describe('C4 asset 剩余合同', () => {
  test('collectAssetReferences 只收 tileset.asset，不把 id 当路径', () => {
    const catalog = validateAssetCatalog({
      version: 1,
      assets: {
        'tileset.grass': tilesetCatalogRecord('tileset.grass', 'authored'),
      },
    })
    const tilesets = validateTilesets(
      [{ id: 'grass', name: '草地', category: 'outdoor', asset: 'tileset.grass' }],
      catalog,
    )
    const source = { tilesets }
    const snap = inputSnap(source)
    expect(collectAssetReferences(source)).toEqual([
      {
        asset: 'tileset.grass',
        expectedKind: 'tileset',
        where: 'tilesets[0].asset',
        site: 'tileset:grass:asset',
        origin: { kind: 'tileset', id: 'grass' },
      },
    ])
    expect(source).toEqual(snap)
    expect(source.tilesets[0]?.id).toBe('grass')
  })
})
