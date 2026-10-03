/**
 * G01-D。SceneAssetsCache 的引用归属、失败不入缓存、并发与迟到写入。
 * 不重复 loader.test.ts 的「第二次 hit」「maxEntries 淘汰 1」「hit 刷新后淘汰 2」
 * 「protect 当前场景改淘汰 2」「无限缓存 50 次」。
 * 夹具使用完整 256 色调色板，不用旧测试的空 colors / as any。
 */
import { describe, expect, it, vi } from 'vitest'
import { legalSceneAssets } from '../__tests__/grok-render-r1/legal-host.js'
import { type SceneAssets, SceneAssetsCache } from './loader.js'

describe('G01-D SceneAssetsCache 归属与迟到', () => {
  it('G01-D01 命中返回 fetcher 交出的同一对象引用', async () => {
    const asset = legalSceneAssets(6, 20)
    const fetcher = vi.fn(async () => asset)
    const cache = new SceneAssetsCache(fetcher)
    expect(await cache.loadScene(6)).toBe(asset)
    expect(await cache.loadScene(6)).toBe(asset)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('G01-D02 fetcher 拒绝后该 id 不入缓存，下次重新 fetch 并成功', async () => {
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

  it('G01-D03 同一 id 的两次并发 load 各调一次 fetcher，缓存留下后写入的对象', async () => {
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

  it('G01-D04 protect 返回缓存中不存在的 id 时，仍淘汰最旧条目', async () => {
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

  it('G01-D05 maxEntries 为 1 且保护旧条目时，新 fetch 的结果被淘汰但调用方仍拿到它', async () => {
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

  it('G01-D06 protect 返回 undefined 时 scene 0 可以被淘汰', async () => {
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

  it('G01-D07 条目数刚好等于 maxEntries 时不调用 onEvict', async () => {
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

  it('G01-D08 被淘汰对象之后的字段改写不会污染重新 fetch 的结果', async () => {
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

  it('G01-D09 连续两次超限淘汰的受害者顺序是 1 然后 2，3 与 4 仍命中', async () => {
    const evicted: number[] = []
    const fetcher = vi.fn(async (sceneId: number) => legalSceneAssets(sceneId))
    const cache = new SceneAssetsCache(fetcher, {
      maxEntries: 2,
      onEvict: (sceneId) => evicted.push(sceneId),
    })
    await cache.loadScene(1)
    await cache.loadScene(2)
    await cache.loadScene(3)
    await cache.loadScene(4)
    expect(evicted).toEqual([1, 2])
    await cache.loadScene(3)
    await cache.loadScene(4)
    expect(fetcher).toHaveBeenCalledTimes(4)
    await cache.loadScene(2)
    expect(fetcher).toHaveBeenCalledTimes(5)
  })

  it('G01-D10 maxEntries 为 1 时后完成的 id 1 留下，先完成的 id 2 下次要重取', async () => {
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
