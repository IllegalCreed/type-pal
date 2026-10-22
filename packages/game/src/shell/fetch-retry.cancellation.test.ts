import { getEventListeners } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installFetchRetry, uninstallFetchRetryForTest } from './fetch-retry.js'

const originalFetch = globalThis.fetch
const url = 'http://127.0.0.1:1/never-sent'

afterEach(async () => {
  try {
    // 先清本例的退避及监听器；不要把尚未结局的重试带到真实时钟或下个 fetch。
    if (vi.isFakeTimers()) await vi.runAllTimersAsync()
  } finally {
    uninstallFetchRetryForTest(originalFetch)
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
    vi.useRealTimers()
  }
})

describe('fetch-retry 取消与退避资源', () => {
  it.each([
    { name: '自定义 Error', custom: true, retries: 2 },
    { name: '默认 AbortError，零次重试', custom: false, retries: 0 },
  ])('已取消 Request：$name 原因与原生 fetch 一致，不进入退避', async ({ custom, retries }) => {
    const controller = new AbortController()
    controller.abort(custom ? new Error('request disposed') : undefined)
    const request = new Request(url, { signal: controller.signal })
    const reason = request.signal.reason
    // 原生正控使用已取消的真实 Request；网络不会到达这个端口。
    await expect(originalFetch(request)).rejects.toBe(reason)
    vi.useFakeTimers()
    const timeout = vi.spyOn(globalThis, 'setTimeout')
    globalThis.fetch = vi.fn<typeof fetch>((input, init) => originalFetch(input, init))
    installFetchRetry({ retries, backoffMs: [100] })
    const result = fetch(request).then(
      (response) => ({ response }),
      (error: unknown) => ({ error }),
    )
    await vi.runAllTimersAsync()
    const outcome = await result
    expect('error' in outcome && outcome.error).toBe(reason)
    expect(timeout).not.toHaveBeenCalled()
  })

  it('已取消 init.signal 不遮蔽原生 Request 构造错误', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    controller.abort(new Error('cancelled'))
    let nativeError: unknown
    globalThis.fetch = vi.fn<typeof fetch>(async (input, init) => {
      try {
        return await originalFetch(input, init)
      } catch (error) {
        nativeError = error
        throw error
      }
    })
    installFetchRetry({ retries: 2, backoffMs: [100] })
    // 非法URL是明确的IO输入负例，不会产生网络请求。
    const result = fetch('http://[', { signal: controller.signal }).catch((error: unknown) => error)
    await vi.runAllTimersAsync()
    expect(nativeError).toBeInstanceOf(TypeError)
    expect(await result).toBe(nativeError)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([
    'init',
    'Request',
  ] as const)('%s 的 signal 在退避中取消：立即拒绝、清 timer/监听器且不再请求', async (source) => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const request = new Request(url, { signal: controller.signal })
    const signal = request.signal
    const listenersBefore = getEventListeners(signal, 'abort').length
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }))
    globalThis.fetch = transport
    installFetchRetry({ retries: 2, backoffMs: [100] })
    let outcome: { response: Response } | { error: unknown } | undefined
    const pending = (source === 'init' ? fetch(url, { signal }) : fetch(request)).then(
      (response) => {
        outcome = { response }
      },
      (error: unknown) => {
        outcome = { error }
      },
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(transport).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(1)
    controller.abort(source === 'init' ? new Error('music stopped') : undefined)
    await vi.advanceTimersByTimeAsync(0)
    const atAbort = {
      outcome,
      timers: vi.getTimerCount(),
      listeners: getEventListeners(signal, 'abort').length,
    }
    // 先排空旧实现可能留下的重试，再断言取消时快照；反例失败也不遗留在途 Promise。
    await vi.runAllTimersAsync()
    await pending
    expect(atAbort.outcome).toBeDefined()
    expect(atAbort.outcome && 'error' in atAbort.outcome && atAbort.outcome.error).toBe(
      signal.reason,
    )
    expect(atAbort.timers).toBe(0)
    expect(atAbort.listeners).toBe(listenersBefore)
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it.each([
    'signal',
    'null',
  ] as const)('init.signal=%s 覆盖已取消 Request；正常退避恢复后不持有监听器', async (override) => {
    vi.useFakeTimers()
    const original = new AbortController()
    original.abort(new Error('superseded request'))
    const request = new Request(url, { signal: original.signal })
    const signal = override === 'signal' ? new Request(url).signal : null
    // Request 的标准构造语义是独立于 retry 实现的覆盖 oracle。
    const nativeOverride = new Request(request, { signal })
    expect(nativeOverride.signal.aborted).toBe(false)
    // 构造本身也可能持有 signal 监听器；先完成正控，再取 retry 自有资源的基线。
    const listenersBefore = signal ? getEventListeners(signal, 'abort').length : 0
    const recovered = new Response('recovered')
    const transport = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('transient connection failure'))
      .mockResolvedValueOnce(recovered)
    globalThis.fetch = transport
    installFetchRetry({ retries: 1, backoffMs: [100] })
    const pending = fetch(request, { signal }).then(
      (response) => ({ response }),
      (error: unknown) => ({ error }),
    )
    await vi.advanceTimersByTimeAsync(99)
    expect(transport).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    const outcome = await pending
    expect('response' in outcome && outcome.response).toBe(recovered)
    expect(transport).toHaveBeenNthCalledWith(2, request, { signal })
    expect(vi.getTimerCount()).toBe(0)
    if (signal) expect(getEventListeners(signal, 'abort').length).toBe(listenersBefore)
    expect(nativeOverride.signal.aborted).toBe(false)
  })
})
