/**
 * 全局 fetch 网络层重试(仅 GET,幂等安全)。
 *
 * 2026-06-13 仍逐帧加载资源时,生产站冷启动一次发 ~3200 个请求,服务器/链路偶发断连会让单个文件
 * net::ERR_FAILED(2026-06-13 user 报读档时 tile PNG 概率性加载失败,刷新即愈)——
 * 已查明主因是 nginx 默认 keepalive_requests 1000:一条 HTTP/2 连接服务满 1000
 * 请求即 GOAWAY 断连,在途请求被砍。服务端已调大该值;本层兜底其余偶发
 * (链路抖动 / 移动网络切换 / 服务器瞬时过载):
 *   - fetch reject(网络层失败,如 ERR_FAILED / Failed to fetch)→ 重试
 *   - 502/503/504(网关/过载瞬时态)→ 重试
 *   - 其余状态码(404 等资源性错误)原样返回,不重试
 * 默认重试 2 次,退避 300ms/900ms。
 *
 * 装载顺序:必须在 initBootLoading **之前**调用(boot-loading 也包 fetch 且 finish
 * 时把 globalThis.fetch 还原成它捕获的底层 —— retry 先装才能在还原后存活)。
 */

let installed = false

function waitForRetry(delay: number, signal: AbortSignal | null | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const onAbort = (): void => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, delay)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export function installFetchRetry(opts: { retries?: number; backoffMs?: number[] } = {}): void {
  if (installed) return
  const retries = opts.retries ?? 2
  const backoff = opts.backoffMs ?? [300, 900]
  if (!Number.isInteger(retries) || retries < 0) {
    throw new RangeError(`fetch-retry: retries must be a non-negative integer (got ${retries})`)
  }
  if (backoff.some((delay) => !Number.isFinite(delay) || delay < 0)) {
    throw new RangeError('fetch-retry: backoffMs must contain finite non-negative delays')
  }
  installed = true
  const orig = globalThis.fetch.bind(globalThis)

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (
      init?.method ??
      (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')
    ).toUpperCase()
    if (method !== 'GET') return orig(input, init) // 非幂等请求不重试

    // init.signal 显式 null 会脱离 Request 的 signal，不能用 ?? 回退。
    const signal =
      init?.signal !== undefined
        ? init.signal
        : typeof Request !== 'undefined' && input instanceof Request
          ? input.signal
          : undefined
    let lastErr: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        await waitForRetry(backoff[attempt - 1] ?? backoff[backoff.length - 1] ?? 1000, signal)
        // 退避结束到恢复本协程之间也可能取消；此时不再调用底层 fetch。
        if (signal?.aborted) throw signal.reason
      }
      try {
        const res = await orig(input, init)
        if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < retries) {
          lastErr = new Error(`fetch ${res.status} (retrying)`)
          continue
        }
        return res
      } catch (err) {
        if (
          signal?.aborted ||
          (typeof err === 'object' && err !== null && 'name' in err && err.name === 'AbortError')
        )
          throw err
        lastErr = err // 网络层失败 → 退避后重试;耗尽后抛最后一次错误
      }
    }
    throw lastErr
  }) as typeof fetch
}

/** 测试用:还原 + 允许重新装载。 */
export function uninstallFetchRetryForTest(restoreTo: typeof fetch): void {
  installed = false
  globalThis.fetch = restoreTo
}
