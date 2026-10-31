/** GET recovery and installer ownership; cancellation and backoff resources have separate specs. */
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

describe('Fetch GET recovery and method handling', () => {
  it('GET 网络错误(reject)→ 重试后成功', async () => {
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
  it('AbortError 立即向 caller 传播，不重复请求或等待 backoff', async () => {
    const abort = new DOMException('aborted', 'AbortError')
    const mock = vi.fn<typeof fetch>().mockRejectedValue(abort)
    globalThis.fetch = mock
    installFetchRetry({ retries: 2, backoffMs: [50, 50] })

    await expect(fetch('/cancelled', { signal: new AbortController().signal })).rejects.toBe(abort)
    expect(mock).toHaveBeenCalledTimes(1)
  })
  it('POST Request 不重试', async () => {
    vi.useFakeTimers()
    const gateway = new Response('gateway', { status: 503 })
    let calls = 0
    globalThis.fetch = async () => {
      calls += 1
      return gateway
    }
    installFetchRetry({ retries: 1, backoffMs: [1] })
    const pending = globalThis.fetch(new Request('https://x.test/post', { method: 'POST' }))
    await vi.runAllTimersAsync()
    const response = await pending
    expect(calls).toBe(1)
    expect(response.status).toBe(503)
  })
})

describe('Fetch retry installation ownership', () => {
  it('重复 install 幂等(不双层包)', async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(new Response('ok'))
    globalThis.fetch = mock
    installFetchRetry({ backoffMs: [0, 0] })
    const wrapped = globalThis.fetch
    installFetchRetry({ backoffMs: [0, 0] })
    expect(globalThis.fetch).toBe(wrapped)
  })
  it('安装后请求共 3 次；还原后同一错误直接抛（不再经过重试包装）', async () => {
    const error = new TypeError('fetch failed')
    const flaky = vi.fn<typeof fetch>().mockRejectedValue(error)
    globalThis.fetch = flaky
    installFetchRetry({ retries: 2, backoffMs: [0, 0] })
    await expect(fetch('https://localhost/x')).rejects.toBe(error)
    expect(flaky).toHaveBeenCalledTimes(3) // 1 + 2 重试
    uninstallFetchRetryForTest(flaky)
    expect(globalThis.fetch).toBe(flaky)
    flaky.mockClear()
    await expect(fetch('https://localhost/y')).rejects.toBe(error)
    expect(flaky).toHaveBeenCalledExactlyOnceWith('https://localhost/y')
  })
  it('还原后 install 可重新装载（installed 复位合同）', async () => {
    const error = new TypeError('fetch failed')
    const flaky = vi.fn<typeof fetch>().mockRejectedValue(error)
    globalThis.fetch = flaky
    installFetchRetry({ retries: 0, backoffMs: [] })
    const firstWrapper = globalThis.fetch
    await expect(fetch('https://localhost/before-reinstall')).rejects.toBe(error)
    expect(flaky).toHaveBeenCalledExactlyOnceWith('https://localhost/before-reinstall', undefined)
    flaky.mockClear()
    uninstallFetchRetryForTest(flaky)
    installFetchRetry({ retries: 1, backoffMs: [0] })
    expect(globalThis.fetch).not.toBe(firstWrapper)
    expect(globalThis.fetch).not.toBe(flaky)
    await expect(fetch('https://localhost/z')).rejects.toBe(error)
    expect(flaky).toHaveBeenCalledTimes(2)
  })
})
