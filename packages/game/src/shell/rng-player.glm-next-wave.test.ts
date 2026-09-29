/** GLM Wave I / I05 — rng-player.ts 帧窗口与失败缓存未证公开合同(生产冻结 ced193f4)。
 *
 * 旧证去重:rng-player.test.ts 已证全帧播放 / 跳过键 / manifest 缺 chunk / start>end /
 * 单帧失败 skip / shake 递减 / initialFadeInMs / 并发去重(成功路径)。
 * 本文件补:
 *  - startFrame/endFrame 窗口 = 实际 fetch + 显示帧集合(窗外帧零请求)。
 *  - chunk 加载失败不长期缓存失败 Promise(允许重试):第二次播放重新加载并成功;
 *    对照旧证的"成功路径并发去重",本文件证"失败驱逐"分支。
 * __setRngChunkLoaderForTest 是模块声明的测试端口;fetchManifest/fetchFrame 是 PlayRngOptions
 * 声明的注入端口,不 mock 被测核心。
 */

import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { __setRngChunkLoaderForTest, playRng } from './rng-player.js'

const palette: Palette = {
  colors: Array.from({ length: 256 }, () => [10, 20, 30] as [number, number, number]),
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

/** DOM 替身:原型链正确的 2D 上下文,只实现 flushToCanvas 声明的 putImageData 端口。 */
/** DOM 替身:原型取自环境自身 2D 上下文,只实现 flushToCanvas 声明的 putImageData 端口。 */
function ctxSpy(): CanvasRenderingContext2D {
  const probe = document.createElement('canvas').getContext('2d')
  const proto = probe ? Object.getPrototypeOf(probe) : Object.prototype
  return Object.assign(Object.create(proto), { putImageData: vi.fn() })
}

afterEach(() => {
  __setRngChunkLoaderForTest(null)
  vi.restoreAllMocks()
})

describe('playRng 帧窗口(startFrame/endFrame 决定实际请求与显示集合)', () => {
  it('窗口 [1,2]:fetchFrame 恰被调 2 次(frame 1、2),窗外帧 0/3 零请求,末屏 = frame 2', async () => {
    const manifest = {
      chunks: [
        {
          chunkIndex: 5,
          frameCount: 4,
          frames: [{ index: 0 }, { index: 1 }, { index: 2 }, { index: 3 }],
        },
      ],
    }
    const fetchManifest = vi.fn(() => Promise.resolve(manifest))
    const fetchFrame = vi.fn((_chunkIdx: number, frameIdx: number) =>
      Promise.resolve(rngFrame(10 + frameIdx)),
    )
    const fb = createFramebuffer()

    await playRng({
      chunkIdx: 5,
      frameDelayMs: 1,
      fb,
      canvasCtx: ctxSpy(),
      palette,
      startFrame: 1,
      endFrame: 2,
      fetchManifest,
      fetchFrame,
    })

    expect(fetchManifest).toHaveBeenCalledTimes(1)
    expect(fetchFrame.mock.calls.map((c) => c[1])).toEqual([1, 2])
    // 每窗帧整幅覆盖 fb → 末屏即窗口末帧(填 12 = 10 + frameIdx 2)。
    expect(fb.indices.every((v) => v === 12)).toBe(true)
  })
})

describe('playRng chunk 加载失败不长期缓存失败 Promise(允许重试)', () => {
  it('首次加载失败 → 0 帧静默 resolve;再次播放重新加载成功并显帧(加载器恰 2 次调用)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let loaderCalls = 0
    __setRngChunkLoaderForTest((_chunkIdx) => {
      loaderCalls++
      if (loaderCalls === 1) return Promise.reject(new Error('transient network failure'))
      return Promise.resolve(new Map([[0, rngFrame(21)]]))
    })
    const manifest = {
      chunks: [{ chunkIndex: 8, frameCount: 1, frames: [{ index: 0 }] }],
    }
    const fetchManifest = () => Promise.resolve(manifest)
    const fb1 = createFramebuffer()

    await playRng({
      chunkIdx: 8,
      frameDelayMs: 1,
      fb: fb1,
      canvasCtx: ctxSpy(),
      palette,
      fetchManifest,
    })
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('frame 0 fetch fail'),
      expect.anything(),
    )
    expect(fb1.indices.every((v) => v === 0)).toBe(true) // 未显任何帧

    const fb2 = createFramebuffer()
    await playRng({
      chunkIdx: 8,
      frameDelayMs: 1,
      fb: fb2,
      canvasCtx: ctxSpy(),
      palette,
      fetchManifest,
    })
    // 失败 Promise 已被驱逐:第二次播放真实重载(loaderCalls 2)并显示帧。
    expect(loaderCalls).toBe(2)
    expect(fb2.indices.every((v) => v === 21)).toBe(true)
  })
})
