/**
 * 离线预缓存客户端:仅生产注册 Service Worker、申请持久化存储,把 SW 进度消息转给回调
 * (driver:precache-ui)。dev/e2e(PROD=false)与无 SW 能力时安全 no-op。
 *
 * 时机控制(2026-06-15 两段进度 + 视频不卡顿):
 *   registerPrecache 只**早注册**拿 active worker,**不**触发预缓存;
 *   startPrecache() 在 onPlayable(进度条到虚线、必要资源就绪)后才启动全量预缓存;
 *   pausePrecache()/resumePrecache() 在开场视频播放期间暂停(不抢视频 Range / 用户输入带宽)、播完恢复。
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

// registerPrecache 内把 ready.active 存这里,供下面三个时机函数发消息。
let _activeWorker: ServiceWorker | null = null
// startPrecache 可能早于 swc.ready:必要资源 HTTP cache 命中、或硬刷触发 SW 更新(install/activate)时,
// onPlayable 比 SW 就绪还快 → 指令发空、SW 永不启动、进度条停虚线 + 右上角 widget 空白
// (2026-06-15 用户实测)。故缓冲,_activeWorker 就绪后补发。
let _pendingStart = false

/** 虚线后(必要资源就绪)触发 SW 全量预缓存(全速)。 */
export function startPrecache(): void {
  if (_activeWorker) _activeWorker.postMessage({ type: 'precache' })
  else _pendingStart = true // SW 还没就绪 → 缓冲,registerPrecache ready 后补发
}

/** 开场视频期间暂停预缓存——不抢视频 Range 请求和用户输入的带宽/IO(否则点击/空格延迟很大)。 */
export function pausePrecache(): void {
  _activeWorker?.postMessage({ type: 'precache-pause' })
}

/** 视频播完 / 进游戏后恢复全速预缓存。 */
export function resumePrecache(): void {
  _activeWorker?.postMessage({ type: 'precache-resume' })
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

  // 早注册:拿到 active worker 供 startPrecache/pause/resume 用。**不**在此触发 precache——
  // 全量预缓存改由 onPlayable(虚线)后 startPrecache() 显式触发,避免可玩前抢必要资源带宽。
  const reg = await swc.ready
  _activeWorker = reg.active ?? null
  opts.onReady?.()
  if (_pendingStart) {
    _pendingStart = false
    _activeWorker?.postMessage({ type: 'precache' }) // 补发早于 ready 的 startPrecache(否则 SW 永不启动)
  }
}
