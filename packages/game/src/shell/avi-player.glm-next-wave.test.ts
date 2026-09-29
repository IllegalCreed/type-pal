/** GLM Wave I / I06 — avi-player.ts autoplay 拒绝降级与预热未证公开合同(生产冻结 ced193f4)。
 *
 * 旧证去重:avi-player.test.ts 已证 <video> 创建 / 三跳过键 / 非跳过键 / error 事件 resolve /
 * cleanup 幂等 / 视频音量四合同。本文件补零覆盖的"不可用降级"边界:
 *  - play() 被 autoplay policy 拒绝 → 追加「点击屏幕开始」overlay;点击 overlay 重试成功 →
 *    overlay 摘除、视频保留;之后 ended 正常 cleanup。
 *  - warmUpVideoAutoplay(main.ts:52 真实 caller,创建游离 <video>):成功 → 对同一元素
 *    play 后 pause(解锁后丢弃);失败 → 静默不抛、不 pause。
 * 异步确定性:play 端口替身返回**测试受控的 deferred Promise**,由测试显式 settle;
 * 状态断言一律 `vi.waitFor` 条件等待(overlay 出现/摘除、pause 已调、rejection 链已执行),
 * 不用固定 sleep;每个用例 `finally` 兜底 settle 未决 deferred,不留悬挂 rejection。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playAvi, warmUpVideoAutoplay } from './avi-player.js'

const OVERLAY_TEXT = '点击屏幕开始 / Click to start'

interface DeferredPlay {
  promise: Promise<void>
  resolve: () => void
  reject: (reason: unknown) => void
  settled: boolean
}

/** 测试受控的 play 端口替身(deferred / resolved / rejected),记录被 play 的元素。 */
function stubPlay(mode: 'deferred' | 'resolved' | 'rejected'): {
  played: HTMLVideoElement[]
  deferred?: DeferredPlay
} {
  const played: HTMLVideoElement[] = []
  let deferred: DeferredPlay | undefined
  if (mode === 'deferred') {
    let resolve!: () => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<void>((res, rej) => {
      resolve = res
      reject = rej
    })
    deferred = {
      promise,
      resolve: () => {
        deferred!.settled = true
        resolve()
      },
      reject: (reason) => {
        deferred!.settled = true
        reject(reason)
      },
      settled: false,
    }
    HTMLMediaElement.prototype.play = vi.fn(function (this: HTMLVideoElement) {
      played.push(this)
      // 仅首次 play 挂测试受控 deferred(autoplay 拒绝);点击 overlay 后的 retry 走 resolved。
      return played.length === 1 ? deferred!.promise : Promise.resolve()
    })
  } else {
    HTMLMediaElement.prototype.play = vi.fn(function (this: HTMLVideoElement) {
      played.push(this)
      return mode === 'resolved'
        ? Promise.resolve()
        : Promise.reject(new Error('NotAllowedError: play() failed (autoplay policy)'))
    })
  }
  HTMLMediaElement.prototype.pause = vi.fn()
  return { played, deferred }
}

beforeEach(() => {
  stubPlay('resolved')
})

afterEach(() => {
  document.body.querySelectorAll('video').forEach((v) => v.remove())
  document.querySelectorAll('div').forEach((d) => {
    if (d.textContent === OVERLAY_TEXT) d.remove()
  })
  vi.restoreAllMocks()
})

describe('playAvi autoplay 拒绝 → click-to-start 降级边界', () => {
  it('play() 拒绝(显式 settle)→ overlay 出现;点击 overlay 重试成功 → overlay 摘除、视频保留;ended → 清理', async () => {
    const { played, deferred } = stubPlay('deferred')
    const d = deferred!
    try {
      const p = playAvi({ src: '/extracted/videos/1.mp4' })
      d.reject(new Error('NotAllowedError: play() failed (autoplay policy)'))

      // 条件等待:rejection 被 playAvi 消费后 overlay 才出现。
      await vi.waitFor(() => {
        expect(
          [...document.querySelectorAll('div')].some((d2) => d2.textContent === OVERLAY_TEXT),
        ).toBe(true)
      })
      const video = document.body.querySelector('video')
      expect(video).not.toBeNull()
      expect(played).toEqual([video])

      // 用户点击(真实 MouseEvent,非原生 .click())→ 重试 play()(后续 resolved)→ overlay 摘除。
      const overlay = [...document.querySelectorAll('div')].find(
        (d2) => d2.textContent === OVERLAY_TEXT,
      )
      overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await vi.waitFor(() => {
        expect(
          [...document.querySelectorAll('div')].some((d2) => d2.textContent === OVERLAY_TEXT),
        ).toBe(false)
      })
      expect(document.body.querySelector('video')).not.toBeNull()
      expect(played).toHaveLength(2)

      document.body.querySelector('video')?.dispatchEvent(new Event('ended'))
      await p
      expect(document.body.querySelector('video')).toBeNull()
    } finally {
      if (!d.settled) d.reject(new Error('teardown: unfinished deferred play'))
    }
  })
})

describe('warmUpVideoAutoplay(main.ts onEnter click 同步栈调用)', () => {
  it('play() 成功 → 同一 muted 元素被 pause(解锁后丢弃),全程不抛错', async () => {
    const { played } = stubPlay('resolved')
    expect(() => warmUpVideoAutoplay('/extracted/videos/1.mp4')).not.toThrow()
    expect(played).toHaveLength(1)
    expect(played[0]?.muted).toBe(true)
    expect(played[0]?.src).toContain('/extracted/videos/1.mp4')

    // 条件等待 pause 被调(play() resolve 之后的 .then 链)。
    await vi.waitFor(() => {
      expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1)
    })
  })

  it('play() 拒绝 → 静默不抛、不 pause(最坏退回 playAvi overlay 兜底)', async () => {
    let rejectionHandled = false
    const played: HTMLVideoElement[] = []
    HTMLMediaElement.prototype.play = vi.fn(function (this: HTMLVideoElement) {
      played.push(this)
      const p = Promise.reject(new Error('NotAllowedError: play() failed (autoplay policy)'))
      p.catch(() => {
        rejectionHandled = true
      })
      return p
    })
    HTMLMediaElement.prototype.pause = vi.fn()

    expect(() => warmUpVideoAutoplay('/extracted/videos/1.mp4')).not.toThrow()
    // 条件等待 rejection 链真实执行(handled 标记由微任务置位),随后核 pause 未被调。
    await vi.waitFor(() => {
      expect(rejectionHandled).toBe(true)
    })
    expect(played).toHaveLength(1)
    expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled()
  })
})
