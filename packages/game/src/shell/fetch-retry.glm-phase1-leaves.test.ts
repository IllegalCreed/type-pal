/**
 * TEST-GLM-PHASE1-LEAVES-3 L23（fetch-retry.ts）— 去重表：
 *  - fetch-retry.test + fetch-retry.boundaries.test（GET 重试/耗尽/503-502-504/404 不重试/
 *    POST 不重试/幂等安装/init.method 优先/backoff）→ 不重复
 *  - 新差异：uninstallFetchRetryForTest 还原原始 fetch（还原后网络错误直接抛、不重试）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installFetchRetry, uninstallFetchRetryForTest } from './fetch-retry.js'

const originalFetch = globalThis.fetch

afterEach(() => {
  try {
    uninstallFetchRetryForTest(originalFetch)
  } finally {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  }
})

describe('L23 uninstallFetchRetryForTest 还原合同', () => {
  it('安装后网络错误重试 3 次；还原后同一错误直接抛（不再经过重试包装）', async () => {
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
