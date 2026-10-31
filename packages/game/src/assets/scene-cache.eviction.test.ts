import { describe, expect, it, vi } from 'vitest'
import { legalSceneAssets } from '../__tests__/asset-fixtures.js'
import {
  countingSceneFetcher as countingFetcher,
  makeLruSceneFetcher as makeFetcher,
} from '../__tests__/scene-cache-fixtures.js'
import { type SceneAssets, SceneAssetsCache } from './loader.js'

describe('LRU order and default capacity', () => {
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

  it('省略容量时保留全部已加载场景', async () => {
    const fetcher = makeFetcher()
    const cache = new SceneAssetsCache(fetcher)
    const originals: SceneAssets[] = []
    for (let i = 0; i < 50; i++) originals.push(await cache.loadScene(i))
    for (let i = 0; i < 50; i++) expect(await cache.loadScene(i)).toBe(originals[i])
    expect(fetcher.mock.calls).toEqual(Array.from({ length: 50 }, (_, id) => [id]))
  })
})

describe('protected and boundary capacity', () => {
  it('protect 返回缓存中不存在的 id 时，仍淘汰最旧条目', async () => {
    const evicted: number[] = []
    const fetcher = vi.fn(async (sceneId: number) => legalSceneAssets(sceneId))
    const cache = new SceneAssetsCache(fetcher, {
      maxEntries: 2,
      protect: () => 99,
      onEvict: (sceneId) => evicted.push(sceneId),
    })
    await cache.loadScene(1)
    await cache.loadScene(2)
    await cache.loadScene(3)
    expect(evicted).toEqual([1])
    await cache.loadScene(1)
    expect(fetcher).toHaveBeenCalledTimes(4)
    await cache.loadScene(3)
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('maxEntries 为 1 且保护旧条目时，新 fetch 的结果被淘汰但调用方仍拿到它', async () => {
    const evicted: number[] = []
    const fetcher = vi.fn(async (sceneId: number) => legalSceneAssets(sceneId, sceneId + 10))
    const cache = new SceneAssetsCache(fetcher, {
      maxEntries: 1,
      protect: () => 1,
      onEvict: (sceneId) => evicted.push(sceneId),
    })
    await cache.loadScene(1)
    const fresh = await cache.loadScene(2)
    expect(fresh.sceneId).toBe(2)
    expect(fresh.mapNum).toBe(12)
    expect(evicted).toEqual([2])
    await cache.loadScene(1)
    expect(fetcher).toHaveBeenCalledTimes(2)
    await cache.loadScene(2)
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('protect 返回 undefined 时 scene 0 可以被淘汰', async () => {
    const evicted: number[] = []
    const fetcher = vi.fn(async (sceneId: number) => legalSceneAssets(sceneId))
    const cache = new SceneAssetsCache(fetcher, {
      maxEntries: 1,
      protect: () => undefined,
      onEvict: (sceneId) => evicted.push(sceneId),
    })
    await cache.loadScene(0)
    await cache.loadScene(5)
    expect(evicted).toEqual([0])
    await cache.loadScene(0)
    expect(evicted).toEqual([0, 5])
    expect(fetcher).toHaveBeenCalledTimes(3)
    await cache.loadScene(0)
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('条目数刚好等于 maxEntries 时不调用 onEvict', async () => {
    const evicted: number[] = []
    const fetcher = vi.fn(async (sceneId: number) => legalSceneAssets(sceneId))
    const cache = new SceneAssetsCache(fetcher, {
      maxEntries: 2,
      onEvict: (sceneId) => evicted.push(sceneId),
    })
    await cache.loadScene(1)
    await cache.loadScene(2)
    expect(evicted).toEqual([])
    expect(fetcher).toHaveBeenCalledTimes(2)
    await cache.loadScene(1)
    await cache.loadScene(2)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})

describe('moving protection and zero capacity', () => {
  it('protect 切换后原先受保护的场景成为下一次淘汰对象', async () => {
    const { fetcher, count } = countingFetcher()
    const evicted: number[] = []
    let protectedId = 1
    const cache = new SceneAssetsCache(fetcher, {
      maxEntries: 2,
      onEvict: (sceneId) => evicted.push(sceneId),
      protect: () => protectedId,
    })

    await cache.loadScene(1)
    await cache.loadScene(2)
    await cache.loadScene(3)
    expect(evicted).toEqual([2])

    protectedId = 3
    await cache.loadScene(4)
    expect(evicted).toEqual([2, 1])
    expect(count(1)).toBe(1)
    expect(count(3)).toBe(1)
    expect(count(4)).toBe(1)
    await cache.loadScene(3)
    await cache.loadScene(4)
    expect(count(3)).toBe(1)
    expect(count(4)).toBe(1)
    await cache.loadScene(1)
    expect(count(1)).toBe(2)
  })

  it('maxEntries 为 0 时仍淘汰未受保护场景', async () => {
    const { fetcher, count } = countingFetcher()
    const evicted: number[] = []
    const cache = new SceneAssetsCache(fetcher, {
      maxEntries: 0,
      onEvict: (sceneId) => evicted.push(sceneId),
      protect: () => 1,
    })

    const first = await cache.loadScene(1)
    expect(evicted).toEqual([])
    const second = await cache.loadScene(2)
    expect(evicted).toEqual([2])
    expect(second.sceneId).toBe(2)
    const again = await cache.loadScene(1)
    expect(again).toBe(first)
    expect(count(1)).toBe(1)
    await cache.loadScene(2)
    expect(count(2)).toBe(2)
    expect(evicted).toEqual([2, 2])
  })
})
