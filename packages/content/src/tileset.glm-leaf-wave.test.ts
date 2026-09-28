import { describe, expect, test } from 'vitest'
import { resolveTilesetAsset, validateTilesets } from './tileset.js'

const tilesets = validateTilesets([
  { id: 'tiles-a', name: 'A 组', category: '基础', asset: 'tileset.tiles-a' },
])

describe('tileset 剩余合同', () => {
  test('validate keeps a well-formed tileset and resolve maps id to its asset', () => {
    expect(tilesets).toHaveLength(1)
    expect(resolveTilesetAsset('tiles-a', tilesets)).toBe('tileset.tiles-a')
  })

  test('resolve throws a readable error when the tileset id is absent', () => {
    expect(() => resolveTilesetAsset('tiles-gone', tilesets)).toThrow('tiles-gone')
  })
})
