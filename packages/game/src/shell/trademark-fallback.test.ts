import { strictEqual } from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import type { Palette } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/asset-fixtures.js'
import { realCanvasContext } from '../__tests__/canvas-host.js'
import { dumpFramebuffer } from '../__tests__/grok-render-r1/dump-evidence.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { createOpeningPlaybackOwner } from './__tests__/opening-playback.js'
import { rngFrame } from './__tests__/rng-frames.js'
import { playTrademarkFallback } from './trademark-fallback.js'

let playback: ReturnType<typeof createOpeningPlaybackOwner>
beforeEach(() => {
  playback = createOpeningPlaybackOwner()
})
afterEach(async () => {
  try {
    await playback.close()
  } finally {
    vi.restoreAllMocks()
    vi.useRealTimers()
  }
})
describe('Trademark playback and skip lifetime', () => {
  const manifest = {
    chunks: [{ chunkIndex: 6, frameCount: 2, frames: [{ index: 0 }, { index: 1 }] }],
  }

  // 原生全字节比较同时核长度；失败只输出比较结果，避免展开整幅像素的昂贵 diff。
  function assertBytesEqual(
    actual: Uint8Array | Uint8ClampedArray,
    expected: Uint8Array | Uint8ClampedArray,
  ): void {
    strictEqual(Buffer.compare(Buffer.from(actual), Buffer.from(expected)), 0)
  }

  const palette = legalPalette((colors) => colors.fill([200, 100, 50]))

  const opaqueBlack = Uint8ClampedArray.from({ length: 320 * 200 * 4 }, (_, index) =>
    index % 4 === 3 ? 255 : 0,
  )
  beforeEach(() => vi.useFakeTimers())
  it('默认 Space 不跳过：完整播放两帧，保留末帧索引并淡至全黑', async () => {
    const fb = createFramebuffer()
    const context = realCanvasContext()
    const pending = playback.track(
      playTrademarkFallback({
        fb,
        canvasCtx: context,
        palette,
        fetchManifest: async () => manifest,
        fetchFrame: async (_chunk, index) => rngFrame(index + 1),
      }),
    )
    let completed = false
    void pending.then(
      () => {
        completed = true
      },
      () => {
        completed = true
      },
    )
    await vi.advanceTimersByTimeAsync(0)
    assertBytesEqual(fb.indices, new Uint8Array(320 * 200).fill(1))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', cancelable: true }))
    await vi.advanceTimersByTimeAsync(40)
    assertBytesEqual(fb.indices, new Uint8Array(320 * 200).fill(2))
    await vi.advanceTimersByTimeAsync(40 + 1000)
    await vi.advanceTimersByTimeAsync(599)
    expect(completed).toBe(false)
    await vi.advanceTimersByTimeAsync(16)
    await pending
    expect(completed).toBe(true)
    assertBytesEqual(fb.indices, new Uint8Array(320 * 200).fill(2))
    assertBytesEqual(context.getImageData(0, 0, 320, 200).data, opaqueBlack)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('显式允许 Space：停在首帧、淡至全黑并释放按键监听', async () => {
    const fb = createFramebuffer()
    const context = realCanvasContext()
    const pending = playback.track(
      playTrademarkFallback({
        fb,
        canvasCtx: context,
        palette,
        fetchManifest: async () => manifest,
        fetchFrame: async (_chunk, index) => rngFrame(index + 1),
        skipKeys: ['Space'],
        delayBeforeFadeMs: 0,
        fadeOutMs: 0,
      }),
    )
    await vi.advanceTimersByTimeAsync(0)
    assertBytesEqual(fb.indices, new Uint8Array(320 * 200).fill(1))
    const skip = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    window.dispatchEvent(skip)
    await vi.runAllTimersAsync()
    await pending
    assertBytesEqual(fb.indices, new Uint8Array(320 * 200).fill(1))
    expect(skip.defaultPrevented).toBe(true)
    assertBytesEqual(context.getImageData(0, 0, 320, 200).data, opaqueBlack)
    const after = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    window.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('Trademark fade and fixed RNG parameters', () => {
  function palette200(): Palette {
    return legalPalette((colors) => {
      colors[200] = [100, 40, 10]
    })
  }

  function oneFrameManifest() {
    return {
      chunks: [{ chunkIndex: 6, frameCount: 1, frames: [{ index: 0 }] }],
    }
  }
  beforeEach(() => vi.useFakeTimers())
  it('时间回退时淡出系数夹在 1，画布仍是调色板 RGB', async () => {
    const fb = createFramebuffer()
    const ctx = realCanvasContext()
    const written: Uint8ClampedArray[] = []
    const orig = ctx.putImageData.bind(ctx)
    vi.spyOn(ctx, 'putImageData').mockImplementation((image, dx, dy) => {
      written.push(new Uint8ClampedArray(image.data))
      orig(image, dx, dy)
    })
    let tick = 0
    const samples = [0, -600, 600]
    const pending = playback.track(
      playTrademarkFallback({
        fb,
        canvasCtx: ctx,
        palette: palette200(),
        fetchManifest: async () => oneFrameManifest(),
        fetchFrame: async () => rngFrame(200),
        delayBeforeFadeMs: 0,
        fadeOutMs: 600,
        nowFn: () => samples[Math.min(tick++, samples.length - 1)] ?? 600,
      }),
    )
    await vi.runAllTimersAsync()
    await pending
    const mid = written[1]
    if (!mid) throw new Error('missing fade frame')
    expect([mid[0], mid[1], mid[2], mid[3]]).toEqual([100, 40, 10, 255])
    expect(Array.from(ctx.getImageData(0, 0, 1, 1).data)).toEqual([0, 0, 0, 255])
    expect(fb.indices[0]).toBe(200)
    await dumpFramebuffer('G10-B01-fade', 320, 200, mid, [{ x: 0, y: 0, rgba: [100, 40, 10, 255] }])
    const finalSnap = ctx.getImageData(0, 0, 320, 200)
    await dumpFramebuffer('G10-B01-final', 320, 200, finalSnap.data, [
      { x: 0, y: 0, rgba: [0, 0, 0, 255] },
    ])
  })
  it('淡出时长 0 的最终像素是黑，索引仍是 200', async () => {
    const fb = createFramebuffer()
    const ctx = realCanvasContext()
    const pending = playback.track(
      playTrademarkFallback({
        fb,
        canvasCtx: ctx,
        palette: palette200(),
        fetchManifest: async () => oneFrameManifest(),
        fetchFrame: async () => rngFrame(200),
        delayBeforeFadeMs: 0,
        fadeOutMs: 0,
        nowFn: () => 0,
      }),
    )
    await vi.runAllTimersAsync()
    await pending
    expect(Array.from(ctx.getImageData(0, 0, 1, 1).data)).toEqual([0, 0, 0, 255])
    expect(fb.indices[0]).toBe(200)
    const finalSnap = ctx.getImageData(0, 0, 320, 200)
    await dumpFramebuffer('G10-B02-final', 320, 200, finalSnap.data, [
      { x: 0, y: 0, rgba: [0, 0, 0, 255] },
    ])
  })
  it('默认淡出前等待 1000 毫秒', async () => {
    const spy = vi.spyOn(globalThis, 'setTimeout')
    const pending = playback.track(
      playTrademarkFallback({
        fb: createFramebuffer(),
        canvasCtx: realCanvasContext(),
        palette: palette200(),
        fetchManifest: async () => oneFrameManifest(),
        fetchFrame: async () => rngFrame(200),
        fadeOutMs: 0,
        nowFn: () => 0,
      }),
    )
    await vi.runAllTimersAsync()
    await pending
    expect(spy.mock.calls.map((call) => call[1])).toEqual([40, 1000])
  })
  it('playRng 固定 chunk 6', async () => {
    const seen: number[] = []
    const pending = playback.track(
      playTrademarkFallback({
        fb: createFramebuffer(),
        canvasCtx: realCanvasContext(),
        palette: palette200(),
        fetchManifest: async () => oneFrameManifest(),
        fetchFrame: async (chunkIdx) => {
          seen.push(chunkIdx)
          return rngFrame(200)
        },
        delayBeforeFadeMs: 0,
        fadeOutMs: 0,
        nowFn: () => 0,
      }),
    )
    await vi.runAllTimersAsync()
    await pending
    expect(seen).toEqual([6])
  })
})
