/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G10-A。
 * RNG 默认不可跳、负的 endFrame、单帧窗口、零淡入像素、零震屏和默认加载地址。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/grok-render-r1/legal-host.js'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { __setRngChunkLoaderForTest, playRng } from './rng-player.js'

const N = 320 * 200

function full(fill: number): IndexedImage {
  return {
    width: 320,
    height: 200,
    indices: new Uint8Array(N).fill(fill),
    opaque: new Uint8Array(N).fill(1),
  }
}

function manifest(frameCount: number, chunkIndex = 6) {
  return {
    chunks: [
      {
        chunkIndex,
        frameCount,
        frames: Array.from({ length: frameCount }, (_, index) => ({ index })),
      },
    ],
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

afterEach(() => {
  __setRngChunkLoaderForTest(null)
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('G10-A RNG 默认跳过与帧窗', () => {
  it('G10-A01 省略跳过键时 Space 仍播到末帧', async () => {
    const fb = createFramebuffer()
    const pending = playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
      fetchManifest: async () => manifest(2),
      fetchFrame: async (_chunk, frameIdx) => full(frameIdx + 1),
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await pending
    expect(fb.indices[0]).toBe(2)
  })

  it('G10-A02 endFrame -2 播到 frameCount-1', async () => {
    const fb = createFramebuffer()
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      endFrame: -2,
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
      fetchManifest: async () => manifest(2),
      fetchFrame: async (_chunk, frameIdx) => full(frameIdx + 1),
    })
    expect(fb.indices[0]).toBe(2)
  })

  it('G10-A03 startFrame 等于 endFrame 只取该帧', async () => {
    const fb = createFramebuffer()
    const seen: number[] = []
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      startFrame: 1,
      endFrame: 1,
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
      fetchManifest: async () => manifest(3),
      fetchFrame: async (_chunk, frameIdx) => {
        seen.push(frameIdx)
        return full(frameIdx + 4)
      },
    })
    expect(seen).toEqual([1])
    expect(fb.indices[0]).toBe(5)
  })

  it('G10-A04 淡入时长 0 把索引 3 写成调色板 RGB', async () => {
    const fb = createFramebuffer()
    const ctx = realCtx()
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      initialFadeInMs: 0,
      fb,
      canvasCtx: ctx,
      palette: legalPalette(),
      fetchManifest: async () => manifest(1),
      fetchFrame: async () => full(3),
    })
    expect(Array.from(ctx.getImageData(0, 0, 1, 1).data)).toEqual([3, 20, 40, 255])
    expect(fb.indices[0]).toBe(3)
  })

  it('G10-A05 shakeTime 为 0 时首帧不填黑且计数保持 0', async () => {
    const fb = createFramebuffer()
    const shakeState = { shakeTime: 0, shakeLevel: 4 }
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
      fetchManifest: async () => manifest(1),
      fetchFrame: async () => full(5),
      shakeState,
    })
    expect(fb.indices[0]).toBe(5)
    expect(shakeState.shakeTime).toBe(0)
  })

  it('G10-A06 manifest 418 的错误文本带状态码', async () => {
    const fb = createFramebuffer()
    fb.indices[0] = 9
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const origFetch = globalThis.fetch
    globalThis.fetch = (async () => new Response(null, { status: 418 })) as typeof fetch
    try {
      await playRng({
        chunkIdx: 6,
        frameDelayMs: 0,
        fb,
        canvasCtx: realCtx(),
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
  })

  it('G10-A07 默认块地址是 rng-07.rle', async () => {
    const seen: string[] = []
    const origFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      seen.push(String(input))
      return new Response(null, { status: 404 })
    }) as typeof fetch
    try {
      await playRng({
        chunkIdx: 7,
        frameDelayMs: 0,
        fb: createFramebuffer(),
        canvasCtx: realCtx(),
        palette: legalPalette(),
        fetchManifest: async () => manifest(1, 7),
      })
      expect(seen).toEqual(['/extracted/data/animation/rng-07.rle'])
    } finally {
      globalThis.fetch = origFetch
    }
  })
})
