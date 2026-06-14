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
 *  - skip keys Space/Enter/Escape 立即 resolve(sdlpal kKeyMenu | kKeySearch 真值,uigame.c:395)
 *  - autoplay policy 处理:Chrome/Safari 无 user gesture 时 play() reject,显示 "Click to start"
 *    overlay 让用户首次点击解锁;后续 session 内 AVI 不再被 reject
 *  - 不知 gs / suspendRaf — caller(bootstrap)用 try/finally 控制 raf loop 暂停
 */

export interface PlayAviOptions {
  /** mp4 资源 URL,通常 `/extracted/videos/{N}.mp4`。 */
  src: string

  /** 容器元素,默认 `document.body`。 */
  containerEl?: HTMLElement

  /**
   * 跳过键列表(`KeyboardEvent.code`),默认 `Space` / `Enter` / `Escape`,
   * 对应 sdlpal `kKeyMenu | kKeySearch`(uigame.c:395)。
   */
  skipKeys?: string[]

  /** muted? 默认 false(AVI 有音轨)。某些场景需 true(eg. e2e auto-play test)。 */
  muted?: boolean
}

/**
 * 播 mp4 → Promise resolve 时机:`ended` 事件 / 跳过键 / 加载失败 / autoplay 拒绝 + user click overlay 后再尝试。
 *
 * **不抛错**:加载失败 / play 被拒只 console.warn,Promise 仍 resolve,保证 bootstrap 流程不卡住。
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

    let clickOverlay: HTMLDivElement | null = null
    let settled = false

    const removeClickOverlay = (): void => {
      if (clickOverlay && clickOverlay.parentElement) {
        clickOverlay.parentElement.removeChild(clickOverlay)
      }
      clickOverlay = null
    }

    const cleanup = (): void => {
      if (settled) return
      settled = true
      window.removeEventListener('keydown', onKey, true)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
      try { video.pause() } catch { /* ignore */ }
      removeClickOverlay()
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
        // sdlpal 用单源 g_InputState.dwKeyPress,无并行监听器:跳过 AVI 的键被消费后不会泄漏给别处。
        // ts 这边 onKey 挂 window capture 阶段,而全局 KeyboardInputSource(input.ts)挂 window 冒泡且整局常驻 —
        //   不 stopImmediatePropagation 的话,跳过 splash 的同一个 Space keydown 会继续冒泡进 KeyboardInputSource
        //   被记成 'Confirm' 残留,下一帧 OpeningMenu 一上线即被当确认直接开新游戏(user 报"没看到主菜单")。
        e.stopImmediatePropagation()
        // DL27:跳过后 UTIL_Delay(500)(aviplay.c:741-747)——半秒缓冲再继续流程,
        //   下一画面(主菜单/场景)不瞬间弹出。
        setTimeout(cleanup, 500)
      }
    }

    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onError)
    window.addEventListener('keydown', onKey, true)

    container.appendChild(video)

    /**
     * 尝试 play();autoplay policy 拒绝时显示 click overlay,user click 后 retry。
     * 第一次成功后整个 browser session 解锁,后续 AVI 不再走 overlay 路径。
     */
    const tryPlay = (): void => {
      void video.play().then(() => {
        removeClickOverlay()
      }).catch((err: unknown) => {
        console.warn(`[avi-player] play() rejected (autoplay policy?): ${String(err)}`)
        if (settled || clickOverlay) return
        clickOverlay = document.createElement('div')
        clickOverlay.textContent = '点击屏幕开始 / Click to start'
        clickOverlay.style.cssText = [
          'position:fixed', 'top:0', 'left:0',
          'width:100vw', 'height:100vh',
          'background:rgba(0,0,0,0.85)', 'color:#fff',
          'display:flex', 'align-items:center', 'justify-content:center',
          'font-family:sans-serif', 'font-size:24px',
          'cursor:pointer', 'z-index:10002',
          'user-select:none',
        ].join(';')
        clickOverlay.addEventListener('click', () => {
          // user gesture 解锁后重试 — 第一次成功后整 session OK
          tryPlay()
        }, { once: true })
        container.appendChild(clickOverlay)
      })
    }

    tryPlay()
  })
}

/**
 * 2026-06-14:在用户手势(「进入游戏」click)的**同步栈**调用,muted play 一个 `<video>` 解锁本
 * session 的 video autoplay —— 之后开场 1.mp4 的 `play()` 不再被浏览器拒,不弹"点击屏幕开始"。
 * `video.play()` 需 transient activation(手势后短时内、同 task),故必须在 click handler 同步调用,
 * **不能**放到 `await` 之后(微任务,手势已过期)。muted 才允许无声 autoplay;成功后立即 pause 丢弃。
 * 失败静默(playAvi 自身仍有 click overlay 兜底,最坏退回现状,绝不更差)。默认用即将播放的 1.mp4 预热。
 */
export function warmUpVideoAutoplay(src = '/extracted/videos/1.mp4'): void {
  if (typeof document === 'undefined') return
  try {
    const v = document.createElement('video')
    v.src = src
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    void v
      .play()
      .then(() => {
        v.pause()
        v.remove()
      })
      .catch(() => {
        v.remove()
      })
  } catch {
    /* ignore */
  }
}
