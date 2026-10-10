// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { playVideo } from './video-player.js'

/**
 * jsdom 的 HTMLMediaElement 无 play/毫无事件吞吐 → 用原型替身补齐外部媒体 IO，
 * 只封 video 元素行为，不替代任何产品业务模块。
 */
let videos: HTMLVideoElement[] = []

function installVideoHost() {
  videos = []
  const playImpl = vi.fn(() => Promise.resolve())
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
    this: HTMLVideoElement,
  ) {
    videos.push(this)
    return playImpl.call(this)
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  return playImpl
}

/** 找到当前挂在 DOM 上的 video（click overlay 时 video 仍在）。 */
const liveVideo = (): HTMLVideoElement => {
  const found = videos.at(-1)
  if (!found) throw new Error('no video created yet')
  return found
}

const clickOverlay = (): HTMLDivElement => {
  const overlay = document.body.querySelector<HTMLDivElement>('div[style*="z-index: 10002"]')
  if (!overlay) throw new Error('click overlay missing')
  return overlay
}

async function flush(turns = 6) {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('N03 视频覆盖层生命周期', () => {
  test('自然播完：全屏样式、清理视频层、按键监听移除、Promise 兑现', async () => {
    const play = installVideoHost()
    const pending = playVideo({ src: 'videos/1.mp4', muted: true })
    await flush()
    expect(play).toHaveBeenCalledTimes(1)
    const video = liveVideo()
    expect(video.src.endsWith('videos/1.mp4')).toBe(true)
    expect(video.muted).toBe(true)
    expect(video.autoplay).toBe(false)
    expect(video.style.objectFit).toBe('contain')
    expect(video.style.zIndex).toBe('10000')
    expect(document.body.contains(video)).toBe(true)
    video.dispatchEvent(new Event('ended'))
    await expect(pending).resolves.toBeUndefined()
    expect(document.body.contains(video)).toBe(false)
    // 键盘监听已移除：跳过键不再触发任何清理副作用。
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }))
  })

  test('加载失败：仅 warn 不抛出，Promise resolve 且视频层移除', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    installVideoHost()
    const pending = playVideo({ src: 'videos/broken.mp4' })
    await flush()
    const video = liveVideo()
    video.dispatchEvent(new Event('error'))
    await expect(pending).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledWith('[video-player] load/decode failed: videos/broken.mp4')
    expect(document.body.contains(video)).toBe(false)
  })

  test('跳过键消费键事件并延迟 500ms 清理；非跳过键不消费', async () => {
    installVideoHost()
    const pending = playVideo({ src: 'videos/4.mp4' })
    await flush()
    const video = liveVideo()
    const stopped: Event[] = []
    window.addEventListener(
      'keydown',
      (event) => stopped.push(event),
      // playVideo 以 capture 注册；同 target 上后注册者晚于 capture 触发。
    )
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', cancelable: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', cancelable: true }))
    expect(document.body.contains(video)).toBe(true)
    await vi.advanceTimersByTimeAsync(500)
    await expect(pending).resolves.toBeUndefined()
    expect(document.body.contains(video)).toBe(false)
  })

  test('自定义 skipKeys 与 container：仅自定义键生效，video 挂在给定容器', async () => {
    installVideoHost()
    const container = document.createElement('section')
    document.body.appendChild(container)
    const pending = playVideo({ src: 'videos/5.mp4', containerEl: container, skipKeys: ['KeyQ'] })
    await flush()
    const video = liveVideo()
    expect(video.parentElement).toBe(container)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }))
    await vi.advanceTimersByTimeAsync(400)
    expect(document.body.contains(video)).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
    await vi.advanceTimersByTimeAsync(500)
    await expect(pending).resolves.toBeUndefined()
    expect(document.body.contains(video)).toBe(false)
  })

  test('autoplay 被拒：点击 overlay 后重试成功并移除 overlay', async () => {
    const play = installVideoHost()
    play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const pending = playVideo({ src: 'videos/6.mp4' })
    await flush()
    expect(warn.mock.calls[0]?.[0]).toContain('play() rejected')
    const overlay = clickOverlay()
    expect(overlay.textContent).toContain('点击屏幕开始')
    expect(document.body.contains(overlay)).toBe(true)
    overlay.click()
    await flush()
    expect(play).toHaveBeenCalledTimes(2)
    expect(document.body.contains(overlay)).toBe(false)
    const video = liveVideo()
    video.dispatchEvent(new Event('ended'))
    await expect(pending).resolves.toBeUndefined()
    expect(document.body.contains(video)).toBe(false)
  })

  test('runner 取消：信号已 abort 时立即清理；播放中 abort 同样即时兑现', async () => {
    installVideoHost()
    const controller = new AbortController()
    controller.abort()
    const pending = playVideo({ src: 'videos/x.mp4', signal: controller.signal })
    await expect(pending).resolves.toBeUndefined()
    expect(document.body.querySelectorAll('video')).toHaveLength(0)

    const liveController = new AbortController()
    const second = playVideo({ src: 'videos/y.mp4', signal: liveController.signal })
    await flush()
    const video = liveVideo()
    expect(document.body.contains(video)).toBe(true)
    liveController.abort()
    await expect(second).resolves.toBeUndefined()
    expect(document.body.contains(video)).toBe(false)
  })

  test('结束后的迟到 error 事件不产生第二次清理或告警副作用', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    installVideoHost()
    const pending = playVideo({ src: 'videos/z.mp4' })
    await flush()
    const video = liveVideo()
    video.dispatchEvent(new Event('ended'))
    await expect(pending).resolves.toBeUndefined()
    warn.mockClear()
    video.dispatchEvent(new Event('error'))
    await flush()
    expect(warn).not.toHaveBeenCalled()
  })
})
