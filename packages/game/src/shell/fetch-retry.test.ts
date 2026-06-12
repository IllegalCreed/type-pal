import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { installFetchRetry, uninstallFetchRetryForTest } from './fetch-retry.js'

const realFetch = globalThis.fetch

beforeEach(() => {
  uninstallFetchRetryForTest(realFetch)
})

afterEach(() => {
  uninstallFetchRetryForTest(realFetch)
})

describe('fetch-retry(GET 网络层重试兜底)', () => {
  it('GET 网络错误(reject)→ 重试后成功(nginx GOAWAY 竞态 net::ERR_FAILED 场景)', async () => {
    const mock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('ok'))
    globalThis.fetch = mock as unknown as typeof fetch
    installFetchRetry({ backoffMs: [0, 0] })

    const res = await fetch('/extracted/images/world/tileset/map-12/tile-0277.png')
    expect(res.status).toBe(200)
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it('重试耗尽(默认 2 次重试 = 共 3 attempt)→ 抛最后一次错误', async () => {
    const mock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    globalThis.fetch = mock as unknown as typeof fetch
    installFetchRetry({ backoffMs: [0, 0] })

    await expect(fetch('/x.png')).rejects.toThrow('Failed to fetch')
    expect(mock).toHaveBeenCalledTimes(3)
  })

  it('503 → 重试;404 → 原样返回不重试(资源性错误)', async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok'))
    globalThis.fetch = mock as unknown as typeof fetch
    installFetchRetry({ backoffMs: [0, 0] })
    expect((await fetch('/a')).status).toBe(200)
    expect(mock).toHaveBeenCalledTimes(2)

    mock.mockClear()
    mock.mockResolvedValue(new Response('nope', { status: 404 }))
    expect((await fetch('/b')).status).toBe(404)
    expect(mock).toHaveBeenCalledTimes(1) // 不重试
  })

  it('非 GET(POST)不重试(非幂等)', async () => {
    const mock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    globalThis.fetch = mock as unknown as typeof fetch
    installFetchRetry({ backoffMs: [0, 0] })

    await expect(fetch('/api', { method: 'POST' })).rejects.toThrow()
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('重复 install 幂等(不双层包)', async () => {
    const mock = vi.fn().mockResolvedValue(new Response('ok'))
    globalThis.fetch = mock as unknown as typeof fetch
    installFetchRetry({ backoffMs: [0, 0] })
    const wrapped = globalThis.fetch
    installFetchRetry({ backoffMs: [0, 0] })
    expect(globalThis.fetch).toBe(wrapped)
  })
})
