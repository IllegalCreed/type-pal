import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { realCanvasContext } from '../__tests__/canvas-host.js'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { blackPalette, fetchThreeFrameManifest, rngFrame } from './__tests__/rng-frames.js'
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
describe('RNG in-flight chunk cache', () => {
  it('单次 playRng:同一 chunk 的 N 帧并发只触发一次底层加载(防 O(N²) stampede)', async () => {
    let loadCount = 0
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    __setRngChunkLoaderForTest(async () => {
      loadCount++
      await gate // 放大并发窗口,确保 N 帧在首个加载未完成时都进来
      const map = new Map<number, IndexedImage>()
      for (let i = 0; i < 3; i++) {
        map.set(i, {
          width: 320,
          height: 200,
          indices: new Uint8Array(320 * 200).fill(i + 1),
          opaque: new Uint8Array(320 * 200).fill(1),
        })
      }
      return map
    })
    const fb = createFramebuffer()
    // 不注入 fetchFrame → 走默认 defaultFetchFrame → loadRngChunk → 注入的 loader
    const pending = playRng({
      chunkIdx: 6, // THREE_FRAME_MANIFEST chunk 6 = 3 帧 → Promise.all 并发 3 次取帧
      frameDelayMs: 0,
      fb,
      canvasCtx: realCanvasContext(),
      palette: blackPalette,
      fetchManifest: fetchThreeFrameManifest,
    })
    try {
      await new Promise<void>((resolve) => queueMicrotask(resolve))
      await new Promise<void>((resolve) => queueMicrotask(resolve))
      expect(loadCount).toBe(1)
    } finally {
      release()
      await pending
    }
    expect(loadCount).toBe(1) // 修复前:3(每帧 cache-miss);修复后:1
    expect(fb.indices).toHaveLength(320 * 200)
    expect(fb.indices.findIndex((pixel) => pixel !== 3)).toBe(-1)
  })
})

describe('RNG failed chunk eviction', () => {
  const palette: Palette = {
    colors: Array.from({ length: 256 }, (): [number, number, number] => [10, 20, 30]),
    cycles: [],
  }
  it('首次加载失败 → 0 帧且保留原错误;再次播放重新加载成功并显帧(加载器恰 2 次调用)', async () => {
    const failure = new Error('transient network failure')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let loaderCalls = 0
    __setRngChunkLoaderForTest((_chunkIdx) => {
      loaderCalls++
      if (loaderCalls === 1) return Promise.reject(failure)
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
      canvasCtx: realCanvasContext(),
      palette,
      fetchManifest,
    })
    expect(warn.mock.calls).toEqual([['[rng-player] frame 0 fetch fail, skip:', failure]])
    expect(fb1.indices.every((v) => v === 0)).toBe(true) // 未显任何帧

    const fb2 = createFramebuffer()
    await playRng({
      chunkIdx: 8,
      frameDelayMs: 1,
      fb: fb2,
      canvasCtx: realCanvasContext(),
      palette,
      fetchManifest,
    })
    // 失败 Promise 已被驱逐:第二次播放真实重载(loaderCalls 2)并显示帧。
    expect(loaderCalls).toBe(2)
    expect(fb2.indices.every((v) => v === 21)).toBe(true)
  })
})

describe('RNG cache ownership between chunks', () => {
  /** colors[i] = [i,0,0]:flushToCanvas 后 ImageData 首像素 R 通道 = 调色板索引,可直接读帧序。 */
  const palette: Palette = {
    colors: Array.from({ length: 256 }, (_, i): [number, number, number] => [i, 0, 0]),
    cycles: [],
  }
  it('chunk A 加载失败不驱逐 chunk B 成功缓存 — 复播 B 不重载、帧数据不串', async () => {
    const failure = new Error('transient chunk 5 io failure')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const loads: number[] = []
    __setRngChunkLoaderForTest((chunkIdx) => {
      loads.push(chunkIdx)
      if (chunkIdx === 5) return Promise.reject(failure)
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
      canvasCtx: realCanvasContext(),
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
    expect(warning.mock.calls).toEqual([['[rng-player] frame 0 fetch fail, skip:', failure]])
    expect(fbB1.indices).toHaveLength(320 * 200)
    expect(fbB1.indices.findIndex((pixel) => pixel !== 42)).toBe(-1)
    expect(fbB2.indices).toHaveLength(320 * 200)
    expect(fbB2.indices.findIndex((pixel) => pixel !== 42)).toBe(-1)
  })
})
