import { describe, expect, test } from 'vitest'
import { tilesetCatalogRecord } from './__tests__/cursor-pure-wave2-fixtures.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import { validateAssetCatalog } from './asset.js'
import { resolveTilesetAsset, validateTilesets } from './tileset.js'

describe('validateTilesets', () => {
  test('合法条目原样返回', () => {
    const raw = [
      { id: 'grass', name: '草地', category: 'outdoor', asset: 'tileset.grass' },
      { id: 'pal-20', name: '原版·仙灵岛', category: 'builtin', asset: 'tileset.pal.020' },
    ]
    const before = deepSnapshot(raw)
    const validated = validateTilesets(raw)
    expect(validated).toEqual([
      { id: 'grass', name: '草地', category: 'outdoor', asset: 'tileset.grass' },
      { id: 'pal-20', name: '原版·仙灵岛', category: 'builtin', asset: 'tileset.pal.020' },
    ])
    expect(raw).toEqual(before)
  })
  test('重复 id / id 含斜杠 / 空字段 / 退役 tiles 字段 → 各自报错', () => {
    const base = { name: 'n', category: 'c', asset: 'tileset.test' }
    expect(() =>
      validateTilesets([
        { id: 'a', ...base },
        { id: 'a', ...base },
      ]),
    ).toThrow('重复 id')
    expect(() => validateTilesets([{ id: 'a/b', ...base }])).toThrow("不得含 '/'")
    expect(() =>
      validateTilesets([{ id: 'a', name: '', category: 'c', asset: 'tileset.test' }]),
    ).toThrow('name')
    expect(() => validateTilesets([{ id: 'a', ...base, tiles: [{}] }])).toThrow('已退役')
    expect(() => validateTilesets({})).toThrow('期望数组')
    expect(() => validateTilesets([{ id: 'a', name: 'n', category: 'c' }])).toThrow(
      'tilesets[0].asset: 期望非空 AssetId',
    )
    expect(() => validateTilesets([{ id: 'a', ...base, path: 'assets/tilesets/a.rle' }])).toThrow(
      '已退役',
    )
  })

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
    const catalogSnap = deepSnapshot(catalog)
    const tilesetSnap = deepSnapshot(tilesets)
    expect(validateTilesets(tilesets, catalog)).toEqual(tilesets)
    expect(tilesets).toEqual(tilesetSnap)
    expect(catalog).toEqual(catalogSnap)
    expect(resolveTilesetAsset('grass', tilesets)).toBe('tileset.grass')
  })

  test('catalog 缺 AssetId 与 kind 不符各自精确拒绝，输入不变', () => {
    const spriteOnly = validateAssetCatalog({
      version: 1,
      assets: {
        'sprite.x': {
          kind: 'sprite',
          path: 'assets/generated/sprite.x.png',
          mediaType: 'image/png',
          bytes: 3,
          sha256: 'c'.repeat(64),
          origin: { kind: 'generated' },
        },
      },
    })
    const missing = [{ id: 'grass', name: '草地', category: 'outdoor', asset: 'tileset.ghost' }]
    const mismatch = [{ id: 'grass', name: '草地', category: 'outdoor', asset: 'sprite.x' }]
    const missingSnap = deepSnapshot(missing)
    const mismatchSnap = deepSnapshot(mismatch)
    expect(() => validateTilesets(missing, spriteOnly)).toThrow(
      'tilesets[0].asset: AssetId "tileset.ghost" 不在 catalog',
    )
    expect(() => validateTilesets(mismatch, spriteOnly)).toThrow(
      'tilesets[0].asset: AssetId "sprite.x" 期望 tileset，实际 sprite',
    )
    expect(missing).toEqual(missingSnap)
    expect(mismatch).toEqual(mismatchSnap)
  })
})

describe('resolveTilesetAsset', () => {
  const tilesets = [{ id: 'grass', name: '草', category: 'outdoor', asset: 'tileset.grass' }]
  test('注册表 id → AssetId；路径直通与未知 id 均报错', () => {
    expect(resolveTilesetAsset('grass', tilesets)).toBe('tileset.grass')
    expect(() => resolveTilesetAsset('tileset/20.rle', tilesets)).toThrow('不在注册表')
    expect(() => resolveTilesetAsset('nope', tilesets)).toThrow('tileset "nope" 不在注册表')
  })
})
