/** GLM Wave I / I06 — avi-player.ts autoplay 拒绝降级与预热未证公开合同(生产冻结 ced193f4)。
 *
 * 旧证去重:avi-player.test.ts 已证 <video> 创建 / 三跳过键 / 非跳过键 / error 事件 resolve /
 * cleanup 幂等 / 视频音量四合同。本文件补零覆盖的"不可用降级"边界:
 *  - play() 被 autoplay policy 拒绝 → 追加「点击屏幕开始」overlay;点击 overlay 重试成功 →
 *    overlay 摘除、视频保留;之后 ended 正常 cleanup。
 *  - warmUpVideoAutoplay(main.ts:52 真实 caller,创建游离 <video>):成功 → 对同一元素
 *    play 后 pause(解锁后丢弃);失败 → 静默不抛、不 pause。
 * HTMLMediaElement.prototype.play/pause 为 jsdom 缺省缺席的浏览器端口替身(旧测同法)。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playAvi, warmUpVideoAutoplay } from './avi-player.js'

const OVERLAY_TEXT = '点击屏幕开始 / Click to start'

/** 端口替身:play 首调可拒;捕获被 play 的元素与其 muted 态。 */
function stubVideoElement(rejectFirst: boolean): { played: HTMLVideoElement[] } {
  const played: HTMLVideoElement[] = []
  const impl = function (this: HTMLVideoElement): Promise<void> {
    played.push(this)
    if (rejectFirst && played.length === 1) {
      return Promise.reject(new Error('NotAllowedError: play() failed (autoplay policy)'))
    }
    return Promise.resolve()
  }
  HTMLMediaElement.prototype.play = vi.fn(impl)
  HTMLMediaElement.prototype.pause = vi.fn()
  return { played }
}

// 宏任务 flush:清空全部微任务(play() rejection → overlay 追加 / 重试 → overlay 摘除)。
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

beforeEach(() => {
  stubVideoElement(false)
})

afterEach(() => {
  document.body.querySelectorAll('video').forEach((v) => v.remove())
  document.querySelectorAll('div').forEach((d) => {
    if (d.textContent === OVERLAY_TEXT) d.remove()
  })
  vi.restoreAllMocks()
})

describe('playAvi autoplay 拒绝 → click-to-start 降级边界', () => {
  it('play() 拒绝 → overlay 出现;点击 overlay 重试成功 → overlay 摘除、视频保留;ended → 清理', async () => {
    const { played } = stubVideoElement(true)
    const p = playAvi({ src: '/extracted/videos/1.mp4' })
    await flushMicrotasks()

    const overlay = [...document.querySelectorAll('div')].find(
      (d) => d.textContent === OVERLAY_TEXT,
    )
    expect(overlay).toBeDefined()
    const video = document.body.querySelector('video')
    expect(video).not.toBeNull()
    expect(played).toEqual([video])

    // 用户点击(真实 MouseEvent,非原生 .click())→ 重试 play() → 成功 → overlay 摘除。
    overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushMicrotasks()
    expect(
      [...document.querySelectorAll('div')].find((d) => d.textContent === OVERLAY_TEXT),
    ).toBeUndefined()
    expect(document.body.querySelector('video')).not.toBeNull()
    expect(played).toHaveLength(2)

    document.body.querySelector('video')?.dispatchEvent(new Event('ended'))
    await p
    expect(document.body.querySelector('video')).toBeNull()
  })
})

describe('warmUpVideoAutoplay(main.ts onEnter click 同步栈调用)', () => {
  it('play() 成功 → 同一 muted 元素被 pause(解锁后丢弃),全程不抛错', async () => {
    const { played } = stubVideoElement(false)
    expect(() => warmUpVideoAutoplay('/extracted/videos/1.mp4')).not.toThrow()
    expect(played).toHaveLength(1)
    expect(played[0]?.muted).toBe(true)
    expect(played[0]?.src).toContain('/extracted/videos/1.mp4')

    await flushMicrotasks()
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1)
  })

  it('play() 拒绝 → 静默不抛、不 pause(最坏退回 playAvi overlay 兜底)', async () => {
    const { played } = stubVideoElement(true)
    expect(() => warmUpVideoAutoplay('/extracted/videos/1.mp4')).not.toThrow()

    await flushMicrotasks()
    expect(played).toHaveLength(1)
    expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled()
  })
})
