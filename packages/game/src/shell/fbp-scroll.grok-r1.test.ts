/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G10-C。
 * DOS/WIN95 的 HACKHACK 块号、speed 0、上滚中途、短缓冲和 fade 步进。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/grok-render-r1/legal-host.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { scrollFbp, showFbp } from './fbp-player.js'

const N = 320 * 200

function screen(fill: number): Uint8Array {
  return new Uint8Array(N).fill(fill)
}

function realCtx(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 200
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  return ctx
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('G10-C FBP 块号滚动与步进', () => {
  it('G10-C01 DOS 块 49 跳过最终 blit', async () => {
    const fb = createFramebuffer()
    fb.indices.fill(99)
    await showFbp({
      fbpIndices: screen(0x3c),
      fade: 0,
      chunkNum: 49,
      isWin95: false,
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
    })
    expect(fb.indices[0]).toBe(99)
  })

  it('G10-C02 WIN95 下块 49 仍整屏写入', async () => {
    const fb = createFramebuffer()
    fb.indices.fill(99)
    await showFbp({
      fbpIndices: screen(0x3c),
      fade: 0,
      chunkNum: 49,
      isWin95: true,
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
    })
    expect(fb.indices[0]).toBe(0x3c)
    expect(fb.indices[N - 1]).toBe(0x3c)
  })

  it('G10-C03 speed 0 的步进等待是 800 毫秒', async () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(globalThis, 'setTimeout')
    const fb = createFramebuffer()
    const pending = scrollFbp({
      fbpIndices: screen(0x22),
      speed: 0,
      fScrollDown: true,
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
    })
    const firstDelay = spy.mock.calls[0]?.[1]
    await vi.runAllTimersAsync()
    await pending
    expect(firstDelay).toBe(800)
  })

  it('G10-C04 上滚中途顶行是旧屏底行是新图', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    fb.indices.fill(100)
    const pending = scrollFbp({
      fbpIndices: screen(200),
      speed: 100,
      fScrollDown: false,
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
    })
    await vi.advanceTimersByTimeAsync(8 * 110)
    expect(fb.indices[0]).toBe(100)
    expect(fb.indices[199 * 320]).toBe(200)
    await vi.runAllTimersAsync()
    await pending
  })

  it('G10-C05 长度不足的滚动不改 framebuffer', async () => {
    const fb = createFramebuffer()
    fb.indices.fill(77)
    await scrollFbp({
      fbpIndices: new Uint8Array(10),
      speed: 1,
      fScrollDown: true,
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
    })
    expect(fb.indices[0]).toBe(77)
    expect(fb.indices[N - 1]).toBe(77)
  })

  it('G10-C06 fade 1 的每步等待是 20 毫秒', async () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(globalThis, 'setTimeout')
    const fb = createFramebuffer()
    fb.indices.fill(0x10)
    const pending = showFbp({
      fbpIndices: screen(0x3c),
      fade: 1,
      chunkNum: 68,
      isWin95: true,
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
    })
    const firstDelay = spy.mock.calls[0]?.[1]
    await vi.runAllTimersAsync()
    await pending
    expect(firstDelay).toBe(20)
  })
})
