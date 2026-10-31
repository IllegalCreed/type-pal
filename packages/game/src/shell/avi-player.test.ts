import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playAvi, setVideoVolume } from './avi-player.js'

describe('AVI playback', () => {
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
  it('返回 Promise + 创 <video> 元素 + src 正确', async () => {
    const p = playAvi({ src: '/extracted/videos/3.mp4' })
    const video = activeVideo()
    expect(video).not.toBeNull()
    expect(video.src).toContain('/extracted/videos/3.mp4')
    expect(video.style.position).toBe('fixed')
    expect(video.style.objectFit).toBe('contain')

    // 模拟 ended → resolve
    video.dispatchEvent(new Event('ended'))
    await p
    // cleanup 后 element 应被移除
    expect(document.body.querySelector('video')).toBeNull()
  })
  it('Space 键跳过 → Promise resolve + element 移除', async () => {
    const p = playAvi({ src: '/extracted/videos/1.mp4' })
    expect(document.body.querySelector('video')).not.toBeNull()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await p
    expect(document.body.querySelector('video')).toBeNull()
  })
  it('Enter 键跳过', async () => {
    const p = playAvi({ src: '/extracted/videos/2.mp4' })
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
    await p
    expect(document.body.querySelector('video')).toBeNull()
  })
  it('Escape 键跳过', async () => {
    const p = playAvi({ src: '/extracted/videos/2.mp4' })
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }))
    await p
    expect(document.body.querySelector('video')).toBeNull()
  })
  it('非跳过键不触发(其他键 keydown 忽略)', async () => {
    vi.useFakeTimers()
    const p = playAvi({ src: '/extracted/videos/2.mp4' })
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }))
    // promise 未 resolve
    let resolved = false
    void p.then(() => {
      resolved = true
    })
    await vi.advanceTimersByTimeAsync(500)
    expect(resolved).toBe(false)
    // cleanup
    document.body.querySelector('video')?.dispatchEvent(new Event('ended'))
    await p
  })
  it('自定义 skipKeys 覆盖默认', async () => {
    vi.useFakeTimers()
    const p = playAvi({ src: '/extracted/videos/2.mp4', skipKeys: ['KeyQ'] })
    // 默认的 Space 不再跳过
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await vi.advanceTimersByTimeAsync(500)
    expect(document.body.querySelector('video')).not.toBeNull()
    // KeyQ 触发跳过
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
    await vi.advanceTimersByTimeAsync(500)
    await p
    expect(document.body.querySelector('video')).toBeNull()
  })
  it('video error 事件触发 → Promise 仍 resolve(不抛)', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const p = playAvi({ src: '/extracted/videos/nonexistent.mp4' })
    const video = activeVideo()
    video.dispatchEvent(new Event('error'))
    await p
    expect(document.body.querySelector('video')).toBeNull()
    expect(warning.mock.calls).toEqual([
      ['[avi-player] video load/decode failed: /extracted/videos/nonexistent.mp4'],
    ])
  })
  it('多次 cleanup 调用 idempotent(settled flag 防双重 resolve)', async () => {
    const pause = vi.mocked(HTMLMediaElement.prototype.pause)
    const p = playAvi({ src: '/extracted/videos/1.mp4' })
    const video = activeVideo()
    video.dispatchEvent(new Event('ended'))
    video.dispatchEvent(new Event('ended')) // 重复
    await p
    expect(document.body.querySelectorAll('video').length).toBe(0)
    expect(pause).toHaveBeenCalledTimes(1)
  })
})

describe('cutscene host boundaries', () => {
  afterEach(async () => {
    try {
      document.body
        .querySelectorAll('video')
        .forEach((video) => video.dispatchEvent(new Event('ended')))
      if (vi.isFakeTimers()) await vi.runAllTimersAsync()
    } finally {
      vi.restoreAllMocks()
      vi.useRealTimers()
    }
  })
  it('跳过 AVI 后 499 毫秒仍在，500 毫秒移除', async () => {
    vi.useFakeTimers()
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const pending = playAvi({ src: '/extracted/videos/3.mp4' })
    expect(document.body.querySelectorAll('video').length).toBe(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await vi.advanceTimersByTimeAsync(499)
    expect(document.body.querySelectorAll('video').length).toBe(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(document.body.querySelectorAll('video').length).toBe(0)
    await pending
  })
})
