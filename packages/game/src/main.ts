import { warmUpVideoAutoplay } from './shell/avi-player.js'
import { failBootLoading, initBootLoading } from './shell/boot-loading.js'
import { bootstrap, showError } from './shell/bootstrap.js'
import { installFetchRetry } from './shell/fetch-retry.js'
import { boostPrecache, registerPrecache } from './shell/precache-client.js'
import { createUnifiedProgressUi } from './shell/precache-ui.js'

if (typeof document !== 'undefined') {
  const canvas = document.getElementById('screen')
  if (canvas instanceof HTMLCanvasElement) {
    // GET 网络层重试兜底(偶发 net::ERR_FAILED)。必须先于任何 fetch / boot-loading 包装。
    installFetchRetry()

    // dev/e2e(PROD=false)整体跳过 SW + 可玩门;仅生产挂统一进度与门。
    // import.meta.env 用 cast 访问(同 dev-panel.ts 惯例,不依赖 vite/client triple-slash 类型)。
    const isProd = (import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD === true

    // 可玩门:enterGate resolve 来源二选一——用户点「进入游戏」/ 自动放行(dev·e2e·SW 不可用)。
    // gateReleased 守卫消除"SW 注册失败自动放行"与"出按钮"的竞态:放行后不再出按钮。
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
      // ── PROD + 有 SW 能力:一条 SW 字节进度(态1 加载页大条 → 态3 右上角半透明)+ 显式可玩门 ──
      // 乐观走此路;register 失败 onUnavailable 再退回自动放行(门不挡,进度停低位但能玩)。
      const ui = createUnifiedProgressUi()
      // 「进入游戏」click handler——必须同步解锁 video autoplay(transient activation 要求)。
      const enter = (): void => {
        if (gateReleased) return
        warmUpVideoAutoplay() // ← click 同步栈:解锁本 session video autoplay
        ui.enterGame() // 覆盖层 → 右上角半透明小条
        boostPrecache() // 预缓存从让路档(2)提到全速(8)
        releaseGate() // 放行 bootstrap 继续 trademark/splash + 主循环
      }
      // SW 最早注册 + 进度订阅(提前到页面打开,不等 boot 门)。
      void registerPrecache({
        isProd,
        onProgress: (p) => ui.setProgress(p.bytes, p.totalBytes),
        onDone: () => ui.done(),
        onUnavailable: releaseGate, // 无 SW / 注册失败 → 门不挡,自动进
      })
      void bootstrap(canvas, {
        // 必要资源就绪 → 出「进入游戏」按钮(常驻);若门已被自动放行则不出按钮。
        onPlayable: () => {
          if (!gateReleased) ui.markPlayable(enter)
        },
        enterGate,
      }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('bootstrap failed:', err)
        ui.fail(msg) // 覆盖层在(未进入)则改显错误;已进入则只 canvas 显示
        showError(canvas, msg)
      })
    } else {
      // ── dev/e2e(PROD=false)/ 老浏览器无 SW:退化为现状——fetch 计数进度 + 自动进游戏,无门无 SW ──
      initBootLoading() // 包 window.fetch 计数进度(现状)
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
