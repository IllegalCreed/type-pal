import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playAvi, setVideoVolume } from './avi-player.js'

describe('playAvi — 视频音量(工具面板「视频」滑块 / 主静音)', () => {
  // jsdom 默认无 HTMLMediaElement.prototype.play/pause 实现,做 stub
  function stubVideoElement(): void {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  }

  function activeVideo(): HTMLVideoElement {
    const video = document.body.querySelector('video')
    if (!video) throw new Error('Expected the active AVI element')
    return video
  }

  beforeEach(() => {
    stubVideoElement()
    setVideoVolume(1) // 复位模块级音量,避免测序依赖
  })

  afterEach(async () => {
    try {
      document.body
        .querySelectorAll('video')
        .forEach((video) => video.dispatchEvent(new Event('ended')))
      await Promise.resolve()
      if (vi.isFakeTimers()) await vi.runAllTimersAsync()
    } finally {
      setVideoVolume(1)
      document.body.querySelectorAll('video').forEach((video) => video.remove())
      vi.restoreAllMocks()
      vi.useRealTimers()
    }
  })
  it('playAvi 建 <video> 时套用当前 videoVolume', async () => {
    setVideoVolume(0.5)
    const p = playAvi({ src: '/extracted/videos/3.mp4' })
    const video = activeVideo()
    expect(video.volume).toBe(0.5)
    video.dispatchEvent(new Event('ended'))
    await p
  })
  it('setVideoVolume 实时刷新正在播放的 video.volume', async () => {
    const p = playAvi({ src: '/extracted/videos/3.mp4' })
    const video = activeVideo()
    setVideoVolume(0.2)
    expect(video.volume).toBe(0.2)
    video.dispatchEvent(new Event('ended'))
    await p
  })
  it('setVideoVolume 钳制到 0..1', async () => {
    setVideoVolume(2)
    const p = playAvi({ src: '/extracted/videos/3.mp4' })
    const video = activeVideo()
    expect(video.volume).toBe(1)
    setVideoVolume(-1)
    expect(video.volume).toBe(0)
    video.dispatchEvent(new Event('ended'))
    await p
  })
  it('cleanup 后解除 curVideoEl 跟踪:后续 setVideoVolume 不再改已移除元素', async () => {
    const p = playAvi({ src: '/extracted/videos/3.mp4' })
    const video = activeVideo()
    video.dispatchEvent(new Event('ended'))
    await p
    setVideoVolume(0.3) // 视频已结束 → 不应触及旧元素
    expect(video.volume).toBe(1) // 仍是创建时的值(beforeEach 复位 1)
  })
})
