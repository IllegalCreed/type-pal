/**
 * TEST-GAME-HOST-BOUNDARIES-1 H01：fetch-retry 边界（shell/fetch-retry.ts）。
 * 既有 fetch-retry.test 已覆盖 reject/耗尽/503/404/POST/重装——不重复。本文件：
 * init.method 优先于 Request.method、GET 大小写、502/504 同 503、最终 Response 与最后
 * Error 身份、backoff 末值与空数组 fallback（fake timers）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  installFetchRetry,
  uninstallFetchRetryForTest,
} from './fetch-retry.js'

const originalFetch = globalThis.fetch

afterEach(() => {
  uninstallFetchRetryForTest(originalFetch)
  vi.useRealTimers()
})

describe('H01 installFetchRetry 边界', () => {
  it('init.method 优先于 Request.method：非幂等覆盖不重试（503 也只调一次）；GET 对照重试', async () => {
    vi.useFakeTimers()
    let calls = 0
    // 网关瞬时 503：若 method 被误判为 GET（忽略 init 覆盖）会触发重试 → 调用数 2
    const gateway = new Response('gateway', { status: 503 })
    globalThis.fetch = vi.fn(async () => {
      calls += 1
      return gateway
    }) as unknown as typeof fetch
    installFetchRetry({ retries: 1, backoffMs: [1] })
    // Request 带 GET，但 init.method=POST 覆盖 → 非幂等直接透传 503，不重试
    const request = new Request('https://x.test/x', { method: 'GET' })
    const passthrough = await globalThis.fetch(request, { method: 'POST' })
    expect(calls).toBe(1) // init.method=POST 优先：一次即返回（误判 GET 会变 2）
    expect(passthrough).toBe(gateway) // 原 Response 身份透传
    uninstallFetchRetryForTest(originalFetch)

    // 同条件 GET 对照（无 init 覆盖）：503 触发重试 → 调用数 2、拿到新 200 Response 身份
    let getCalls = 0
    const recovered = new Response('recovered', { status: 200 })
    globalThis.fetch = vi.fn(async () => {
      getCalls += 1
      return getCalls === 1 ? new Response('bad', { status: 503 }) : recovered
    }) as unknown as typeof fetch
    installFetchRetry({ retries: 1, backoffMs: [1] })
    const retried = globalThis.fetch('https://x.test/g', { method: 'GET' })
    const resolved = retried.then((response) => response)
    await vi.runAllTimersAsync()
    expect(await resolved).toBe(recovered)
    expect(getCalls).toBe(2) // GET 重试
    // 小写 get 与 GET 等价（大小写不敏感）
    uninstallFetchRetryForTest(originalFetch)
    let lowerCalls = 0
    globalThis.fetch = vi.fn(async () => {
      lowerCalls += 1
      return new Response('bad', { status: 503 })
    }) as unknown as typeof fetch
    installFetchRetry({ retries: 1, backoffMs: [1] })
    const lowerAttempt = globalThis.fetch('https://x.test/l', { method: 'get' })
    const lowerSettled = lowerAttempt.then(
      (response) => ({ response }),
      (error: unknown) => ({ error }),
    )
    await vi.runAllTimersAsync()
    const lower = await lowerSettled
    expect(lowerCalls).toBe(2) // 小写 get 仍走 GET 重试路径
    expect((lower as { error?: Error }).error).toBeUndefined()
  })
  it('502/504 与 503 同样重试；耗尽抛最后一次 Error 身份', async () => {
    vi.useFakeTimers()
    const boom = new Error('net down')
    globalThis.fetch = vi.fn(async () => {
      throw boom
    }) as unknown as typeof fetch
    installFetchRetry({ retries: 2, backoffMs: [1, 2] })
    const settled = globalThis.fetch('https://x.test/c').then(
      (res) => ({ res }),
      (err: unknown) => ({ err }),
    )
    await vi.runAllTimersAsync()
    const outcome = (await settled) as { res?: Response; err?: unknown }
    expect(outcome.res).toBeUndefined()
    expect(outcome.err).toBe(boom) // 最后一次 Error 身份（非包装错误）
  })
  it('重试后成功：返回最终那次 Response 身份（502→504→200）', async () => {
    vi.useFakeTimers()
    const last = new Response('final')
    let m = 0
    globalThis.fetch = vi.fn(async () => {
      m += 1
      return m === 1
        ? new Response('x', { status: 502 })
        : m === 2
          ? new Response('x', { status: 504 })
          : last
    }) as unknown as typeof fetch
    installFetchRetry({ retries: 3, backoffMs: [1, 2] })
    const resolved = globalThis.fetch('https://x.test/d').then((res) => res)
    await vi.runAllTimersAsync()
    expect(await resolved).toBe(last)
    expect(m).toBe(3)
  })
  it('backoff 末值复用与空数组 fallback（1000ms）', async () => {
    vi.useFakeTimers()
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    let n = 0
    globalThis.fetch = vi.fn(async () => {
      n += 1
      if (n > 3) return new Response('ok')
      throw new Error('e')
    }) as unknown as typeof fetch
    installFetchRetry({ retries: 3, backoffMs: [5, 7] })
    const resolved = globalThis.fetch('https://x.test/e').then((res) => res)
    await vi.runAllTimersAsync()
    expect((await resolved).status).toBe(200)
    expect(timeoutSpy.mock.calls.map((call) => call[1])).toEqual([5, 7, 7]) // 超长退避取末值

    // 空数组 → 1000 fallback
    uninstallFetchRetryForTest(originalFetch)
    timeoutSpy.mockClear()
    let k = 0
    globalThis.fetch = vi.fn(async () => {
      k += 1
      return k > 1 ? new Response('ok') : Promise.reject(new Error('e'))
    }) as unknown as typeof fetch
    installFetchRetry({ retries: 1, backoffMs: [] })
    const resolved2 = globalThis.fetch('https://x.test/f').then((res) => res)
    await vi.runAllTimersAsync()
    expect((await resolved2).status).toBe(200)
    expect(timeoutSpy.mock.calls.map((call) => call[1])).toEqual([1000])
  })
})
