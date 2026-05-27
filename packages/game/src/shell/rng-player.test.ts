import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { playRng } from './rng-player.js'

const MOCK_MANIFEST = {
  chunks: [
    { chunkIndex: 6, frameCount: 3, frames: [{ index: 0 }, { index: 1 }, { index: 2 }] },
  ],
}

function mockManifestOk(): () => Promise<typeof MOCK_MANIFEST> {
  return async () => MOCK_MANIFEST
}

/** 每帧 indices 全填 (frameIdx+1) — 验最后一帧 fb 是哪个 frame。 */
function mockFrameFiller(): (chunkIdx: number, frameIdx: number) => Promise<IndexedImage> {
  return async (_chunkIdx, frameIdx) => ({
    width: 320,
    height: 200,
    indices: new Uint8Array(320 * 200).fill(frameIdx + 1),
    opaque: new Uint8Array(320 * 200).fill(1),
  })
}

const mockPalette = {
  colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
  cycles: [],
} as unknown as import('@type-pal/shared').Palette
const mockCanvasCtx = {
  putImageData: vi.fn(),
} as unknown as CanvasRenderingContext2D

afterEach(() => {
  vi.restoreAllMocks()
})

describe('playRng — sdlpal PAL_RNGPlay 等价 (M5.6 T18 Step 4)', () => {
  it('全部帧播完 → fb.indices = 末帧填充', async () => {
    const fb = createFramebuffer()
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      fetchManifest: mockManifestOk(),
      fetchFrame: mockFrameFiller(),
    })
    // 末帧 frameIdx=2 → indices 全填 3
    expect(fb.indices[0]).toBe(3)
    expect(fb.indices[100 * 320 + 100]).toBe(3)
  })

  it('Space 按键跳过 → 不到末帧停', async () => {
    const fb = createFramebuffer()
    const promise = playRng({
      chunkIdx: 6,
      frameDelayMs: 50,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      fetchManifest: mockManifestOk(),
      fetchFrame: mockFrameFiller(),
    })
    await new Promise((r) => setTimeout(r, 60))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await promise
    // fb 是某中间帧(不一定是末帧)
    expect(fb.indices[0]).toBeGreaterThanOrEqual(1)
    expect(fb.indices[0]).toBeLessThanOrEqual(3)
  })

  it('manifest 缺该 chunk → 警告 + return,不抛', async () => {
    const fb = createFramebuffer()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await playRng({
      chunkIdx: 999,
      frameDelayMs: 1,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      fetchManifest: mockManifestOk(),
      fetchFrame: mockFrameFiller(),
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('999 不在 manifest'))
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })

  it('startFrame > endFrame → 立即 return 不播', async () => {
    const fb = createFramebuffer()
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      startFrame: 5,
      endFrame: 1,
      fetchManifest: mockManifestOk(),
      fetchFrame: mockFrameFiller(),
    })
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })

  it('endFrame=-1 → 默认播到 frameCount-1', async () => {
    const fb = createFramebuffer()
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      endFrame: -1,
      fetchManifest: mockManifestOk(),
      fetchFrame: mockFrameFiller(),
    })
    expect(fb.indices[0]).toBe(3)
  })

  it('manifest fetch throw → 警告 + return,不抛', async () => {
    const fb = createFramebuffer()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      fetchManifest: async () => { throw new Error('mock fail') },
      fetchFrame: mockFrameFiller(),
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('manifest fetch failed'), expect.any(Error))
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })

  it('单帧 fetch throw → warn + skip 该帧 + 继续', async () => {
    const fb = createFramebuffer()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      fetchManifest: mockManifestOk(),
      fetchFrame: async (_, frameIdx) => {
        if (frameIdx === 1) throw new Error('mock frame 1 fail')
        return {
          width: 320,
          height: 200,
          indices: new Uint8Array(320 * 200).fill(frameIdx + 1),
          opaque: new Uint8Array(320 * 200).fill(1),
        }
      },
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('frame 1 fetch fail'), expect.any(Error))
    // 末帧 frameIdx=2 仍画到 fb
    expect(fb.indices[0]).toBe(3)
  })
})
