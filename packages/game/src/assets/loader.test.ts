import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAll, SceneAssetsCache, type SceneAssets } from './loader.js'

describe('loadAll', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetch 失败 → 抛错', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, url: '/extracted/data/scene-1.json' }),
    )
    // Promise.all 并发 fetch 四个 JSON,第一个失败的就 reject(顺序由 Promise 内部决定)
    // 这里只验证 “404 → 抛带 URL/状态码上下文的错”
    await expect(loadAll(1)).rejects.toThrow(/failed \(404\)/)
  })
})

describe('SceneAssetsCache(M3.5)', () => {
  it('第一次 loadScene 调 fetcher,第二次 cache hit 不调', async () => {
    const fetcher = vi.fn(async (sceneId: number): Promise<SceneAssets> => ({
      sceneId,
      mapNum: 0,
      tilemap: { width: 64, height: 128, cells: [] } as any,
      palette: { colors: [] as Array<[number, number, number]> } as any,
      eventObjects: [],
      npcSprites: new Map(),
      eventCommands: [],
      labelMap: {},
    }))
    const cache = new SceneAssetsCache(fetcher)

    await cache.loadScene(1)
    expect(fetcher).toHaveBeenCalledTimes(1)

    await cache.loadScene(1)
    expect(fetcher).toHaveBeenCalledTimes(1) // cache hit

    await cache.loadScene(3)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('SceneAssets 字段透传', async () => {
    const fakeAssets: SceneAssets = {
      sceneId: 5,
      mapNum: 0,
      tilemap: { width: 30, height: 40, cells: [] } as any,
      palette: { colors: [] } as any,
      eventObjects: [],
      npcSprites: new Map(),
      eventCommands: [],
      labelMap: {},
    }
    const cache = new SceneAssetsCache(async () => fakeAssets)
    const result = await cache.loadScene(5)
    expect(result.sceneId).toBe(5)
    expect(result.tilemap.width).toBe(30)
  })
})

describe('SceneAssetsCache LRU 淘汰(内存泄露修复:全场景常驻 → 有界)', () => {
  const makeFetcher = () =>
    vi.fn(
      async (sceneId: number): Promise<SceneAssets> => ({
        sceneId,
        mapNum: 0,
        tilemap: { width: 1, height: 1, cells: [] } as any,
        palette: { colors: [] } as any,
        eventObjects: [],
        npcSprites: new Map(),
        eventCommands: [],
        labelMap: {},
      }),
    )

  it('超过 maxEntries → 淘汰最旧条目(重访需重 fetch)+ 触发 onEvict', async () => {
    const fetcher = makeFetcher()
    const evicted: number[] = []
    const cache = new SceneAssetsCache(fetcher, { maxEntries: 2, onEvict: (id) => evicted.push(id) })
    await cache.loadScene(1)
    await cache.loadScene(2)
    await cache.loadScene(3) // 超 cap=2 → 淘汰最旧(1)
    expect(evicted).toEqual([1])
    expect(fetcher).toHaveBeenCalledTimes(3)
    await cache.loadScene(1) // 1 已淘汰 → 重 fetch
    expect(fetcher).toHaveBeenCalledTimes(4)
    await cache.loadScene(3) // 3 仍在(最近)→ hit,不增
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('cache hit 刷新 recency:最近命中的不被淘汰', async () => {
    const fetcher = makeFetcher()
    const cache = new SceneAssetsCache(fetcher, { maxEntries: 2 })
    await cache.loadScene(1)
    await cache.loadScene(2)
    await cache.loadScene(1) // hit,1 刷成最近
    await cache.loadScene(3) // 超 cap → 淘汰 2(最旧),非 1
    await cache.loadScene(1) // 1 仍在 → hit
    expect(fetcher).toHaveBeenCalledTimes(3) // 1,2,3 各一次;1 的两次命中不增
    await cache.loadScene(2) // 2 被淘汰 → 重 fetch
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
    await cache.loadScene(1) // current=1(最旧)
    await cache.loadScene(2)
    await cache.loadScene(3) // 超 cap → 本应淘汰最旧 1,但 1 受 protect → 改淘汰 2
    expect(evicted).toEqual([2])
    await cache.loadScene(1) // 1 受保护仍在 → hit
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('不传 opts → 无限缓存(向后兼容,永不淘汰)', async () => {
    const fetcher = makeFetcher()
    const cache = new SceneAssetsCache(fetcher)
    for (let i = 0; i < 50; i++) await cache.loadScene(i)
    for (let i = 0; i < 50; i++) await cache.loadScene(i)
    expect(fetcher).toHaveBeenCalledTimes(50) // 全 hit,无淘汰
  })
})
