import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAll } from './loader.js'

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
