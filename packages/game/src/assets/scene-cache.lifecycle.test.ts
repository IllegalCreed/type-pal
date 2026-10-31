import { describe, expect, it, vi } from 'vitest'
import { legalSceneAssets } from '../__tests__/asset-fixtures.js'
import { countingSceneFetcher as countingFetcher } from '../__tests__/scene-cache-fixtures.js'
import { type SceneAssets, SceneAssetsCache } from './loader.js'

describe('scene ownership and asynchronous admission', () => {
  it('命中返回 fetcher 交出的同一对象引用', async () => {
    const asset = legalSceneAssets(6, 20)
    const fetcher = vi.fn(async () => asset)
    const cache = new SceneAssetsCache(fetcher)
    expect(await cache.loadScene(6)).toBe(asset)
    expect(await cache.loadScene(6)).toBe(asset)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('fetcher 拒绝后该 id 不入缓存，下次重新 fetch 并成功', async () => {
    const fetcher = vi.fn(async (sceneId: number) => {
      if (fetcher.mock.calls.length === 1) throw new Error('net down')
      return legalSceneAssets(sceneId, 30)
    })
    const cache = new SceneAssetsCache(fetcher)
    await expect(cache.loadScene(3)).rejects.toThrow('net down')
    const loaded = await cache.loadScene(3)
    expect(loaded.sceneId).toBe(3)
    expect(loaded.mapNum).toBe(30)
    expect(loaded.palette.colors).toHaveLength(256)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('同一 id 的两次并发 load 各调一次 fetcher，缓存留下后写入的对象', async () => {
    const pending: Array<(asset: SceneAssets) => void> = []
    const fetcher = vi.fn(
      () =>
        new Promise<SceneAssets>((resolve) => {
          pending.push(resolve)
        }),
    )
    const cache = new SceneAssetsCache(fetcher)
    const first = cache.loadScene(4)
    const second = cache.loadScene(4)
    expect(fetcher).toHaveBeenCalledTimes(2)
    const early = legalSceneAssets(4, 1)
    const late = legalSceneAssets(4, 2)
    pending[0]?.(early)
    pending[1]?.(late)
    expect(await first).toBe(early)
    expect(await second).toBe(late)
    expect(await cache.loadScene(4)).toBe(late)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('被淘汰对象之后的字段改写不会污染重新 fetch 的结果', async () => {
    const fetcher = vi.fn(async (sceneId: number) => legalSceneAssets(sceneId, 40 + sceneId))
    const cache = new SceneAssetsCache(fetcher, { maxEntries: 2 })
    const first = await cache.loadScene(1)
    await cache.loadScene(2)
    await cache.loadScene(3)
    first.mapNum = 999
    const again = await cache.loadScene(1)
    expect(again).not.toBe(first)
    expect(again.mapNum).toBe(41)
    expect(again.palette.colors).toHaveLength(256)
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('maxEntries 为 1 时后完成的 id 1 留下，先完成的 id 2 下次要重取', async () => {
    const pending = new Map<number, (asset: SceneAssets) => void>()
    let scripted = true
    const fetcher = vi.fn((sceneId: number) => {
      if (!scripted) return Promise.resolve(legalSceneAssets(sceneId, sceneId === 2 ? 22 : 11))
      return new Promise<SceneAssets>((resolve) => {
        pending.set(sceneId, resolve)
      })
    })
    const cache = new SceneAssetsCache(fetcher, { maxEntries: 1 })
    const slow = cache.loadScene(1)
    const fast = cache.loadScene(2)
    const second = legalSceneAssets(2, 22)
    const first = legalSceneAssets(1, 11)
    pending.get(2)?.(second)
    expect(await fast).toBe(second)
    pending.get(1)?.(first)
    expect(await slow).toBe(first)
    expect(await cache.loadScene(1)).toBe(first)
    scripted = false
    const refetched = await cache.loadScene(2)
    expect(refetched).not.toBe(second)
    expect(refetched.mapNum).toBe(22)
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
})

describe('failed admission preserves other scenes', () => {
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
})
