/**
 * 离线预缓存客户端:仅生产注册 Service Worker,申请持久化存储,在 boot 门后触发后台预缓存,
 * 把 SW 的进度消息转给回调(driver:precache-ui)。dev/e2e(PROD=false)与无 SW 能力时安全 no-op。
 */
export interface PrecacheProgress {
  done: number
  total: number
  bytes: number
  totalBytes: number
}

export interface RegisterPrecacheOpts {
  isProd: boolean
  onProgress: (p: PrecacheProgress) => void
  onDone?: () => void
}

export async function registerPrecache(opts: RegisterPrecacheOpts): Promise<void> {
  if (!opts.isProd) return // dev/e2e 不挂 SW
  const swc = (navigator as Navigator).serviceWorker as ServiceWorkerContainer | undefined
  if (!swc) return // 浏览器无 SW(老环境)→ 兜底走按需 fetch

  // updateViaCache:'none' → 浏览器不用 HTTP 缓存取 sw.js,绕开 nginx 长缓存导致 SW 不更新
  await swc.register('/sw.js', { updateViaCache: 'none' })

  swc.addEventListener('message', (e: MessageEvent) => {
    const d = e.data as { type?: string } & PrecacheProgress
    if (d?.type === 'precache-progress') opts.onProgress(d)
    else if (d?.type === 'precache-done') opts.onDone?.()
  })

  // 持久化存储:避免 579MB 被浏览器配额回收(best-effort,失败不影响)
  try {
    await navigator.storage?.persist?.()
  } catch {
    /* ignore */
  }

  // 等 SW 接管后触发后台预缓存(controller 可能首访为空 → 用 ready.active)
  const reg = await swc.ready
  reg.active?.postMessage({ type: 'precache' })
}
