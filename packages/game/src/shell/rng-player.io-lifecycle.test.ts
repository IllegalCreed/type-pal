/** TEST-GAME-MEDIA-LIFECYCLE-1 — rng-player.ts 跨 chunk 缓存隔离与乱序部分失败收尾(产品冻结 2f0fe6d2f)。
 *
 * 旧证去重(逐断言核对,非标题搜索):
 *  - rng-player.test.ts 已证全帧播放/跳过键/manifest 缺 chunk/start>end/单帧失败 skip(按序 settle)/
 *    shake 递减与跳过结清/initialFadeInMs/同 chunk 并发只加载一次(成功路径去重)。
 *  - rng-player.glm-next-wave.test.ts 已证 startFrame/endFrame 窗口=实际请求集合,同 chunk
 *    失败驱逐后重试(第二次播放重新加载并成功)。
 *  - rng-window.grok-r1.test.ts 已证默认不可跳/负 endFrame/单帧窗口/零淡入像素/默认加载地址与错误文本。
 * 本文件只补上列未覆盖的 IO 边界(M6/M7,逐轴见 docs/ops/evidence/TEST-GAME-MEDIA-LIFECYCLE-1):
 *  - M6 不同 chunk 不共享失败:chunk A 加载失败不得驱逐 chunk B 的成功缓存(复播 B 不重载),帧数据不串。
 *  - M7 成功帧乱序迟到 + 中间帧失败:成功帧按 manifest 顺序显示、末屏为最后成功帧,
 *    且结束后归还输入监听(跳过键不再被消费)。
 * IO 控制(A-R1-01):2D context 用 jsdom+canvas 的真实 `canvas.getContext('2d')`(非空检查),
 * putImageData 用 typed `vi.spyOn` 记录并**转发真实绘制**——不造 Object.create 原型伪装实例、
 * 不强转调用参数;__setRngChunkLoaderForTest 是模块声明的测试端口;fetchManifest/fetchFrame 是
 * PlayRngOptions 声明的注入端口;不 mock 解码业务。
 */

import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { __setRngChunkLoaderForTest, playRng } from './rng-player.js'

/** colors[i] = [i,0,0]:flushToCanvas 后 ImageData 首像素 R 通道 = 调色板索引,可直接读帧序。 */
const palette: Palette = {
  colors: Array.from({ length: 256 }, (_, i) => [i, 0, 0] as [number, number, number]),
  cycles: [],
}

function rngFrame(fill: number): IndexedImage {
  return {
    width: 320,
    height: 200,
    indices: new Uint8Array(320 * 200).fill(fill),
    opaque: new Uint8Array(320 * 200).fill(1),
  }
}

/** 真实 2D context(jsdom + canvas 包);缺失即测试环境不合格,fail loud 不伪装。 */
function realCtx(): CanvasRenderingContext2D {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) throw new Error('test setup: 2D context unavailable')
  return ctx
}

interface DeferredFrame {
  promise: Promise<IndexedImage>
  resolve: (frame: IndexedImage) => void
}

function createDeferredFrame(): DeferredFrame {
  let resolve!: (frame: IndexedImage) => void
  const promise = new Promise<IndexedImage>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

/** 两轮微任务:让 playRng 走过 manifest await、挂好全部帧 Promise。 */
async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve)
  })
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve)
  })
}

afterEach(() => {
  __setRngChunkLoaderForTest(null)
  vi.restoreAllMocks()
})

describe('rng-player IO 生命周期 TEST-GAME-MEDIA-LIFECYCLE-1', () => {
  it('M6 chunk A 加载失败不驱逐 chunk B 成功缓存 — 复播 B 不重载、帧数据不串', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const loads: number[] = []
    __setRngChunkLoaderForTest((chunkIdx) => {
      loads.push(chunkIdx)
      if (chunkIdx === 5) return Promise.reject(new Error('transient chunk 5 io failure'))
      return Promise.resolve(new Map([[0, rngFrame(42)]]))
    })
    const manifest = {
      chunks: [
        { chunkIndex: 5, frameCount: 1, frames: [{ index: 0 }] },
        { chunkIndex: 6, frameCount: 1, frames: [{ index: 0 }] },
      ],
    }
    const baseOptions = {
      frameDelayMs: 0,
      canvasCtx: realCtx(),
      palette,
      fetchManifest: () => Promise.resolve(manifest),
    }

    const fbB1 = createFramebuffer()
    await playRng({ ...baseOptions, chunkIdx: 6, fb: fbB1 })
    expect(fbB1.indices[0], 'M6: chunk B 帧数据正确').toBe(42)

    const fbA = createFramebuffer()
    await playRng({ ...baseOptions, chunkIdx: 5, fb: fbA }) // chunk A 真实加载失败
    expect(
      fbA.indices.every((v) => v === 0),
      'M6: 失败 chunk 不显帧',
    ).toBe(true)

    const fbB2 = createFramebuffer()
    await playRng({ ...baseOptions, chunkIdx: 6, fb: fbB2 })
    expect(
      loads.filter((c) => c === 6),
      'M6: chunk A 失败不得驱逐 chunk B 的成功缓存(复播 B 不重载)',
    ).toHaveLength(1)
    expect(fbB2.indices[0], 'M6: 复播 B 仍显示同一帧').toBe(42)
  })

  it('M7 成功帧乱序迟到 + 中间帧失败 — 顺序保持、末屏为最后成功帧、结束后归还输入监听', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const manifest = {
      chunks: [
        { chunkIndex: 9, frameCount: 3, frames: [{ index: 0 }, { index: 1 }, { index: 2 }] },
      ],
    }
    const frame0 = createDeferredFrame()
    const frame2 = createDeferredFrame()
    const fetchFrame = vi.fn((chunkIdx: number, frameIdx: number): Promise<IndexedImage> => {
      if (chunkIdx !== 9) throw new Error(`unexpected chunk ${chunkIdx}`)
      if (frameIdx === 0) return frame0.promise
      if (frameIdx === 1) return Promise.reject(new Error('frame 1 io failure'))
      return frame2.promise
    })
    const ctx = realCtx()
    const putImageData = vi.spyOn(ctx, 'putImageData') // 记录参数并转发真实绘制
    const fb = createFramebuffer()

    const pending = playRng({
      chunkIdx: 9,
      frameDelayMs: 0,
      fb,
      canvasCtx: ctx,
      palette,
      skipKeys: ['Space'],
      fetchManifest: () => Promise.resolve(manifest),
      fetchFrame,
    })

    await flushMicrotasks()
    expect(fetchFrame).toHaveBeenCalledTimes(3) // 三个帧 Promise 均已挂起
    frame2.resolve(rngFrame(12)) // 末帧先到(乱序)
    await flushMicrotasks()
    frame0.resolve(rngFrame(10)) // 首帧迟到
    await pending

    const shown = putImageData.mock.calls.map((call) => call[0].data[0]) // 原生 ImageData,零强转
    expect(shown, 'M7: 成功帧按 manifest 顺序显示(0→2),失败帧跳过').toEqual([10, 12])
    expect(fb.indices[0], 'M7: 末屏为最后成功帧').toBe(12)

    // cancelable: true — 合成事件默认不可取消,preventDefault 无效会让本断言假绿
    const event = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented, 'M7: 结束后跳过键监听已归还(不再被消费)').toBe(false)
  })
})
