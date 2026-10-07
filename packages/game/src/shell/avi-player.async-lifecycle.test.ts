/** TEST-GAME-MEDIA-LIFECYCLE-1 — avi-player.ts 迟到结果与跨视频资源所有权未证公开合同(产品冻结 2f0fe6d2f)。
 *
 * 旧证去重(逐断言核对,非标题搜索):
 *  - avi-player.test.ts 已证 <video> 创建/三跳过键/非跳过键/error 事件 resolve/cleanup 幂等/
 *    视频音量四合同(套用/实时刷新/钳制/cleanup 解除跟踪)。
 *  - avi-player.glm-next-wave.test.ts 已证 play() 拒绝→overlay→点击重试成功→ended 清理(重试结果
 *    **早于** ended),warm-up 立即 resolve(pause 一次)/立即 reject(静默不 pause)。
 *  - ending-avi-host.grok-r1.test.ts G10-D04 已证跳过后 499ms 仍在/500ms 移除(单键单视频时序)。
 * 本文件只补上列未覆盖的迟到与跨视频边界(M1/M2/M4/M5/M8,逐轴见 docs/ops/evidence/TEST-GAME-MEDIA-LIFECYCLE-1):
 *  - M1 视频已 ended 收尾后原 play() Promise 才 reject → 不重建重试层、不再次播放。
 *  - M2 重试 play() 结果迟于 ended → 收尾自行退休重试层,迟到结果不重建 overlay、也不再播放。
 *  - M4 跳过 500ms 收尾窗口内的重复跳过键与 ended 只完成一次;残留定时器不触及下一段顺序视频
 *    (bootstrap.ts:980/1751/1847 的顺序 await 模式)。
 *  - M5 前段视频的迟到 play() reject 不抢下段视频的音量(curVideoEl)与 DOM 所有权。
 *  - M8 warm-up play() resolve 迟到 → 只清理自己的临时 video,不触及正式播放的 video(main.ts:52 caller)。
 * IO 控制(A-R1-02):play/pause 用 typed `vi.spyOn` 原型端口(restoreAllMocks 恢复真实 jsdom 实现,
 * 不做裸赋值);deferred 登记 + afterEach 双路径收尾——正常路径用例自 settle,提前断言失败路径由
 * afterEach 经公开事件(ended)收妥在途播放器、settle 残留 deferred、排空 fake timers 后再恢复端口。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playAvi, setVideoVolume, warmUpVideoAutoplay } from './avi-player.js'

const OVERLAY_TEXT = '点击屏幕开始 / Click to start'

interface Deferred {
  promise: Promise<void>
  resolve: () => void
  reject: (reason?: unknown) => void
  settled: boolean
}

/** 本用例创建、尚未 settle 的测试受控 deferred(afterEach 兜底收妥,不留悬挂 promise)。 */
const openDeferreds: Deferred[] = []

function createDeferred(): Deferred {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  const deferred: Deferred = {
    promise,
    settled: false,
    resolve: () => {
      deferred.settled = true
      resolve()
    },
    reject: (reason?: unknown) => {
      deferred.settled = true
      reject(reason)
    },
  }
  openDeferreds.push(deferred)
  return deferred
}

interface PlayPort {
  /** 每次 play() 的调用目标元素(区分 warm-up 临时 video 与正式播放 video)。 */
  played: HTMLMediaElement[]
  /** 每次 pause() 的调用目标元素。 */
  paused: HTMLMediaElement[]
}

function installPort(promiseFor: (callIndex: number) => Promise<void>): PlayPort {
  const port: PlayPort = { played: [], paused: [] }
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    port.played.push(this)
    return promiseFor(port.played.length)
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    port.paused.push(this)
  })
  return port
}

/** 首次 play() 挂测试受控 deferred(autoplay 决议迟到),后续调用立即 resolve。 */
function stubFirstPlayDeferred(): PlayPort & { firstPlay: Deferred } {
  const firstPlay = createDeferred()
  const port = installPort((callIndex) => (callIndex === 1 ? firstPlay.promise : Promise.resolve()))
  return { ...port, firstPlay }
}

/** 首次 play() 立即拒绝(触发 overlay),第二次(点击重试)挂测试受控 deferred。 */
function stubRejectThenDeferred(): PlayPort & { secondPlay: Deferred } {
  const secondPlay = createDeferred()
  const port = installPort((callIndex) => {
    if (callIndex === 1) {
      return Promise.reject(new Error('NotAllowedError: play() rejected (autoplay policy)'))
    }
    return callIndex === 2 ? secondPlay.promise : Promise.resolve()
  })
  return { ...port, secondPlay }
}

/** play() 全部立即 resolve(窗口时序类用例,只控制时间)。 */
function stubPlayResolved(): PlayPort {
  return installPort(() => Promise.resolve())
}

function overlayCount(): number {
  return [...document.querySelectorAll('div')].filter((d) => d.textContent === OVERLAY_TEXT).length
}

function currentVideo(): HTMLVideoElement {
  const video = document.body.querySelector('video')
  if (!video) throw new Error('test setup: video element missing')
  return video
}

/** 两轮微任务:清空 reject→catch→DOM 追加等 promise 链(fake timers 下同样有效)。 */
async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve)
  })
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve)
  })
}

beforeEach(() => {
  setVideoVolume(1) // 复位模块级音量,避免测序依赖
})

afterEach(async () => {
  // 双路径收尾(A-R1-02):正常路径各用例已自行 settle,以下对空集是 no-op;
  // 提前断言失败时经公开事件收妥本次播放器 → settle 残留 deferred → 排空计时器,
  // 最后才恢复端口原型与 DOM,保证不悬挂监听/在途 Promise/定时器。
  for (const video of [...document.body.querySelectorAll('video')]) {
    video.dispatchEvent(new Event('ended'))
  }
  await flushMicrotasks()
  for (const deferred of openDeferreds) {
    if (!deferred.settled) deferred.reject(new Error('test teardown: unfinished deferred play'))
  }
  await flushMicrotasks()
  if (vi.isFakeTimers()) await vi.runAllTimersAsync()
  vi.useRealTimers()
  document.body.querySelectorAll('video').forEach((v) => {
    v.remove()
  })
  document.querySelectorAll('div').forEach((d) => {
    if (d.textContent === OVERLAY_TEXT) d.remove()
  })
  openDeferreds.length = 0
  vi.restoreAllMocks()
})

describe('avi-player 迟到结果与跨视频所有权 TEST-GAME-MEDIA-LIFECYCLE-1', () => {
  it('M1 视频已 ended 收尾后原 play() 才 reject — 不重建重试层、不再次播放', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const port = stubFirstPlayDeferred()

    const finished = playAvi({ src: '/extracted/videos/3.mp4' })
    const video = currentVideo()
    video.dispatchEvent(new Event('ended'))
    await finished // settled 收尾已完成:监听移除、元素移除、curVideoEl 解除

    port.firstPlay.reject(new Error('NotAllowedError: late rejection after ended'))
    await flushMicrotasks()

    expect(port.played, 'M1: settled 后迟到 reject 不得再次发起 play()').toHaveLength(1)
    expect(overlayCount(), 'M1: settled 后迟到 reject 不得重建点击重试层').toBe(0)
    expect(document.querySelectorAll('video'), 'M1: 收尾结果保持不变').toHaveLength(0)
  })

  it('M2 重试 play 结果迟于 ended — 收尾自行退休重试层,迟到结果不重建 overlay 也不再播放', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const port = stubRejectThenDeferred()

    const finished = playAvi({ src: '/extracted/videos/1.mp4' })
    const video = currentVideo()
    await flushMicrotasks() // 首次 play 拒绝 → overlay 已挂
    expect(overlayCount()).toBe(1)

    const overlay = [...document.querySelectorAll('div')].find(
      (d) => d.textContent === OVERLAY_TEXT,
    )
    overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true })) // 真实 click 重试
    expect(port.played).toHaveLength(2) // 重试 play() 已发出,结果未定

    video.dispatchEvent(new Event('ended')) // 视频先于重试结果结束
    await finished
    expect(overlayCount(), 'M2: ended 收尾必须移除点击重试层').toBe(0)

    port.secondPlay.resolve() // 迟到的重试成功结果
    await flushMicrotasks()
    expect(overlayCount(), 'M2: 迟到重试结果不得重建 overlay').toBe(0)
    expect(port.played, 'M2: 迟到重试结果不得再次播放').toHaveLength(2)
    expect(document.querySelectorAll('video')).toHaveLength(0)
  })

  it('M4 跳过 500ms 收尾窗口内的重复跳过键与 ended 只完成一次,残留定时器不触及下一段顺序视频', async () => {
    vi.useFakeTimers()
    const port = stubPlayResolved()

    const first = playAvi({ src: '/extracted/videos/1.mp4' })
    const video1 = currentVideo()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })) // 窗口内重复跳过键
    video1.dispatchEvent(new Event('ended')) // 窗口内自然结束

    let firstSettled = false
    void first.then(() => {
      firstSettled = true
    })
    await flushMicrotasks()
    expect(firstSettled, 'M4: 窗口内 ended 立即收尾,不等待定时器').toBe(true)

    // bootstrap 顺序 await 模式:第一段收尾后才开始第二段
    const second = playAvi({ src: '/extracted/videos/2.mp4' })
    const video2 = currentVideo()
    expect(video2).not.toBe(video1)

    await vi.advanceTimersByTimeAsync(500) // 跳过定时器(含重复键的第二个)在第二段播放中触发
    expect(
      port.paused.filter((el) => el === video1),
      'M4: 收尾清理只执行一次(重复键定时器不得重复 pause)',
    ).toHaveLength(1)
    expect(
      port.paused.some((el) => el === video2),
      'M4: 残留定时器不得触及下一段视频',
    ).toBe(false)
    expect(document.querySelectorAll('video'), 'M4: 下一段视频仍在播放').toHaveLength(1)

    let secondSettled = false
    void second.then(() => {
      secondSettled = true
    })
    await vi.advanceTimersByTimeAsync(5000) // 长窗推进:无任何遗留定时器再改变状态
    expect(secondSettled, 'M4: 残留定时器不得提前结束下一段视频').toBe(false)
    expect(document.querySelectorAll('video')).toHaveLength(1)

    video2.dispatchEvent(new Event('ended'))
    await second
  })

  it('M5 前段视频的迟到 play() reject 不抢下段视频的音量与 DOM 所有权', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const port = stubFirstPlayDeferred()

    const first = playAvi({ src: '/extracted/videos/1.mp4' })
    const video1 = currentVideo()
    video1.dispatchEvent(new Event('ended'))
    await first

    const second = playAvi({ src: '/extracted/videos/2.mp4' })
    const video2 = currentVideo()
    setVideoVolume(0.4)
    expect(video2.volume, 'M5: 下一段视频是当前音量所有者').toBe(0.4)

    port.firstPlay.reject(new Error('NotAllowedError: late rejection from previous video'))
    await flushMicrotasks()
    expect(document.querySelectorAll('video'), 'M5: 迟到结果不得增删视频层').toHaveLength(1)
    expect(video2.volume, 'M5: 迟到结果不得重置当前所有者音量').toBe(0.4)
    expect(video1.volume, 'M5: 前段已移除元素不再被触及').toBe(1)
    expect(port.played, 'M5: 迟到结果不得再次播放').toHaveLength(2)

    video2.dispatchEvent(new Event('ended'))
    await second
  })

  it('M8 warm-up play() resolve 迟到 — 只清理自己的临时 video,不触及正式播放的 video', async () => {
    const port = stubFirstPlayDeferred()

    warmUpVideoAutoplay('/extracted/videos/1.mp4') // play#1 → deferred(决议迟到)
    expect(port.played).toHaveLength(1)
    const warmupEl = port.played[0]
    if (!warmupEl) throw new Error('test setup: warm-up video missing')

    const formal = playAvi({ src: '/extracted/videos/1.mp4' }) // play#2 → resolved,正式播放
    const formalEl = currentVideo()
    expect(formalEl).not.toBe(warmupEl)
    expect(document.body.querySelectorAll('video')).toHaveLength(1) // warm-up 临时 video 从未入 DOM

    port.firstPlay.resolve() // warm-up 迟到成功(main.ts:52 的手势预热晚于正式播放)
    await flushMicrotasks()
    expect(port.paused, 'M8: 迟到 resolve 只 pause warm-up 自己的临时 video').toEqual([warmupEl])
    expect(document.body.querySelectorAll('video'), 'M8: 正式播放的 video 不得被移除').toHaveLength(
      1,
    )

    let formalSettled = false
    void formal.then(() => {
      formalSettled = true
    })
    await flushMicrotasks()
    expect(formalSettled, 'M8: 正式播放不得被 warm-up 迟到结果打断').toBe(false)

    formalEl.dispatchEvent(new Event('ended'))
    await formal
  })
})
