import { describe, expect, it, vi } from 'vitest'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { playTrademarkFallback } from './trademark-fallback.js'

const MOCK_MANIFEST = {
  chunks: [{ chunkIndex: 6, frameCount: 2, frames: [{ index: 0 }, { index: 1 }] }],
}

function mockFrame(fill: number): IndexedImage {
  return {
    width: 320,
    height: 200,
    indices: new Uint8Array(320 * 200).fill(fill),
    opaque: new Uint8Array(320 * 200).fill(1),
  }
}

const mockPalette = {
  colors: Array.from({ length: 256 }, () => [200, 100, 50] as [number, number, number]),
  cycles: [],
} as unknown as import('@type-pal/shared').Palette

const mockCanvasCtx = {
  putImageData: vi.fn(),
} as unknown as CanvasRenderingContext2D

describe('playTrademarkFallback — sdlpal main.c:197-203 PAL_TrademarkScreen DOS path', () => {
  it('完整流程:playRng → delay → fadeOut → resolve', async () => {
    const fb = createFramebuffer()
    await playTrademarkFallback({
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      fetchManifest: async () => MOCK_MANIFEST,
      fetchFrame: async (_c, fi) => mockFrame(fi + 1),
      delayBeforeFadeMs: 0,
      fadeOutMs: 0,
    })
    // fb 已被 mockFrame 写过(末帧 fi=1 → 填 2)
    expect(fb.indices.some((v) => v !== 0)).toBe(true)
  })

  it('Space 中途跳过 → 缩短流程仍 resolve', async () => {
    const fb = createFramebuffer()
    const promise = playTrademarkFallback({
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      fetchManifest: async () => MOCK_MANIFEST,
      fetchFrame: async (_c, fi) => mockFrame(fi + 1),
      delayBeforeFadeMs: 0,
      fadeOutMs: 0,
    })
    await new Promise((r) => setTimeout(r, 30))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await promise
  })
})
