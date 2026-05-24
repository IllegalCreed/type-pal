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
      tilemap: { width: 64, height: 128, cells: [] } as any,
      palette: { colors: [] as Array<[number, number, number]> } as any,
      eventObjects: [],
      npcSprites: new Map(),
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
      tilemap: { width: 30, height: 40, cells: [] } as any,
      palette: { colors: [] } as any,
      eventObjects: [],
      npcSprites: new Map(),
    }
    const cache = new SceneAssetsCache(async () => fakeAssets)
    const result = await cache.loadScene(5)
    expect(result.sceneId).toBe(5)
    expect(result.tilemap.width).toBe(30)
  })
})
