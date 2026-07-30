import { installTypePalAnalytics } from './analytics/install-analytics.js'
import { warmUpVideoAutoplay } from './shell/avi-player.js'
import { failBootLoading, initBootLoading, restoreBootFetch } from './shell/boot-loading.js'
import { bootstrap, showError } from './shell/bootstrap.js'
import { installFetchRetry } from './shell/fetch-retry.js'
import { registerPrecache, startPrecache } from './shell/precache-client.js'
import { createUnifiedProgressUi } from './shell/precache-ui.js'

if (typeof document !== 'undefined') {
  const isProd = (import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD === true
  try {
    installTypePalAnalytics({ enabled: isProd, window, document, navigator })
  } catch {
    // Analytics 是可选能力，初始化失败不得改变第一阶段游戏启动路径。
  }

  const canvas = document.getElementById('screen')
  if (canvas instanceof HTMLCanvasElement) {
    // GET 网络层重试兜底(偶发 net::ERR_FAILED)。必须先于任何 fetch / boot-loading 包装。
    installFetchRetry()

    // dev/e2e(PROD=false)整体跳过 SW + 可玩门;仅生产挂两段进度与门。
    // 可玩门:enterGate resolve 来源二选一——用户点「进入游戏」/ 自动放行(dev·e2e·SW 不可用)。
    // gateReleased 守卫消除"SW 注册失败自动放行"与"出按钮"的竞态:放行后不再出按钮 / 不启动预缓存。
    let resolveEnter!: () => void
    const enterGate = new Promise<void>((r) => {
      resolveEnter = r
    })
    let gateReleased = false
    const releaseGate = (): void => {
      if (gateReleased) return
      gateReleased = true
      resolveEnter()
    }

    if (isProd && 'serviceWorker' in navigator) {
      // ── PROD + SW:两段进度(虚线前=必要资源 / 虚线后=SW 全量)+ 显式可玩门 ──
      const ui = createUnifiedProgressUi()
      // 虚线前:必要资源前台加载进度(boot fetch 计数)→ 回调映射到 0→虚线。
      initBootLoading(undefined, (frac) => ui.setNecessaryProgress(frac))
      // SW 早注册(为运行时 cache-first),但**不**触发全量预缓存——等 onPlayable(虚线)后 startPrecache。
      void registerPrecache({
        isProd,
        onProgress: (p) => ui.setFullProgress(p.bytes, p.totalBytes), // 虚线后:SW 全量真实进度
        onDone: () => ui.done(),
        onUnavailable: releaseGate, // 无 SW / 注册失败 → 门不挡,自动进
      })
      // 「进入游戏」click handler——同步解锁 video autoplay(transient activation 要求);
      // 不在此启动/提速预缓存:SW 已在虚线后全速,视频期间由 bootstrap 的 onPresent(suspendRaf)暂停。
      const enter = (): void => {
        if (gateReleased) return
        warmUpVideoAutoplay() // ← click 同步栈:解锁本 session video autoplay
        ui.enterGame() // 覆盖层 → 右上角半透明小条
        releaseGate() // 放行 bootstrap 继续 trademark/splash + 主循环
      }
      void bootstrap(canvas, {
        // 必要资源就绪(虚线):停必要资源计数 + 出按钮 + 启动 SW 全量(虚线后段);自动放行时不出按钮。
        onPlayable: () => {
          if (gateReleased) return
          restoreBootFetch() // 停 fetch 计数,虚线前段定格在虚线
          ui.markPlayable(enter) // 进度到虚线 + 出常驻按钮
          startPrecache() // 虚线后:SW 全速预缓存全量(竞速玩家可在加载页等满 100%)
        },
        enterGate,
      }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('bootstrap failed:', err)
        ui.fail(msg) // 覆盖层在(未进入)则改显错误;已进入则只 canvas 显示
        showError(canvas, msg)
      })
    } else {
      // ── dev/e2e(PROD=false)/ 老浏览器无 SW:退化为现状——fetch 计数进度(自渲染)+ 自动进游戏,无门无 SW ──
      initBootLoading() // 包 window.fetch 计数 + 自渲染 #boot-loading(现状)
      releaseGate() // 无门:enterGate 预先放行 → bootstrap 不阻塞
      void bootstrap(canvas, { enterGate }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('bootstrap failed:', err)
        failBootLoading(msg) // overlay 留在原地显示错误
        showError(canvas, msg)
      })
    }
  }
}
