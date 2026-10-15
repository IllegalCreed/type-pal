/**
 * TEST-GAME-HOST-BOUNDARIES-1 H01：fetch-retry 边界（shell/fetch-retry.ts）。
 * 主测试保留网络恢复/503/404/POST/幂等/AbortError；耗尽弱摘要并入此处不同attempt身份例。
 * GLM保留真实卸载/重装，本文件覆盖：
 * init.method 优先于 Request.method、GET 大小写、502/504 同 503、最终 Response 与最后
 * Error 身份、backoff 末值与空数组 fallback（fake timers）。
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
    vi.useRealTimers()
  }
})

describe('H01 installFetchRetry 边界', () => {
  it('拒绝无效 retries 且不替换全局 fetch', () => {
    for (const retries of [-1, Number.NaN, 1.5]) {
      expect(() => installFetchRetry({ retries })).toThrow(
        `fetch-retry: retries must be a non-negative integer (got ${retries})`,
      )
      expect(globalThis.fetch).toBe(originalFetch)
    }
  })

  it('拒绝非有限或负数 backoff 延迟且不替换全局 fetch', () => {
    for (const delay of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => installFetchRetry({ backoffMs: [delay] })).toThrow(
        'fetch-retry: backoffMs must contain finite non-negative delays',
      )
      expect(globalThis.fetch).toBe(originalFetch)
    }
  })

  it('失败安装不占用单例；后续零次重试安装仍真正接管并透传请求', async () => {
    expect(() => installFetchRetry({ retries: -1 })).toThrow(RangeError)
    const response = new Response('ok')
    const mock = vi.fn<typeof fetch>().mockResolvedValue(response)
    globalThis.fetch = mock
    installFetchRetry({ retries: 0, backoffMs: [] })
    expect(globalThis.fetch).not.toBe(mock)
    await expect(fetch('/valid')).resolves.toBe(response)
    expect(mock).toHaveBeenCalledExactlyOnceWith('/valid', undefined)
  })

  it('init.method 优先于 Request.method：POST 覆盖 GET，不重试 503', async () => {
    vi.useFakeTimers()
    let calls = 0
    // 网关瞬时 503：若 method 被误判为 GET（忽略 init 覆盖）会触发重试 → 调用数 2
    const gateway = new Response('gateway', { status: 503 })
    globalThis.fetch = vi.fn<typeof fetch>(async () => {
      calls += 1
      return gateway
    })
    installFetchRetry({ retries: 1, backoffMs: [1] })
    // Request 带 GET，但 init.method=POST 覆盖 → 非幂等直接透传 503，不重试。
    // 误判为 GET 会进入重试退避（fake timers 下由 runAllTimers 放行再耗尽拒绝），
    // 先由 calls 断言钉死调用数（纯 AssertionError），再核 Response 身份。
    const request = new Request('https://x.test/x', { method: 'GET' })
    const attempt = globalThis.fetch(request, { method: 'POST' })
    const settled = attempt.then(
      (response) => ({ response }),
      (error: unknown) => ({ error }),
    )
    await vi.runAllTimersAsync() // 若被误判为 GET：放行退避让重试完整发生（calls 变 2）
    expect(calls).toBe(1) // init.method=POST 优先：一次即返回（误判 GET 会变 2）
    expect(await settled).toEqual({ response: gateway })
  })

  it('无 init 覆盖的 GET Request 在 503 后重试并返回恢复的 Response', async () => {
    vi.useFakeTimers()
    let getCalls = 0
    const recovered = new Response('recovered', { status: 200 })
    globalThis.fetch = vi.fn<typeof fetch>(async () => {
      getCalls += 1
      return getCalls === 1 ? new Response('bad', { status: 503 }) : recovered
    })
    installFetchRetry({ retries: 1, backoffMs: [1] })
    const retried = globalThis.fetch(new Request('https://x.test/g', { method: 'GET' }))
    const resolved = retried.then((response) => response)
    await vi.runAllTimersAsync()
    expect(await resolved).toBe(recovered)
    expect(getCalls).toBe(2) // GET 重试
  })

  it('小写 init.method get 仍重试，耗尽后返回最后一个 503 Response', async () => {
    vi.useFakeTimers()
    const firstGateway = new Response('first', { status: 503 })
    const lastGateway = new Response('last', { status: 503 })
    const mock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(firstGateway)
      .mockResolvedValueOnce(lastGateway)
    globalThis.fetch = mock
    installFetchRetry({ retries: 1, backoffMs: [1] })
    const lowerAttempt = globalThis.fetch('https://x.test/l', { method: 'get' })
    const lowerSettled = lowerAttempt.then(
      (response) => ({ response }),
      (error: unknown) => ({ error }),
    )
    await vi.runAllTimersAsync()
    expect(mock).toHaveBeenCalledTimes(2)
    const outcome = await lowerSettled
    expect('response' in outcome && outcome.response).toBe(lastGateway)
  })
  it('网络失败耗尽抛最后一次 Error 身份', async () => {
    vi.useFakeTimers()
    const firstError = new TypeError('first network failure')
    const secondError = new TypeError('second network failure')
    const lastError = new TypeError('Failed to fetch')
    const mock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(secondError)
      .mockRejectedValueOnce(lastError)
    globalThis.fetch = mock
    installFetchRetry({ backoffMs: [1, 2] })
    const settled = globalThis.fetch('https://x.test/c').then(
      (res) => ({ res }),
      (err: unknown) => ({ err }),
    )
    await vi.runAllTimersAsync()
    const outcome = await settled
    expect('err' in outcome && outcome.err).toBe(lastError)
    expect(mock).toHaveBeenCalledTimes(3)
  })

  it('init.signal 在请求中取消时用原始非AbortError原因拒绝，不退避或重试', async () => {
    vi.useFakeTimers()
    const timeout = vi.spyOn(globalThis, 'setTimeout')
    const controller = new AbortController()
    const reason = new Error('caller disposed')
    const mock = vi.fn<typeof fetch>(() => {
      controller.abort(reason)
      return Promise.reject(reason)
    })
    globalThis.fetch = mock
    installFetchRetry({ retries: 2, backoffMs: [5, 7] })
    const rejection = fetch('https://x.test/cancelled', { signal: controller.signal }).then(
      () => undefined,
      (error: unknown) => error,
    )
    await vi.runAllTimersAsync()
    expect(await rejection).toBe(reason)
    expect(mock).toHaveBeenCalledTimes(1)
    expect(timeout).not.toHaveBeenCalled()
  })
  it('重试后成功：返回最终那次 Response 身份（502→504→200）', async () => {
    vi.useFakeTimers()
    const last = new Response('final')
    let m = 0
    globalThis.fetch = vi.fn<typeof fetch>(async () => {
      m += 1
      return m === 1
        ? new Response('x', { status: 502 })
        : m === 2
          ? new Response('x', { status: 504 })
          : last
    })
    installFetchRetry({ retries: 3, backoffMs: [1, 2] })
    const resolved = globalThis.fetch('https://x.test/d').then((res) => res)
    await vi.runAllTimersAsync()
    expect(await resolved).toBe(last)
    expect(m).toBe(3)
  })
  it('backoff 末值用于超出数组长度的后续重试', async () => {
    vi.useFakeTimers()
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    let n = 0
    globalThis.fetch = vi.fn<typeof fetch>(async () => {
      n += 1
      if (n > 3) return new Response('ok')
      throw new Error('e')
    })
    installFetchRetry({ retries: 3, backoffMs: [5, 7] })
    const resolved = globalThis.fetch('https://x.test/e').then((res) => res)
    await vi.runAllTimersAsync()
    expect((await resolved).status).toBe(200)
    expect(timeoutSpy.mock.calls.map((call) => call[1])).toEqual([5, 7, 7]) // 超长退避取末值
  })

  it('空 backoff 数组使用 1000ms fallback', async () => {
    vi.useFakeTimers()
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    let k = 0
    globalThis.fetch = vi.fn<typeof fetch>(async () => {
      k += 1
      return k > 1 ? new Response('ok') : Promise.reject(new Error('e'))
    })
    installFetchRetry({ retries: 1, backoffMs: [] })
    const resolved2 = globalThis.fetch('https://x.test/f').then((res) => res)
    await vi.runAllTimersAsync()
    expect((await resolved2).status).toBe(200)
    expect(timeoutSpy.mock.calls.map((call) => call[1])).toEqual([1000])
  })
})
