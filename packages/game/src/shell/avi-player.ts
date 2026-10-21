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
 *  - skip keys Space/Enter/Escape被消费后延迟500ms收尾(aviplay.c:711,741-747)
 *  - autoplay policy 处理:Chrome/Safari 无 user gesture 时 play() reject,显示 "Click to start"
 *    overlay让用户点击后重试；后续播放仍服从浏览器autoplay策略
 *  - 不知 gs / suspendRaf — caller(bootstrap)用 try/finally 控制 raf loop 暂停
 */
import { listenForModalActions } from './input.js'

/**
 * 视频(mp4)主音量系数(0..1,默认 1=满音量,保持历史行为)。工具面板「视频」滑块 + 主静音驱动:
 * bootstrap 注入的 videoVolume controller 的 applyVolume → setVideoVolume(静音时 0)。
 * `curVideoEl` 跟踪当前播放的 `<video>`(模块级),滑块/静音改动即时刷新正在播的视频(对称 music-source.ts
 * 的 volume / backend);视频 cleanup 时解除跟踪,避免悬挂引用误改已移除元素。
 */
let videoVolume = 1
let curVideoEl: HTMLVideoElement | undefined

export function setVideoVolume(v: number): void {
  videoVolume = v < 0 ? 0 : v > 1 ? 1 : v
  if (curVideoEl) curVideoEl.volume = videoVolume
}

export interface PlayAviOptions {
  /** mp4 资源 URL,通常 `/extracted/videos/{N}.mp4`。 */
  src: string

  /** 容器元素,默认游戏stage(保留其上的虚拟键),无stage时用document.body。 */
  containerEl?: HTMLElement

  /**
   * 跳过键列表(`KeyboardEvent.code`),默认 `Space` / `Enter` / `Escape`,
   * 对应 sdlpal `kKeyMenu | kKeySearch`(aviplay.c:711)。
   */
  skipKeys?: string[]

  /** muted? 默认 false(AVI 有音轨)。某些场景需 true(eg. e2e auto-play test)。 */
  muted?: boolean
}

/**
 * 播 mp4 → Promise resolve 时机:`ended` 事件 / 跳过键 / 加载失败 / autoplay 拒绝 + user click overlay 后再尝试。
 *
 * 媒体error会warn并收尾；play()拒绝会warn并等待点击重试或跳过，不会因此立即resolve。
 */
export function playAvi(options: PlayAviOptions): Promise<void> {
  const container = options.containerEl ?? document.getElementById('tp-game-stage') ?? document.body
  const skipKeys = new Set(options.skipKeys ?? ['Space', 'Enter', 'Escape'])

  return new Promise<void>((resolve) => {
    const video = document.createElement('video')
    video.src = options.src
    video.muted = options.muted ?? false
    video.volume = videoVolume // 套用工具面板「视频」音量 / 主静音(静音时已被压到 0)
    curVideoEl = video // 模块级跟踪 → 播放中拖滑块/切静音即时刷新
    video.controls = false
    video.playsInline = true
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
      if (clickOverlay?.parentElement) {
        clickOverlay.parentElement.removeChild(clickOverlay)
      }
      clickOverlay = null
    }

    const cleanup = (): void => {
      if (settled) return
      settled = true
      window.removeEventListener('keydown', onKey, true)
      detachActions()
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
      try {
        video.pause()
      } catch {
        /* ignore */
      }
      if (curVideoEl === video) curVideoEl = undefined // 解除跟踪,后续 setVideoVolume 不再触及已移除元素
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
    const detachActions = listenForModalActions(skipKeys, () => {
      setTimeout(cleanup, 500)
    })

    container.appendChild(video)

    /**
     * 尝试 play();autoplay policy 拒绝时显示 click overlay,user click 后 retry。
     * 每次播放独立处理策略拒绝，不假设一次成功便永久获得autoplay权限。
     */
    const tryPlay = (): void => {
      void video
        .play()
        .then(() => {
          removeClickOverlay()
        })
        .catch((err: unknown) => {
          console.warn(`[avi-player] play() rejected (autoplay policy?): ${String(err)}`)
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
          clickOverlay.addEventListener(
            'click',
            () => {
              // 在本次用户手势中重试；失败仍由当前播放的策略处理。
              tryPlay()
            },
            { once: true },
          )
          container.appendChild(clickOverlay)
        })
    }

    tryPlay()
  })
}

/**
 * 2026-06-14:在用户手势(「进入游戏」click)的**同步栈**调用,muted play 一个 `<video>` 解锁本
 * session尝试预热视频。同步发起以利用当前手势；muted预热成功不保证后续有声播放被允许，
 * playAvi仍保留点击重试。成功后pause并丢弃，失败静默。默认预热即将播放的1.mp4。
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
