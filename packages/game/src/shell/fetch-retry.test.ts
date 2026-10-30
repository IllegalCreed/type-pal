import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFetchRetry, uninstallFetchRetryForTest } from './fetch-retry.js'

const realFetch = globalThis.fetch

beforeEach(() => {
  uninstallFetchRetryForTest(realFetch)
})

afterEach(() => {
  try {
    uninstallFetchRetryForTest(realFetch)
  } finally {
    globalThis.fetch = realFetch
    vi.restoreAllMocks()
    vi.useRealTimers()
  }
})

describe('fetch-retry(GET 网络层重试兜底)', () => {
  it('GET 网络错误(reject)→ 重试后成功(nginx GOAWAY 竞态 net::ERR_FAILED 场景)', async () => {
    const mock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('ok'))
    globalThis.fetch = mock
    installFetchRetry({ backoffMs: [0, 0] })

    const res = await fetch('/extracted/images/world/tileset/map-12/tile-0277.png')
    expect(res.status).toBe(200)
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it('503 → 重试后返回恢复的 Response', async () => {
    const recovered = new Response('ok')
    const mock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(recovered)
    globalThis.fetch = mock
    installFetchRetry({ backoffMs: [0, 0] })
    await expect(fetch('/a')).resolves.toBe(recovered)
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it('404 → 原样返回同一 Response，不重试', async () => {
    const missing = new Response('nope', { status: 404 })
    const mock = vi.fn<typeof fetch>().mockResolvedValue(missing)
    globalThis.fetch = mock
    installFetchRetry({ backoffMs: [0, 0] })
    await expect(fetch('/b')).resolves.toBe(missing)
    expect(mock).toHaveBeenCalledExactlyOnceWith('/b', undefined)
  })

  it('非 GET(POST)不重试(非幂等)', async () => {
    const error = new TypeError('Failed to fetch')
    const mock = vi.fn<typeof fetch>().mockRejectedValue(error)
    globalThis.fetch = mock
    installFetchRetry({ backoffMs: [0, 0] })

    await expect(fetch('/api', { method: 'POST' })).rejects.toBe(error)
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('重复 install 幂等(不双层包)', async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(new Response('ok'))
    globalThis.fetch = mock
    installFetchRetry({ backoffMs: [0, 0] })
    const wrapped = globalThis.fetch
    installFetchRetry({ backoffMs: [0, 0] })
    expect(globalThis.fetch).toBe(wrapped)
  })

  it('AbortError 立即向 caller 传播，不重复请求或等待 backoff', async () => {
    const abort = new DOMException('aborted', 'AbortError')
    const mock = vi.fn<typeof fetch>().mockRejectedValue(abort)
    globalThis.fetch = mock
    installFetchRetry({ retries: 2, backoffMs: [50, 50] })

    await expect(fetch('/cancelled', { signal: new AbortController().signal })).rejects.toBe(abort)
    expect(mock).toHaveBeenCalledTimes(1)
  })
})
