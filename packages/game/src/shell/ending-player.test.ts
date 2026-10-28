import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { realCanvasContext } from '../__tests__/canvas-host.js'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import {
  colorFadeBlocking,
  fadeInBlocking,
  fadeOutBlocking,
  playEndingAnimation,
} from './ending-player.js'

const palette: Palette = {
  colors: Array.from({ length: 256 }, (_, index): [number, number, number] => [index, 20, 40]),
  cycles: [],
}

afterEach(async () => {
  if (vi.isFakeTimers()) await vi.runAllTimersAsync()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function frame(w: number, h: number, val: number): IndexedImage {
  return {
    width: w,
    height: h,
    indices: new Uint8Array(w * h).fill(val),
    opaque: new Uint8Array(w * h).fill(1),
  }
}

describe('结局 ending-player playEndingAnimation(PAL_EndingAnimation port)', () => {
  it('四帧后上下背景与女孩边界落在独立像素坐标', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const p = playEndingAnimation({
      upperIndices: new Uint8Array(320 * 200).fill(60),
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [frame(20, 20, 70), frame(20, 20, 71)],
      girlFrames: [frame(10, 10, 99), frame(10, 10, 99), frame(10, 10, 99), frame(10, 10, 99)],
      fb,
      canvasCtx: realCanvasContext(),
      palette,
      frameCount: 4,
      frameDelayMs: 1,
    })
    await vi.runAllTimersAsync()
    await p
    expect(fb.indices[0]).toBe(60) // Fourth frame: h=1, top row from upper.
    expect(fb.indices[199 * 320]).toBe(50)
    for (let y = 178; y < 188; y++)
      expect(fb.indices.slice(y * 320 + 220, y * 320 + 230)).toEqual(new Uint8Array(10).fill(99))
    expect(fb.indices[177 * 320 + 220]).toBe(50)
    expect(fb.indices[188 * 320 + 220]).toBe(50)
    expect(fb.indices[178 * 320 + 219]).toBe(50)
  })

  it('beastFrames 不足 2 帧 → 跳过妖兽不崩', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const p = playEndingAnimation({
      upperIndices: new Uint8Array(320 * 200).fill(60),
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [frame(20, 20, 70)],
      girlFrames: [],
      fb,
      canvasCtx: realCanvasContext(),
      palette,
      frameCount: 2,
      frameDelayMs: 1,
    })
    await vi.runAllTimersAsync()
    await p
    expect(fb.indices).toEqual(new Uint8Array(320 * 200).fill(50)) // Two frames: lower only.
  })
})

describe('结局 阻塞 fade 助手(suspendRaf 期间不走 present 驱动)', () => {
  it('fadeOut / fadeIn / colorFade 的中间色与终点真实写到 Canvas', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    fb.indices.fill(10)
    const ctx = realCanvasContext()
    const pal: Palette = {
      colors: Array.from({ length: 256 }, (): [number, number, number] => [200, 100, 50]),
      cycles: [],
    }
    pal.colors[15] = [20, 40, 60]
    const pixel = (): number[] => [...ctx.getImageData(0, 0, 1, 1).data]
    const out = fadeOutBlocking(fb, ctx, pal, 100)
    await vi.advanceTimersByTimeAsync(48)
    const dimmed = pixel()
    await vi.runAllTimersAsync()
    await out
    const black = pixel()
    const into = fadeInBlocking(fb, ctx, pal, 100)
    await vi.runAllTimersAsync()
    await into
    const restored = pixel()
    const color = colorFadeBlocking(fb, ctx, pal, 15, 100)
    await vi.advanceTimersByTimeAsync(48)
    const blended = pixel()
    await vi.runAllTimersAsync()
    await color
    expect(dimmed).toEqual([104, 52, 26, 255])
    expect(black).toEqual([0, 0, 0, 255])
    expect(restored).toEqual([200, 100, 50, 255])
    expect(blended).toEqual([114, 71, 55, 255])
    expect(pixel()).toEqual([20, 40, 60, 255])
    expect(fb.indices).toEqual(new Uint8Array(320 * 200).fill(10))
  })
})
