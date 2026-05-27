import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playAvi } from './avi-player.js'

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
    document.body.querySelectorAll('video').forEach((v) => v.remove())
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
    void p.then(() => { resolved = true })
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
