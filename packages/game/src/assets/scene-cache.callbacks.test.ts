import { describe, expect, it } from 'vitest'
import { countingSceneFetcher as countingFetcher } from '../__tests__/scene-cache-fixtures.js'
import { SceneAssetsCache } from './loader.js'

describe('eviction callback reentrancy and errors', () => {
  it('onEvict 同步重入 loadScene 把仍在缓存的场景刷成最近', async () => {
    const { fetcher, count } = countingFetcher()
    const evicted: number[] = []
    const cache = new SceneAssetsCache(fetcher, {
      maxEntries: 2,
      onEvict: (sceneId) => {
        evicted.push(sceneId)
        if (sceneId === 1) void cache.loadScene(2)
      },
    })

    await cache.loadScene(1)
    await cache.loadScene(2)
    await cache.loadScene(3)
    await cache.loadScene(4)
    expect(evicted).toEqual([1, 3])
    expect(count(2)).toBe(1)
    await cache.loadScene(2)
    expect(count(2)).toBe(1)
    await cache.loadScene(3)
    expect(count(3)).toBe(2)
  })

  it('onEvict 抛错时受害者已删除，兄弟缓存与另一实例不受影响', async () => {
    const primary = countingFetcher()
    const evicted: number[] = []
    const evictError = new Error('evict broke')
    const cache = new SceneAssetsCache(primary.fetcher, {
      maxEntries: 2,
      onEvict: (sceneId) => {
        evicted.push(sceneId)
        if (sceneId === 1) throw evictError
      },
    })
    const other = countingFetcher()
    const otherCache = new SceneAssetsCache(other.fetcher, { maxEntries: 2 })

    await cache.loadScene(1)
    await cache.loadScene(2)
    const otherFirst = await otherCache.loadScene(8)
    await expect(cache.loadScene(3)).rejects.toBe(evictError)
    expect(evicted).toEqual([1])
    expect(primary.count(3)).toBe(1)
    await cache.loadScene(3)
    expect(primary.count(3)).toBe(1)
    await cache.loadScene(2)
    expect(primary.count(2)).toBe(1)
    await cache.loadScene(1)
    expect(primary.count(1)).toBe(2)
    expect(await otherCache.loadScene(8)).toBe(otherFirst)
    expect(other.count(8)).toBe(1)
  })

  it('onEvict 重入重新获取受害者后继续淘汰下一个最旧场景', async () => {
    const { fetcher, count } = countingFetcher()
    const evicted: number[] = []
    const cache = new SceneAssetsCache(fetcher, {
      maxEntries: 2,
      onEvict: (sceneId) => {
        evicted.push(sceneId)
        if (sceneId === 1) void cache.loadScene(1)
      },
    })

    await cache.loadScene(1)
    await cache.loadScene(2)
    await cache.loadScene(3)
    await Promise.resolve()
    expect(evicted).toEqual([1, 2])
    expect(count(1)).toBe(2)
    expect(count(2)).toBe(1)
    expect(count(3)).toBe(1)
    await cache.loadScene(3)
    await cache.loadScene(1)
    expect(count(3)).toBe(1)
    expect(count(1)).toBe(2)
    await cache.loadScene(2)
    expect(count(2)).toBe(2)
  })
})
