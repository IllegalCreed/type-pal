/**
 * M5.6 T18 Step 3:AVI mp4 视频播放(WIN95 build 路径)。
 *
 * 用途:`PAL_PlayAVI` 等价 — sdlpal 真值播 1.avi(trademark)/ 2.avi(splash)/
 *       3.avi(opening AVI) / 4-6.avi(cutscene / 结局)。
 *
 * memory 锚:[avi-offline-ffmpeg-to-mp4] — 离线 ffmpeg 转 mp4 + game runtime
 * 用 `<video>` 元素播,**不** runtime port aviplay.c MS-MPEG4 v3 解码。
 *
 * 设计:
 *  - 创 `<video>` DOM 元素 fixed 100% 全屏覆盖,黑底
 *  - object-fit: contain → 等比例缩放 + black bar(288×180 AVI 在 16:10/4:3 viewport 黑边)
 *  - skip keys Space/Enter/Escape 立即 resolve(sdlpal kKeyMenu | kKeySearch 真值,uigame.c:395 splash 跳过同口径)
 *  - 不知 gs / suspendRaf — caller(bootstrap)用 try/finally 控制 raf loop 暂停
 *
 * **注**:此模块无 unit test 走运行时(依赖 DOM <video> + browser codec);
 *        通过 manual smoke(chrome-devtools evaluate)+ bootstrap 集成验证。
 */

export interface PlayAviOptions {
  /** mp4 资源 URL,通常 `/extracted/videos/{N}.mp4`。 */
  src: string

  /** 容器元素,默认 `document.body`。 */
  containerEl?: HTMLElement

  /**
   * 跳过键列表(`KeyboardEvent.code`),默认 `Space` / `Enter` / `Escape`,
   * 对应 sdlpal `kKeyMenu | kKeySearch`(uigame.c:395 splash 跳过真值)。
   */
  skipKeys?: string[]

  /** muted? 默认 false(AVI 有音轨)。某些浏览器 autoplay 限制需 true。 */
  muted?: boolean
}

/**
 * 播 mp4 → Promise resolve 时机 = 视频 `ended` 事件 OR 用户按跳过键 OR 加载失败。
 *
 * **不抛错**:加载失败 / play 被拒(autoplay policy)只 console.warn,Promise 仍 resolve,
 * 保证 bootstrap 流程不卡住。
 */
export function playAvi(options: PlayAviOptions): Promise<void> {
  const container = options.containerEl ?? document.body
  const skipKeys = new Set(options.skipKeys ?? ['Space', 'Enter', 'Escape'])

  return new Promise<void>((resolve) => {
    const video = document.createElement('video')
    video.src = options.src
    video.muted = options.muted ?? false
    video.controls = false
    video.autoplay = false
    video.style.position = 'fixed'
    video.style.top = '0'
    video.style.left = '0'
    video.style.width = '100vw'
    video.style.height = '100vh'
    video.style.objectFit = 'contain' // 等比例 + black bar
    video.style.backgroundColor = '#000'
    video.style.zIndex = '10000'

    let settled = false
    const cleanup = (): void => {
      if (settled) return
      settled = true
      window.removeEventListener('keydown', onKey, true)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
      try { video.pause() } catch { /* ignore */ }
      if (video.parentElement) video.parentElement.removeChild(video)
      resolve()
    }

    const onEnded = (): void => cleanup()
    const onError = (): void => {
      console.warn(`[avi-player] video load/decode failed: ${options.src}`)
      cleanup()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (skipKeys.has(e.code)) {
        e.preventDefault()
        cleanup()
      }
    }

    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onError)
    window.addEventListener('keydown', onKey, true)

    container.appendChild(video)

    // 显式 play() — autoplay 在某些浏览器需要 muted 或 user gesture。
    // bootstrap 在 user 启动时调,通常 OK;失败时 console.warn + 仍按 ended 走。
    void video.play().catch((err: unknown) => {
      console.warn(`[avi-player] play() rejected (autoplay policy?): ${String(err)}`)
      // 不立即 cleanup — 用户可手动按 skip key 跳过
    })
  })
}
