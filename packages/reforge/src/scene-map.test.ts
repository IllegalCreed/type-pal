import type { Tilemap } from '@type-pal/shared'
import type { OwnMap } from '@type-pal/content'
import { beforeEach, describe, expect, test, vi } from 'vitest'

// 只测分流逻辑,mock 掉 assets 层的真实 IO(gzip/parseSpriteChunk 在别处/浏览器覆盖)。
vi.mock('./assets.js', () => ({
  loadTilemap: vi.fn(),
  loadOwnMap: vi.fn(),
  loadTilesetByPath: vi.fn(),
}))

import { loadOwnMap, loadTilemap, loadTilesetByPath } from './assets.js'
import { loadSceneMap } from './scene-map.js'

// biome-ignore lint/suspicious/noExplicitAny: 测试桩,只喂 loadSceneMap 需要的字段
const base = { root: '/proj/data', maps: 'tilemap', tilesets: 'tileset' } as any
const fakeMap: Tilemap = { width: 2, height: 2, cells: [], tileset: 'tileset/56.rle' }
const fakeOwnMap: OwnMap = {
  version: 1,
  width: 2,
  height: 2,
  tileset: 'tileset/56.rle',
  layers: [{ id: 'floor', name: '地板', occlude: false, tiles: [[], [], [], []] }],
  collision: [[], [], [], []],
}
const fakeTiles = new Map()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(loadTilesetByPath).mockResolvedValue(fakeTiles)
})

describe('loadSceneMap 分流(W7a-4)', () => {
  test('复用原版:按原版号取图,tileset 一律自 map.tileset 字段解析', async () => {
    vi.mocked(loadTilemap).mockResolvedValue(fakeMap)
    const r = await loadSceneMap(base, { reuseOriginalMap: 56 })
    expect(loadTilemap).toHaveBeenCalledWith(base, 56)
    expect(loadOwnMap).not.toHaveBeenCalled()
    expect(loadTilesetByPath).toHaveBeenCalledWith(base, 'tileset/56.rle') // 不从 mapNum 反推
    expect(r).toEqual({ map: fakeMap, tiles: fakeTiles })
  })

  test('自有地图:按工程内 content 路径取图,tileset 同样自 map.tileset', async () => {
    vi.mocked(loadOwnMap).mockResolvedValue(fakeOwnMap)
    const r = await loadSceneMap(base, { ownMap: 'content/maps/foo.json' })
    expect(loadOwnMap).toHaveBeenCalledWith(base, 'content/maps/foo.json')
    expect(loadTilemap).not.toHaveBeenCalled()
    expect(loadTilesetByPath).toHaveBeenCalledWith(base, 'tileset/56.rle')
    expect(r).toEqual({ map: fakeOwnMap, tiles: fakeTiles })
  })
})
