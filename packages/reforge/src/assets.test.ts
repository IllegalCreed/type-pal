import { describe, expect, test, vi } from 'vitest'
import type { AssetBase } from './assets.js'
import { loadOwnMap, loadPalette, loadTilemap } from './assets.js'
import type { FileSource } from './file-source.js'

const base = (source?: FileSource): AssetBase => ({
  root: '/extracted/data',
  maps: 'tilemap',
  tilesets: 'tileset',
  sprites: 'sprite',
  palettes: 'palette',
  sounds: '',
  music: '',
  portraits: '',
  faces: '',
  itemIcons: '',
  ...(source ? { source } : {}),
})

function memSource(json: unknown): FileSource {
  return {
    readText: async () => JSON.stringify(json),
    readJson: async <T>() => json as T,
    readBytes: async () => new ArrayBuffer(0),
    urlFor: async (rel: string) => rel,
  }
}

describe('assets.ts 经 FileSource 读', () => {
  test('有 base.source → loadTilemap/loadPalette 走 source(不碰 fetch)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const src = memSource({ width: 2, height: 2, tiles: [] })
    expect(await loadTilemap(base(src), 7)).toEqual({ width: 2, height: 2, tiles: [] })
    expect(await loadPalette(base(src), 0)).toEqual({ width: 2, height: 2, tiles: [] })
    expect(fetchMock).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  test('缺 base.source → 走裸 fetch(向后兼容,零行为变化)', async () => {
    const fetchMock = vi.fn(
      async (url: string) => new Response(JSON.stringify({ url }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const r = await loadTilemap(base(), 7)
    expect(r).toEqual({ url: '/extracted/data/tilemap/7.json' })
    expect(fetchMock).toHaveBeenCalledWith('/extracted/data/tilemap/7.json')
    vi.restoreAllMocks()
  })

  test('loadOwnMap 在加载边界校验 v1 schema', async () => {
    const ownMap = {
      version: 1,
      width: 1,
      height: 1,
      tileset: 'tileset/1.rle',
      layers: [{ id: 'floor', name: '地板', occlude: false, tiles: [[null], [null]] }],
      collision: [[0], [0]],
    }
    expect(await loadOwnMap(base(memSource(ownMap)), 'content/maps/a.json')).toEqual(ownMap)
    await expect(
      loadOwnMap(base(memSource({ ...ownMap, collision: [[0]] })), 'content/maps/a.json'),
    ).rejects.toThrow('期望 2 行')
  })
})
