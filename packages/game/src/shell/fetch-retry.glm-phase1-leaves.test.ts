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
  uninstallFetchRetryForTest(originalFetch)
  vi.restoreAllMocks()
})

describe('L23 uninstallFetchRetryForTest 还原合同', () => {
  it('安装后网络错误重试 3 次；还原后同一错误直接抛（不再经过重试包装）', async () => {
    const flaky = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    globalThis.fetch = flaky as typeof fetch
    installFetchRetry({ retries: 2, backoffMs: [0, 0] })
    await expect(fetch('https://localhost/x')).rejects.toThrow('fetch failed')
    expect(flaky).toHaveBeenCalledTimes(3) // 1 + 2 重试
    uninstallFetchRetryForTest(flaky as typeof fetch)
    // 还原到 flaky 本体：再调不再有重试包装（恰 1 次）
    const direct = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    globalThis.fetch = direct as typeof fetch
    await expect(fetch('https://localhost/y')).rejects.toThrow('fetch failed')
    expect(direct).toHaveBeenCalledTimes(1)
  })

  it('还原后 install 可重新装载（installed 复位合同）', async () => {
    const ok = vi.fn(async () => new Response('ok'))
    globalThis.fetch = ok as typeof fetch
    installFetchRetry()
    uninstallFetchRetryForTest(ok as typeof fetch)
    installFetchRetry() // 再次装载不因 installed 残留被拒
    await fetch('https://localhost/z')
    expect(ok).toHaveBeenCalledTimes(1)
  })
})
