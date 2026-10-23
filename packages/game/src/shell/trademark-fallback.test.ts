import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/grok-render-r1/legal-host.js'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { playTrademarkFallback } from './trademark-fallback.js'

const manifest = {
  chunks: [{ chunkIndex: 6, frameCount: 2, frames: [{ index: 0 }, { index: 1 }] }],
}

function frame(fill: number): IndexedImage {
  return {
    width: 320,
    height: 200,
    indices: new Uint8Array(320 * 200).fill(fill),
    opaque: new Uint8Array(320 * 200).fill(1),
  }
}

function canvasContext(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 200
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2d context unavailable')
  return context
}

const palette = legalPalette((colors) => colors.fill([200, 100, 50]))
const opaqueBlack = Uint8ClampedArray.from({ length: 320 * 200 * 4 }, (_, index) =>
  index % 4 === 3 ? 255 : 0,
)

beforeEach(() => vi.useFakeTimers())
afterEach(async () => {
  try {
    await vi.runAllTimersAsync()
  } finally {
    vi.useRealTimers()
  }
})

describe('playTrademarkFallback — SDLPal PAL_TrademarkScreen DOS sequence', () => {
  it('默认 Space 不跳过：完整播放两帧，保留末帧索引并淡至全黑', async () => {
    const fb = createFramebuffer()
    const context = canvasContext()
    const pending = playTrademarkFallback({
      fb,
      canvasCtx: context,
      palette,
      fetchManifest: async () => manifest,
      fetchFrame: async (_chunk, index) => frame(index + 1),
    })
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
    expect(fb.indices).toEqual(new Uint8Array(320 * 200).fill(1))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', cancelable: true }))
    await vi.advanceTimersByTimeAsync(40)
    expect(fb.indices).toEqual(new Uint8Array(320 * 200).fill(2))
    await vi.advanceTimersByTimeAsync(40 + 1000)
    await vi.advanceTimersByTimeAsync(599)
    expect(completed).toBe(false)
    await vi.advanceTimersByTimeAsync(16)
    await pending
    expect(completed).toBe(true)
    expect(fb.indices).toEqual(new Uint8Array(320 * 200).fill(2))
    expect(Uint8ClampedArray.from(context.getImageData(0, 0, 320, 200).data)).toEqual(opaqueBlack)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('显式允许 Space：停在首帧、淡至全黑并释放按键监听', async () => {
    const fb = createFramebuffer()
    const context = canvasContext()
    const pending = playTrademarkFallback({
      fb,
      canvasCtx: context,
      palette,
      fetchManifest: async () => manifest,
      fetchFrame: async (_chunk, index) => frame(index + 1),
      skipKeys: ['Space'],
      delayBeforeFadeMs: 0,
      fadeOutMs: 0,
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(fb.indices).toEqual(new Uint8Array(320 * 200).fill(1))
    const skip = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    window.dispatchEvent(skip)
    await vi.runAllTimersAsync()
    await pending
    expect(fb.indices).toEqual(new Uint8Array(320 * 200).fill(1))
    expect(skip.defaultPrevented).toBe(true)
    expect(Uint8ClampedArray.from(context.getImageData(0, 0, 320, 200).data)).toEqual(opaqueBlack)
    const after = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    window.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})
