/**
 * Play a catalog video in a full-screen overlay. A denied play attempt leaves
 * the gesture prompt active until playback starts or the owner ends the video.
 */
import { scriptWorkWait } from './script-work-queue.js'

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

/** Complete after the media ends, fails to load, is skipped, or is cancelled. */
export function playVideo(options: PlayVideoOptions): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  const container = options.containerEl ?? document.body
  const skipKeys = new Set(options.skipKeys ?? ['Space', 'Enter', 'Escape'])

  return scriptWorkWait<void>(options.signal, (resolve) => {
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
    let starting = false
    let skipTimer: ReturnType<typeof setTimeout> | undefined

    const removeClickOverlay = (): void => {
      clickOverlay?.parentElement?.removeChild(clickOverlay)
      clickOverlay = null
    }
    const cleanup = (): void => {
      if (settled) return
      settled = true
      clearTimeout(skipTimer)
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
      skipTimer ??= setTimeout(cleanup, 500)
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

    const tryPlay = async (): Promise<void> => {
      if (settled || starting) return
      starting = true
      try {
        await video.play()
        removeClickOverlay()
      } catch (error) {
        if (settled) return
        console.warn(`[video-player] play() rejected (autoplay policy?): ${String(error)}`)
        if (clickOverlay) return
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
        clickOverlay.addEventListener('click', () => void tryPlay())
        container.appendChild(clickOverlay)
      } finally {
        starting = false
      }
    }
    void tryPlay()
  })
}
