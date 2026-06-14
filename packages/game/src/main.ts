import { bootstrap, showError } from './shell/bootstrap.js'
import { failBootLoading, initBootLoading } from './shell/boot-loading.js'
import { installFetchRetry } from './shell/fetch-retry.js'
import { registerPrecache } from './shell/precache-client.js'
import { createPrecacheWidget } from './shell/precache-ui.js'

if (typeof document !== 'undefined') {
  const canvas = document.getElementById('screen')
  if (canvas instanceof HTMLCanvasElement) {
    // GET 网络层重试兜底(偶发 net::ERR_FAILED,2026-06-13 读档 tile 失败)。
    // 必须先于 initBootLoading 装(boot-loading finish 会把 fetch 还原成它捕获的底层)。
    installFetchRetry()
    // 启动 loading 覆盖层:包 fetch 计数进度;bootstrap 起主循环时 finishBootLoading 收尾
    initBootLoading()
    void bootstrap(canvas)
      .then(() => {
        // boot 门已过(主循环已起、首帧可见)→ 后台预缓存全部资源,进度走右上角小组件。
        // 仅生产:dev/e2e 整体跳过——不挂 SW、不建进度组件,免空组件 DOM 干扰 e2e 截图。
        // import.meta.env 用 cast 访问(同 dev-panel.ts 惯例,不依赖 vite/client triple-slash 类型)。
        const isProd = (import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD === true
        if (!isProd) return
        const widget = createPrecacheWidget()
        void registerPrecache({
          isProd,
          onProgress: (p) => widget.update(p),
          onDone: () => widget.done(),
        })
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('bootstrap failed:', err)
        failBootLoading(msg) // overlay 留在原地显示错误(此前黑屏只有 canvas 一行小字)
        showError(canvas, msg)
      })
  }
}
