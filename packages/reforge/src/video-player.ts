/**
 * mp4 视频播放(过场编排 · 运行时)—— 播原版提取的 videos/{N}.mp4(1=开场 / 4-6=结局过场)。
 *
 * UX 真值照一阶段 `game/shell/avi-player.ts`(零裁量):`<video>` 元素全屏黑底 object-fit:contain
 * 等比黑边;Space/Enter/Escape 跳过;autoplay policy 被拒时「点击屏幕开始」overlay 兜底。
 * **不抛错**:加载失败 / play 被拒只 warn,Promise 仍 resolve —— 编排流程绝不卡住。
 *
 * clean 版剥离一阶段的模块级 videoVolume 全局耦合(reforge 音量系统另接);播放取 <video> 默认音量。
 */

export interface PlayVideoOptions {
  /** 由 AssetResolver 生成的视频资源 URL。 */
  src: string
  /** 容器,默认 document.body。 */
  containerEl?: HTMLElement
  /** 跳过键(KeyboardEvent.code),默认 Space/Enter/Escape(sdlpal kKeyMenu|kKeySearch)。 */
  skipKeys?: string[]
  /** 静音播放(e2e/自动化;默认 false)。 */
  muted?: boolean
  /** 剧情 runner 生命周期；取消时立即移除视频层并兑现播放 Promise。 */
  signal?: AbortSignal
}

/**
 * 播 mp4 → Promise resolve 时机:`ended` / 跳过键(+500ms 缓冲,照 aviplay.c:741)/ 加载失败 /
 * autoplay 拒绝后 user 点击 overlay 再试。SSR/无 document 环境直接 resolve(测试友好)。
 */
export function playVideo(options: PlayVideoOptions): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  const container = options.containerEl ?? document.body
  const skipKeys = new Set(options.skipKeys ?? ['Space', 'Enter', 'Escape'])

  return new Promise<void>((resolve) => {
    const video = document.createElement('video')
    video.src = options.src
    video.muted = options.muted ?? false
    video.controls = false
    video.autoplay = false
    video.playsInline = true
    video.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      'object-fit:contain', // 等比 + 黑边
      'background-color:#000',
      'z-index:10000',
    ].join(';')

    let clickOverlay: HTMLDivElement | null = null
    let settled = false

    const removeClickOverlay = (): void => {
      clickOverlay?.parentElement?.removeChild(clickOverlay)
      clickOverlay = null
    }
    const cleanup = (): void => {
      if (settled) return
      settled = true
      window.removeEventListener('keydown', onKey, true)
      options.signal?.removeEventListener('abort', onAbort)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
      try {
        video.pause()
      } catch {
        /* ignore */
      }
      removeClickOverlay()
      video.parentElement?.removeChild(video)
      resolve()
    }
    const onEnded = (): void => cleanup()
    const onAbort = (): void => cleanup()
    const onError = (): void => {
      console.warn(`[video-player] load/decode failed: ${options.src}`)
      cleanup()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (!skipKeys.has(e.code)) return
      e.preventDefault()
      // 消费该键防泄漏进全局输入(一阶段:跳过键冒泡进 input 被记 Confirm 残留 → 误开新游戏)
      e.stopImmediatePropagation()
      setTimeout(cleanup, 500) // 跳过后半秒缓冲,下一画面不瞬现(aviplay.c:741)
    }

    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onError)
    window.addEventListener('keydown', onKey, true)
    options.signal?.addEventListener('abort', onAbort, { once: true })
    if (options.signal?.aborted) {
      cleanup()
      return
    }
    container.appendChild(video)

    const tryPlay = (): void => {
      void video
        .play()
        .then(removeClickOverlay)
        .catch((err: unknown) => {
          console.warn(`[video-player] play() rejected (autoplay policy?): ${String(err)}`)
          if (settled || clickOverlay) return
          clickOverlay = document.createElement('div')
          clickOverlay.textContent = '点击屏幕开始 / Click to start'
          clickOverlay.style.cssText = [
            'position:fixed',
            'top:0',
            'left:0',
            'width:100vw',
            'height:100vh',
            'background:rgba(0,0,0,0.85)',
            'color:#fff',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'font-family:sans-serif',
            'font-size:24px',
            'cursor:pointer',
            'z-index:10002',
            'user-select:none',
          ].join(';')
          clickOverlay.addEventListener('click', () => tryPlay(), { once: true })
          container.appendChild(clickOverlay)
        })
    }
    tryPlay()
  })
}
