import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import {
  colorFadeBlocking,
  fadeInBlocking,
  fadeOutBlocking,
  playEndingAnimation,
} from './ending-player.js'

const mockPalette = {
  colors: Array.from({ length: 256 }, () => [0, 0, 0]),
  cycles: [],
} as unknown as import('@type-pal/shared').Palette
const mockCanvasCtx = { putImageData: vi.fn() } as unknown as CanvasRenderingContext2D

function frame(w: number, h: number, val: number): IndexedImage {
  return {
    width: w,
    height: h,
    indices: new Uint8Array(w * h).fill(val),
    opaque: new Uint8Array(w * h).fill(1),
  }
}

describe('结局 ending-player playEndingAnimation(PAL_EndingAnimation port)', () => {
  afterEach(() => vi.useRealTimers())

  it('跑完 N 帧不崩;背景(lower)+ 女孩精灵写入 fb', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const p = playEndingAnimation({
      upperIndices: new Uint8Array(320 * 200).fill(60),
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [frame(20, 20, 70), frame(20, 20, 71)],
      girlFrames: [frame(10, 10, 99), frame(10, 10, 99), frame(10, 10, 99), frame(10, 10, 99)],
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      frameCount: 4,
      frameDelayMs: 1,
    })
    await vi.runAllTimersAsync()
    await p
    expect(fb.indices.includes(50)).toBe(true) // 背景下半 lower 铺到屏上
    expect(fb.indices.includes(99)).toBe(true) // 女孩 sprite 在 (220,180) blit 进屏
  })

  it('beastFrames 不足 2 帧 → 跳过妖兽不崩', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const p = playEndingAnimation({
      upperIndices: new Uint8Array(320 * 200).fill(60),
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [],
      girlFrames: [],
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      frameCount: 2,
      frameDelayMs: 1,
    })
    await vi.runAllTimersAsync()
    await p
    expect(fb.indices.includes(50)).toBe(true) // 背景仍画
  })
})

describe('结局 阻塞 fade 助手(suspendRaf 期间不走 present 驱动)', () => {
  it('fadeOut / fadeIn / colorFade 跑完不崩并刷 canvas(fake timers)', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    fb.indices.fill(10)
    const pal = {
      colors: Array.from({ length: 256 }, () => [200, 100, 50]),
      cycles: [],
    } as unknown as import('@type-pal/shared').Palette
    const p1 = fadeOutBlocking(fb, mockCanvasCtx, pal, 100)
    await vi.runAllTimersAsync()
    await p1
    const p2 = fadeInBlocking(fb, mockCanvasCtx, pal, 100)
    await vi.runAllTimersAsync()
    await p2
    const p3 = colorFadeBlocking(fb, mockCanvasCtx, pal, 15, 100)
    await vi.runAllTimersAsync()
    await p3
    expect(mockCanvasCtx.putImageData).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
