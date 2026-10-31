import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/asset-fixtures.js'
import { realCanvasContext } from '../__tests__/canvas-host.js'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import {
  blackPalette,
  fetchSequentialFrame,
  fetchThreeFrameManifest,
  rngFrame,
  rngManifest,
} from './__tests__/rng-frames.js'
import { __setRngChunkLoaderForTest, playRng } from './rng-player.js'

afterEach(async () => {
  try {
    if (vi.isFakeTimers()) await vi.runAllTimersAsync()
  } finally {
    __setRngChunkLoaderForTest(null)
    vi.restoreAllMocks()
    vi.useRealTimers()
  }
})
describe('RNG frame playback', () => {
  it('全部帧播完 → fb.indices = 末帧填充', async () => {
    const fb = createFramebuffer()
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: realCanvasContext(),
      palette: blackPalette,
      fetchManifest: fetchThreeFrameManifest,
      fetchFrame: fetchSequentialFrame,
    })
    // 末帧 frameIdx=2 → indices 全填 3
    expect(fb.indices[0]).toBe(3)
    expect(fb.indices[100 * 320 + 100]).toBe(3)
    expect(fb.indices).toHaveLength(320 * 200)
    expect(fb.indices.findIndex((pixel) => pixel !== 3)).toBe(-1)
  })
  it('Space 按键跳过 → 不到末帧停', async () => {
    vi.useFakeTimers()
    try {
      const fb = createFramebuffer()
      const promise = playRng({
        chunkIdx: 6,
        frameDelayMs: 50,
        skipKeys: ['Space'],
        fb,
        canvasCtx: realCanvasContext(),
        palette: blackPalette,
        fetchManifest: fetchThreeFrameManifest,
        fetchFrame: fetchSequentialFrame,
      })
      await vi.advanceTimersByTimeAsync(0)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
      await vi.runAllTimersAsync()
      await promise
      expect(fb.indices[0]).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
  it('manifest 缺该 chunk → 警告 + return,不抛', async () => {
    const fb = createFramebuffer()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await playRng({
      chunkIdx: 999,
      frameDelayMs: 1,
      fb,
      canvasCtx: realCanvasContext(),
      palette: blackPalette,
      fetchManifest: fetchThreeFrameManifest,
      fetchFrame: fetchSequentialFrame,
    })
    expect(warn.mock.calls).toEqual([['[rng-player] chunk 999 不在 manifest']])
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })
  it('startFrame > endFrame → 立即 return 不播', async () => {
    const fb = createFramebuffer()
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: realCanvasContext(),
      palette: blackPalette,
      startFrame: 5,
      endFrame: 1,
      fetchManifest: fetchThreeFrameManifest,
      fetchFrame: fetchSequentialFrame,
    })
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })
  it('endFrame=-1 → 默认播到 frameCount-1', async () => {
    const fb = createFramebuffer()
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: realCanvasContext(),
      palette: blackPalette,
      endFrame: -1,
      fetchManifest: fetchThreeFrameManifest,
      fetchFrame: fetchSequentialFrame,
    })
    expect(fb.indices[0]).toBe(3)
  })
  it('manifest fetch throw → 警告 + return,不抛', async () => {
    const failure = new Error('mock fail')
    const fb = createFramebuffer()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: realCanvasContext(),
      palette: blackPalette,
      fetchManifest: async () => {
        throw failure
      },
      fetchFrame: fetchSequentialFrame,
    })
    expect(warn.mock.calls).toEqual([['[rng-player] manifest fetch failed:', failure]])
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })
  it('单帧 fetch throw → warn + skip 该帧 + 继续', async () => {
    const failure = new Error('mock frame 1 fail')
    const fb = createFramebuffer()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: realCanvasContext(),
      palette: blackPalette,
      fetchManifest: fetchThreeFrameManifest,
      fetchFrame: async (_, frameIdx) => {
        if (frameIdx === 1) throw failure
        return {
          width: 320,
          height: 200,
          indices: new Uint8Array(320 * 200).fill(frameIdx + 1),
          opaque: new Uint8Array(320 * 200).fill(1),
        }
      },
    })
    expect(warn.mock.calls).toEqual([['[rng-player] frame 1 fetch fail, skip:', failure]])
    // 末帧 frameIdx=2 仍画到 fb
    expect(fb.indices[0]).toBe(3)
  })
})

describe('RNG requested frame window', () => {
  const palette: Palette = {
    colors: Array.from({ length: 256 }, (): [number, number, number] => [10, 20, 30]),
    cycles: [],
  }
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
    const ctx = realCanvasContext()

    await playRng({
      chunkIdx: 5,
      frameDelayMs: 1,
      fb,
      canvasCtx: ctx,
      palette,
      startFrame: 1,
      endFrame: 2,
      fetchManifest,
      fetchFrame,
    })

    expect(fetchManifest).toHaveBeenCalledTimes(1)
    expect(fetchFrame.mock.calls).toEqual([
      [5, 1],
      [5, 2],
    ])
    // 每窗帧整幅覆盖 fb → 末屏即窗口末帧(填 12 = 10 + frameIdx 2)。
    expect(fb.indices.every((v) => v === 12)).toBe(true)
    expect([...ctx.getImageData(0, 0, 1, 1).data]).toEqual([10, 20, 30, 255])
  })
})

describe('RNG manifest order and listener cleanup', () => {
  /** colors[i] = [i,0,0]:flushToCanvas 后 ImageData 首像素 R 通道 = 调色板索引,可直接读帧序。 */
  const palette: Palette = {
    colors: Array.from({ length: 256 }, (_, i): [number, number, number] => [i, 0, 0]),
    cycles: [],
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
  it('成功帧乱序迟到 + 中间帧失败 — 顺序保持、末屏为最后成功帧、结束后归还输入监听', async () => {
    const failure = new Error('frame 1 io failure')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
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
      if (frameIdx === 1) return Promise.reject(failure)
      return frame2.promise
    })
    const ctx = realCanvasContext()
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

    try {
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
      expect(warning.mock.calls).toEqual([['[rng-player] frame 1 fetch fail, skip:', failure]])
      expect(fb.indices).toHaveLength(320 * 200)
      expect(fb.indices.findIndex((pixel) => pixel !== 12)).toBe(-1)
    } finally {
      frame0.resolve(rngFrame(10))
      frame2.resolve(rngFrame(12))
      await pending
    }
  })
})

describe('RNG direct-option and default IO contracts', () => {
  it('省略跳过键时 Space 仍播到末帧', async () => {
    const fb = createFramebuffer()
    const pending = playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      fb,
      canvasCtx: realCanvasContext(),
      palette: legalPalette(),
      fetchManifest: async () => rngManifest(2),
      fetchFrame: async (_chunk, frameIdx) => rngFrame(frameIdx + 1),
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await pending
    expect(fb.indices[0]).toBe(2)
  })
  it('endFrame -2 播到 frameCount-1', async () => {
    const fb = createFramebuffer()
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      endFrame: -2,
      fb,
      canvasCtx: realCanvasContext(),
      palette: legalPalette(),
      fetchManifest: async () => rngManifest(2),
      fetchFrame: async (_chunk, frameIdx) => rngFrame(frameIdx + 1),
    })
    expect(fb.indices[0]).toBe(2)
  })
  it('startFrame 等于 endFrame 只取该帧', async () => {
    const fb = createFramebuffer()
    const seen: number[] = []
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      startFrame: 1,
      endFrame: 1,
      fb,
      canvasCtx: realCanvasContext(),
      palette: legalPalette(),
      fetchManifest: async () => rngManifest(3),
      fetchFrame: async (_chunk, frameIdx) => {
        seen.push(frameIdx)
        return rngFrame(frameIdx + 4)
      },
    })
    expect(seen).toEqual([1])
    expect(fb.indices[0]).toBe(5)
  })
  it('manifest 418 的错误文本带状态码', async () => {
    const fb = createFramebuffer()
    fb.indices[0] = 9
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const origFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(null, { status: 418 })
    try {
      await playRng({
        chunkIdx: 6,
        frameDelayMs: 0,
        fb,
        canvasCtx: realCanvasContext(),
        palette: legalPalette(),
      })
      const warned = warn.mock.calls[0]?.[1]
      expect(warned).toBeInstanceOf(Error)
      if (!(warned instanceof Error)) throw new Error('manifest warn is not Error')
      expect(warned.message).toBe('rng-player: manifest fetch failed (418)')
      expect(fb.indices[0]).toBe(9)
    } finally {
      globalThis.fetch = origFetch
    }
    expect(warn.mock.calls).toEqual([
      [
        '[rng-player] manifest fetch failed:',
        expect.objectContaining({ message: 'rng-player: manifest fetch failed (418)' }),
      ],
    ])
  })
  it('默认块地址是 rng-07.rle', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const seen: string[] = []
    const origFetch = globalThis.fetch
    globalThis.fetch = async (input: RequestInfo | URL) => {
      seen.push(String(input))
      return new Response(null, { status: 404 })
    }
    try {
      await playRng({
        chunkIdx: 7,
        frameDelayMs: 0,
        fb: createFramebuffer(),
        canvasCtx: realCanvasContext(),
        palette: legalPalette(),
        fetchManifest: async () => rngManifest(1, 7),
      })
      expect(seen).toEqual(['/extracted/data/animation/rng-07.rle'])
      expect(warning.mock.calls).toEqual([
        [
          '[rng-player] frame 0 fetch fail, skip:',
          expect.objectContaining({
            message: 'rng-player: fetch /extracted/data/animation/rng-07.rle failed (404)',
          }),
        ],
      ])
    } finally {
      globalThis.fetch = origFetch
    }
  })
})
