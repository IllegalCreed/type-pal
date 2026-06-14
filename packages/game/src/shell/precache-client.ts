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
  /** SW 已 active 接管(reg.ready 之后)。 */
  onReady?: () => void
  /** 无 SW 能力 / register 抛错 → 调用方据此自动放行可玩门(不卡门)。 */
  onUnavailable?: () => void
}

// boost 用:registerPrecache 内把 ready.active 存这里,用户进入后 boostPrecache() 发消息提并发。
let _activeWorker: ServiceWorker | null = null

/** 用户点「进入游戏」后调:通知 SW 把预缓存并发从让路档(2)提到全速(8)。 */
export function boostPrecache(): void {
  _activeWorker?.postMessage({ type: 'precache-boost' })
}

export async function registerPrecache(opts: RegisterPrecacheOpts): Promise<void> {
  if (!opts.isProd) return // dev/e2e 不挂 SW
  const swc = (navigator as Navigator).serviceWorker as ServiceWorkerContainer | undefined
  if (!swc) {
    opts.onUnavailable?.() // 浏览器无 SW(老环境)→ 兜底走按需 fetch + 自动放行门
    return
  }

  // updateViaCache:'none' → 浏览器不用 HTTP 缓存取 sw.js,绕开 nginx 长缓存导致 SW 不更新
  try {
    await swc.register('/sw.js', { updateViaCache: 'none' })
  } catch (err) {
    console.warn('[precache] SW register failed, fallback to on-demand fetch:', err)
    opts.onUnavailable?.() // 注册失败 → 退化为现状 + 自动放行门
    return
  }

  swc.addEventListener('message', (e: MessageEvent) => {
    const d = e.data as { type?: string } & PrecacheProgress
    if (d?.type === 'precache-progress') opts.onProgress(d)
    // done 或 error 都让 UI 收尾(error 时缓存不全,运行时按需 fetch 兜底;进度框不应挂着不淡出)。
    else if (d?.type === 'precache-done' || d?.type === 'precache-error') opts.onDone?.()
  })

  // 持久化存储:避免大体积缓存被浏览器配额回收(best-effort,失败不影响)
  try {
    await navigator.storage?.persist?.()
  } catch {
    /* ignore */
  }

  // 等 SW 接管后触发后台预缓存(controller 可能首访为空 → 用 ready.active)。
  // 低并发起步(让路 boot 必要资源);用户进入后 boostPrecache() 提速。
  const reg = await swc.ready
  _activeWorker = reg.active ?? null
  opts.onReady?.()
  reg.active?.postMessage({ type: 'precache' })
}
