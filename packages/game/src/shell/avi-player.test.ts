import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playAvi, setVideoVolume } from './avi-player.js'

// jsdom 默认无 HTMLMediaElement.prototype.play/pause 实现,做 stub
function stubVideoElement(): void {
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
  HTMLMediaElement.prototype.pause = vi.fn()
}

describe('playAvi — sdlpal PAL_PlayAVI 等价 (M5.6 T18 Step 3)', () => {
  beforeEach(() => {
    stubVideoElement()
  })

  afterEach(() => {
    // 清残余 video element
    document.body.querySelectorAll('video').forEach((v) => {
      v.remove()
    })
  })

  it('返回 Promise + 创 <video> 元素 + src 正确', async () => {
    const p = playAvi({ src: '/extracted/videos/3.mp4' })
    const video = document.body.querySelector('video') as HTMLVideoElement
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
    const p = playAvi({ src: '/extracted/videos/2.mp4' })
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }))
    // promise 未 resolve
    let resolved = false
    void p.then(() => {
      resolved = true
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(resolved).toBe(false)
    // cleanup
    document.body.querySelector('video')?.dispatchEvent(new Event('ended'))
    await p
  })

  it('自定义 skipKeys 覆盖默认', async () => {
    const p = playAvi({ src: '/extracted/videos/2.mp4', skipKeys: ['KeyQ'] })
    // 默认的 Space 不再跳过
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await new Promise((r) => setTimeout(r, 10))
    expect(document.body.querySelector('video')).not.toBeNull()
    // KeyQ 触发跳过
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
    await p
    expect(document.body.querySelector('video')).toBeNull()
  })

  it('video error 事件触发 → Promise 仍 resolve(不抛)', async () => {
    const p = playAvi({ src: '/extracted/videos/nonexistent.mp4' })
    const video = document.body.querySelector('video') as HTMLVideoElement
    video.dispatchEvent(new Event('error'))
    await p
    expect(document.body.querySelector('video')).toBeNull()
  })

  it('多次 cleanup 调用 idempotent(settled flag 防双重 resolve)', async () => {
    const p = playAvi({ src: '/extracted/videos/1.mp4' })
    const video = document.body.querySelector('video') as HTMLVideoElement
    video.dispatchEvent(new Event('ended'))
    video.dispatchEvent(new Event('ended')) // 重复
    await p
    expect(document.body.querySelectorAll('video').length).toBe(0)
  })
})

describe('playAvi — 视频音量(工具面板「视频」滑块 / 主静音)', () => {
  beforeEach(() => {
    stubVideoElement()
    setVideoVolume(1) // 复位模块级音量,避免测序依赖
  })
  afterEach(() => {
    document.body.querySelectorAll('video').forEach((v) => {
      v.remove()
    })
  })

  it('playAvi 建 <video> 时套用当前 videoVolume', async () => {
    setVideoVolume(0.5)
    const p = playAvi({ src: '/extracted/videos/3.mp4' })
    const video = document.body.querySelector('video') as HTMLVideoElement
    expect(video.volume).toBe(0.5)
    video.dispatchEvent(new Event('ended'))
    await p
  })

  it('setVideoVolume 实时刷新正在播放的 video.volume', async () => {
    const p = playAvi({ src: '/extracted/videos/3.mp4' })
    const video = document.body.querySelector('video') as HTMLVideoElement
    setVideoVolume(0.2)
    expect(video.volume).toBe(0.2)
    video.dispatchEvent(new Event('ended'))
    await p
  })

  it('setVideoVolume 钳制到 0..1', async () => {
    setVideoVolume(2)
    const p = playAvi({ src: '/extracted/videos/3.mp4' })
    const video = document.body.querySelector('video') as HTMLVideoElement
    expect(video.volume).toBe(1)
    setVideoVolume(-1)
    expect(video.volume).toBe(0)
    video.dispatchEvent(new Event('ended'))
    await p
  })

  it('cleanup 后解除 curVideoEl 跟踪:后续 setVideoVolume 不再改已移除元素', async () => {
    const p = playAvi({ src: '/extracted/videos/3.mp4' })
    const video = document.body.querySelector('video') as HTMLVideoElement
    video.dispatchEvent(new Event('ended'))
    await p
    setVideoVolume(0.3) // 视频已结束 → 不应触及旧元素
    expect(video.volume).toBe(1) // 仍是创建时的值(beforeEach 复位 1)
  })
})
