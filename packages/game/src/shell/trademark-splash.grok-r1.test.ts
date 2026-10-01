/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G10-B。
 * 商标淡出的系数夹紧、终帧黑像素、默认 1000ms 与 chunk 6；卷轴窄图与停在 1。
 */
import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/grok-render-r1/legal-host.js'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { playSplashFallback } from './splash-fallback.js'
import { playTrademarkFallback } from './trademark-fallback.js'

function full(fill: number, width = 320, height = 200): IndexedImage {
  return {
    width,
    height,
    indices: new Uint8Array(width * height).fill(fill),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

function realCtx(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 200
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  return ctx
}

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

function crane() {
  return { frames: [full(1, 1, 1)], anchorX: 0, anchorY: 0 }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('G10-B 商标淡出与卷轴停点', () => {
  it('G10-B01 时间回退时淡出系数夹在 1，画布仍是调色板 RGB', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const ctx = realCtx()
    const written: Uint8ClampedArray[] = []
    const orig = ctx.putImageData.bind(ctx)
    ctx.putImageData = ((image: ImageData, dx: number, dy: number) => {
      written.push(new Uint8ClampedArray(image.data))
      orig(image, dx, dy)
    }) as typeof ctx.putImageData
    let tick = 0
    const samples = [0, -600, 600]
    const pending = playTrademarkFallback({
      fb,
      canvasCtx: ctx,
      palette: palette200(),
      fetchManifest: async () => oneFrameManifest(),
      fetchFrame: async () => full(200),
      delayBeforeFadeMs: 0,
      fadeOutMs: 600,
      nowFn: () => samples[Math.min(tick++, samples.length - 1)] ?? 600,
    })
    await vi.runAllTimersAsync()
    await pending
    const mid = written[1]
    if (!mid) throw new Error('missing fade frame')
    expect([mid[0], mid[1], mid[2], mid[3]]).toEqual([100, 40, 10, 255])
    expect(Array.from(ctx.getImageData(0, 0, 1, 1).data)).toEqual([0, 0, 0, 255])
    expect(fb.indices[0]).toBe(200)
  })

  it('G10-B02 淡出时长 0 的最终像素是黑，索引仍是 200', async () => {
    const fb = createFramebuffer()
    const ctx = realCtx()
    await playTrademarkFallback({
      fb,
      canvasCtx: ctx,
      palette: palette200(),
      fetchManifest: async () => oneFrameManifest(),
      fetchFrame: async () => full(200),
      delayBeforeFadeMs: 0,
      fadeOutMs: 0,
      nowFn: () => 0,
    })
    expect(Array.from(ctx.getImageData(0, 0, 1, 1).data)).toEqual([0, 0, 0, 255])
    expect(fb.indices[0]).toBe(200)
  })

  it('G10-B03 默认淡出前等待 1000 毫秒', async () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(globalThis, 'setTimeout')
    const pending = playTrademarkFallback({
      fb: createFramebuffer(),
      canvasCtx: realCtx(),
      palette: palette200(),
      fetchManifest: async () => oneFrameManifest(),
      fetchFrame: async () => full(200),
      fadeOutMs: 0,
      nowFn: () => 0,
    })
    await vi.runAllTimersAsync()
    await pending
    expect(spy.mock.calls.map((call) => call[1])).toEqual([40, 1000])
  })

  it('G10-B04 playRng 固定 chunk 6', async () => {
    const seen: number[] = []
    await playTrademarkFallback({
      fb: createFramebuffer(),
      canvasCtx: realCtx(),
      palette: palette200(),
      fetchManifest: async () => oneFrameManifest(),
      fetchFrame: async (chunkIdx) => {
        seen.push(chunkIdx)
        return full(200)
      },
      delayBeforeFadeMs: 0,
      fadeOutMs: 0,
      nowFn: () => 0,
    })
    expect(seen).toEqual([6])
  })

  it('G10-B05 窄图只拷贝自身宽度', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const fb = createFramebuffer()
    const pending = playSplashFallback({
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
      bitmapUp: full(77, 10, 200),
      bitmapDown: full(22),
      craneSprite: crane(),
      titleFrame: full(9, 2, 2),
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await vi.runAllTimersAsync()
    await pending
    expect(fb.indices[0]).toBe(77)
    expect(fb.indices[10]).toBe(0)
  })

  it('G10-B06 卷轴停在 iImgPos 1，底行仍是下图', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const fb = createFramebuffer()
    const pending = playSplashFallback({
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
      bitmapUp: full(11),
      bitmapDown: full(22),
      craneSprite: crane(),
      titleFrame: full(9, 2, 2),
    })
    await vi.advanceTimersByTimeAsync(198 * 85)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await vi.runAllTimersAsync()
    await pending
    expect(fb.indices[0]).toBe(11)
    expect(fb.indices[199 * 320]).toBe(22)
  })
})
