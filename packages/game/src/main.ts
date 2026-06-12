import { bootstrap, showError } from './shell/bootstrap.js'
import { failBootLoading, initBootLoading } from './shell/boot-loading.js'
import { installFetchRetry } from './shell/fetch-retry.js'

if (typeof document !== 'undefined') {
  const canvas = document.getElementById('screen')
  if (canvas instanceof HTMLCanvasElement) {
    // GET 网络层重试兜底(偶发 net::ERR_FAILED,2026-06-13 读档 tile 失败)。
    // 必须先于 initBootLoading 装(boot-loading finish 会把 fetch 还原成它捕获的底层)。
    installFetchRetry()
    // 启动 loading 覆盖层:包 fetch 计数进度;bootstrap 起主循环时 finishBootLoading 收尾
    initBootLoading()
    void bootstrap(canvas).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('bootstrap failed:', err)
      failBootLoading(msg) // overlay 留在原地显示错误(此前黑屏只有 canvas 一行小字)
      showError(canvas, msg)
    })
  }
}
