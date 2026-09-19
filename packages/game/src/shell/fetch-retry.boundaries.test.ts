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
  it('init.method 优先于 Request.method；GET 大小写不敏感', async () => {
    vi.useFakeTimers()
    const calls: Array<{ method: string }> = []
    const fake = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        method:
          init?.method ??
          (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET'),
      })
      return new Response('ok')
    })
    globalThis.fetch = fake as unknown as typeof fetch
    installFetchRetry({ retries: 1, backoffMs: [10] })
    // init.method=post 覆盖 Request.method=GET → 非幂等直接透传
    const req = new Request('https://x.test/a', { method: 'GET' })
    await globalThis.fetch(req, { method: 'post' })
    expect(calls[0]!.method).toBe('post')
    expect(calls).toHaveLength(1) // 不重试
    // 小写 get 视为 GET → 可重试路径（首试即 200）
    await globalThis.fetch('https://x.test/b', { method: 'get' })
    expect(calls[1]!.method).toBe('get')
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
