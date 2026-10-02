/**
 * TEST-GROK-BOOT-RESOURCES-MEDIUM-1 G5/G6。
 * 不重复 loader.test.ts 的命中、最旧淘汰、recency、恒定 protect、无限缓存，
 * 也不重复原 400 的并发最后写、缺席 protect、cap 边界与引用相等十例。
 * 只通过 loadScene 的返回值、fetcher 调用次数和 onEvict 参数观察，不读私有 Map。
 */
import { describe, expect, it } from 'vitest'
import { legalSceneAssets } from '../__tests__/grok-boot-mid-1/legal.js'
import { type SceneAssets, SceneAssetsCache } from './loader.js'

function countingFetcher(rejectId?: number, message = 'scene down') {
  const calls: number[] = []
  const fetcher = async (sceneId: number): Promise<SceneAssets> => {
    calls.push(sceneId)
    if (sceneId === rejectId) throw new Error(message)
    return legalSceneAssets(sceneId)
  }
  const count = (sceneId: number) => calls.filter((id) => id === sceneId).length
  return { calls, fetcher, count }
}

describe('grok-mid-1 scene cache eviction', () => {
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

  it('fetcher 拒绝后兄弟场景仍命中且不触发 onEvict', async () => {
    const { fetcher, count } = countingFetcher(2, 'scene 2 down')
    const evicted: number[] = []
    const cache = new SceneAssetsCache(fetcher, {
      maxEntries: 2,
      onEvict: (sceneId) => evicted.push(sceneId),
    })

    const first = await cache.loadScene(1)
    await expect(cache.loadScene(2)).rejects.toThrow('scene 2 down')
    expect(evicted).toEqual([])
    expect(await cache.loadScene(1)).toBe(first)
    expect(count(1)).toBe(1)
    expect(count(2)).toBe(1)
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
