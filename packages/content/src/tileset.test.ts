import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { resolveTilesetAsset, validateTilesets } from './tileset.js'

describe('validateTilesets(W7B)', () => {
  test('合法条目原样返回', () => {
    const raw = [
      { id: 'grass', name: '草地', category: 'outdoor', asset: 'tileset.grass' },
      { id: 'pal-20', name: '原版·仙灵岛', category: 'builtin', asset: 'tileset.pal.020' },
    ]
    const before = deepSnapshot(raw)
    const v = validateTilesets(raw)
    expect(v).toEqual([
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
})

describe('resolveTilesetAsset', () => {
  const reg = [{ id: 'grass', name: '草', category: 'outdoor', asset: 'tileset.grass' }]
  test('注册表 id → AssetId；路径直通与未知 id 均报错', () => {
    expect(resolveTilesetAsset('grass', reg)).toBe('tileset.grass')
    expect(() => resolveTilesetAsset('tileset/20.rle', reg)).toThrow('不在注册表')
    expect(() => resolveTilesetAsset('nope', reg)).toThrow('tileset "nope" 不在注册表')
  })
})
