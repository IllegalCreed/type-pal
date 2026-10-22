import { describe, expect, it, vi } from 'vitest'
import { legalPalette, legalTilemap } from '../__tests__/grok-render-r1/legal-host.js'
import { type SceneAssets, SceneAssetsCache } from './loader.js'

function makeFetcher() {
  return vi.fn(
    async (sceneId: number): Promise<SceneAssets> => ({
      sceneId,
      mapNum: sceneId + 10,
      tilemap: legalTilemap(`tileset/${sceneId + 10}.rle`),
      palette: legalPalette(),
      eventObjects: [],
      npcSprites: new Map(),
      eventCommands: [],
      labelMap: {},
    }),
  )
}

describe('SceneAssetsCache LRU', () => {
  it('超过 maxEntries → 淘汰最旧条目(重访需重 fetch)+ 触发 onEvict', async () => {
    const fetcher = makeFetcher()
    const evicted: number[] = []
    const cache = new SceneAssetsCache(fetcher, {
      maxEntries: 2,
      onEvict: (id) => evicted.push(id),
    })
    const first = await cache.loadScene(1)
    await cache.loadScene(2)
    const third = await cache.loadScene(3)
    expect(evicted).toEqual([1])
    expect(fetcher).toHaveBeenCalledTimes(3)
    const reloaded = await cache.loadScene(1)
    expect(reloaded).not.toBe(first)
    expect(reloaded.sceneId).toBe(1)
    expect(reloaded.mapNum).toBe(11)
    expect(evicted).toEqual([1, 2])
    expect(fetcher).toHaveBeenCalledTimes(4)
    expect(await cache.loadScene(3)).toBe(third)
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('cache hit 刷新 recency:最近命中的不被淘汰', async () => {
    const fetcher = makeFetcher()
    const cache = new SceneAssetsCache(fetcher, { maxEntries: 2 })
    const first = await cache.loadScene(1)
    const second = await cache.loadScene(2)
    expect(await cache.loadScene(1)).toBe(first)
    await cache.loadScene(3)
    expect(await cache.loadScene(1)).toBe(first)
    expect(fetcher).toHaveBeenCalledTimes(3)
    const reloaded = await cache.loadScene(2)
    expect(reloaded).not.toBe(second)
    expect(reloaded.sceneId).toBe(2)
    expect(reloaded.mapNum).toBe(12)
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('protect 返回的 sceneId 永不被淘汰(保护当前渲染场景,防黑屏)', async () => {
    const fetcher = makeFetcher()
    const evicted: number[] = []
    const current = 1
    const cache = new SceneAssetsCache(fetcher, {
      maxEntries: 2,
      onEvict: (id) => evicted.push(id),
      protect: () => current,
    })
    const first = await cache.loadScene(1)
    await cache.loadScene(2)
    const third = await cache.loadScene(3)
    expect(evicted).toEqual([2])
    expect(await cache.loadScene(1)).toBe(first)
    expect(await cache.loadScene(3)).toBe(third)
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('不传 opts → 无限缓存(向后兼容,永不淘汰)', async () => {
    const fetcher = makeFetcher()
    const cache = new SceneAssetsCache(fetcher)
    const originals: SceneAssets[] = []
    for (let i = 0; i < 50; i++) originals.push(await cache.loadScene(i))
    for (let i = 0; i < 50; i++) expect(await cache.loadScene(i)).toBe(originals[i])
    expect(fetcher.mock.calls).toEqual(Array.from({ length: 50 }, (_, id) => [id]))
  })
})
