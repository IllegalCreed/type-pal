/**
 * 启动 loading 覆盖层(2026-06-12,用户报生产首载 20-30s 黑屏)。
 *
 * 视图骨架在 index.html 静态内联(#boot-loading)——JS bundle 还在下载时就已可见;
 * 本模块只负责三件事:
 *   1. initBootLoading():包一层 window.fetch 计数(启动期 ~3000 个 /extracted 资源请求),
 *      rAF 节流刷新进度条与计数文本。总数未知 → 进度 = 完成/已发起(分波加载时会
 *      小幅回退,诚实且零侵入,不用把 progress 回调穿透 loader 全链)。
 *   2. finishBootLoading():bootstrap 启动 rAF 主循环(首帧可见)时调——还原 fetch、
 *      淡出并移除节点。
 *   3. failBootLoading(msg):bootstrap 抛错时调——还原 fetch,overlay 留在原地改显错误
 *      (此前启动失败只有 canvas 一行小字 + console,黑屏无反馈)。
 *
 * 所有入口对"无 overlay 节点"(单测 jsdom 默认 DOM / SSR)安全 no-op。
 */

/**
 * 冷启动请求总量预估(2026-06-12 生产实测 ~3237 个;loader 分波 fetch,启动期发起数
 * 逐波增长)。进度条分母取 max(已发起, 预估) + 显示值单调不回退:
 *   - 纯 done/started 会在每波新请求发起时分母跳涨 → 条回退(用户 2026-06-12 实测反馈);
 *   - 预估垫底让前几波不虚高,实际总量超预估后自然切回真实分数,clamp 兜底不回退;
 *   - 预估随项目演化有 ±20% 漂移无妨:不足时 finish 强制满格,超出时条提前到 99% 爬行。
 */
const EXPECTED_BOOT_REQUESTS = 3236 // 2026-06-15 实测请求总数(此前 3200 是偏小估值,进度条偏快到顶)

let _origFetch: typeof globalThis.fetch | null = null
let _started = 0
let _done = 0
let _expected = EXPECTED_BOOT_REQUESTS
let _shownPct = 0
let _rafPending = false
let _note = ''
// PROD 两段进度:把必要资源加载进度(fraction 0→1)回调给统一 UI(虚线前段),不自渲染 DOM。
// 未设(fallback:SW 不可用)时 render 自渲染 #boot-loading-fill/status。
let _onProgress: ((fraction: number) => void) | null = null

function byId(id: string): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.getElementById(id)
}

function render(): void {
  _rafPending = false
  // 仅在 initBootLoading 激活(_origFetch 已包 fetch)时驱动 #boot-loading——这是 SW 不可用的计数
  // fallback。PROD 走 SW 统一进度(createUnifiedProgressUi 独占 #boot-loading-fill/status),此处不得
  // 抢写,否则 bootstrap 的 setBootLoadingNote → render 会与"已缓存 x/336MB"互盖闪烁(2026-06-14 验证发现)。
  if (!_origFetch) return
  const denom = Math.max(_started, _expected)
  if (_onProgress) {
    // PROD 两段:回调必要资源加载进度给统一 UI(虚线前段),不碰 #boot-loading DOM。
    _onProgress(Math.min(1, denom > 0 ? _done / denom : 0))
    return
  }
  const fill = byId('boot-loading-fill')
  const status = byId('boot-loading-status')
  if (!fill && !status) return
  const raw = denom > 0 ? Math.floor((_done / denom) * 100) : 0
  _shownPct = Math.min(99, Math.max(_shownPct, raw)) // 单调 + 99 封顶(满格只由 finish 给)
  if (fill) fill.style.width = `${_shownPct}%`
  if (status) {
    status.textContent = _note
      ? `正在加载资源 ${_done} / ${denom} — ${_note}`
      : `正在加载资源 ${_done} / ${denom}`
  }
}

/**
 * 在计数文本后追加说明(如尾段只剩 soundfont 32MB 单请求在下,计数停走 → 注明在等什么)。
 * 传空串清除。无 overlay 时 no-op。
 */
export function setBootLoadingNote(note: string): void {
  _note = note
  scheduleRender()
}

function scheduleRender(): void {
  if (_rafPending) return
  _rafPending = true
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(render)
  else setTimeout(render, 16)
}

function restoreFetch(): void {
  if (_origFetch) {
    globalThis.fetch = _origFetch
    _origFetch = null
  }
}

/**
 * PROD 两段进度:必要资源就绪(onPlayable)后还原 fetch、停止计数与回调,但**不**移除覆盖层
 * (等用户点「进入游戏」由 UI 收尾)。fallback(SW 不可用)走 finishBootLoading 自动收尾移除。
 */
export function restoreBootFetch(): void {
  restoreFetch()
  _onProgress = null
}

export function initBootLoading(
  expectedTotal: number = EXPECTED_BOOT_REQUESTS,
  onProgress?: (fraction: number) => void,
): void {
  if (!byId('boot-loading')) return // 无 overlay(测试/SSR)→ no-op
  if (_origFetch) return // 幂等:已装不重复包
  _started = 0
  _done = 0
  _expected = expectedTotal
  _shownPct = 0
  _note = ''
  _onProgress = onProgress ?? null
  const orig = globalThis.fetch.bind(globalThis)
  _origFetch = orig
  globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
    _started++
    scheduleRender()
    try {
      return await orig(...args)
    } finally {
      _done++
      scheduleRender()
    }
  }) as typeof fetch
}

export function finishBootLoading(): void {
  restoreFetch()
  const root = byId('boot-loading')
  if (!root) return
  // 满格(99 封顶只在加载期;此处给真 100)再淡出
  const fill = byId('boot-loading-fill')
  if (fill) fill.style.width = '100%'
  // CSS 侧 #boot-loading 自带 opacity transition;加类淡出,过渡完移除
  root.classList.add('boot-loading-done')
  setTimeout(() => root.remove(), 600)
}

export function failBootLoading(msg: string): void {
  restoreFetch()
  const root = byId('boot-loading')
  if (!root) return
  root.classList.add('boot-loading-error')
  const status = byId('boot-loading-status')
  if (status) status.textContent = `启动失败:${msg}`
}
