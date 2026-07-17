import type { ProjectMapV2 } from '@type-pal/content'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { AssetBase } from './assets.js'

vi.mock('./assets.js', () => ({
  loadProjectMap: vi.fn(),
  loadTilesetByPath: vi.fn(),
}))

import { loadProjectMap, loadTilesetByPath } from './assets.js'
import { loadSceneMap } from './scene-map.js'

const base: AssetBase = {
  root: '/proj/data',
  tilesets: 'tileset',
  sprites: 'sprite',
  palettes: 'palette',
  portraits: 'portrait',
  faces: 'face',
  itemIcons: 'item-icon',
  io: {
    readText: async () => '',
    readJson: async <T>() => ({}) as T,
    readBytes: async () => new ArrayBuffer(0),
    urlFor: async (path) => path,
  },
}
const fakeMap: ProjectMapV2 = {
  version: 2,
  width: 2,
  height: 2,
  tilesetId: 'tileset-056',
  layers: [
    {
      id: 'floor',
      name: '地板',
      depthMode: 'height',
      tiles: [[], [], [], []],
      heights: [[], [], [], []],
    },
  ],
  collision: [[], [], [], []],
}
const mapIndex = {
  version: 1 as const,
  maps: [{ id: 'home', name: '民居', path: 'content/maps/home.json' }],
}
const tilesets = [{ id: 'tileset-056', name: '室内', category: 'indoor', path: 'tileset/56.rle' }]
const fakeTiles = new Map()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(loadProjectMap).mockResolvedValue(fakeMap)
  vi.mocked(loadTilesetByPath).mockResolvedValue(fakeTiles)
})

describe('loadSceneMap 唯一地图链', () => {
  test('稳定 mapId → map index path → ProjectMapV2.tilesetId → tileset registry', async () => {
    const result = await loadSceneMap(base, 'home', tilesets, mapIndex)
    expect(loadProjectMap).toHaveBeenCalledWith(base, 'content/maps/home.json')
    expect(loadTilesetByPath).toHaveBeenCalledWith(base, 'tileset/56.rle')
    expect(result).toEqual({ map: fakeMap, tiles: fakeTiles })
  })

  test('未知 mapId 和未知 tilesetId 都 fail-loud', async () => {
    await expect(loadSceneMap(base, 'missing', tilesets, mapIndex)).rejects.toThrow(
      'mapId "missing" 不在 map index',
    )
    vi.mocked(loadProjectMap).mockResolvedValue({ ...fakeMap, tilesetId: 'missing' })
    await expect(loadSceneMap(base, 'home', tilesets, mapIndex)).rejects.toThrow(
      'tileset "missing" 不在注册表',
    )
  })
})
