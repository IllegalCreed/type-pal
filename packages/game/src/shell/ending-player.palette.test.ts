import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { realCanvasContext } from '../__tests__/canvas-host.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { colorFadeBlocking, fadeInBlocking, fadeOutBlocking } from './ending-player.js'

describe('结局 阻塞 fade 助手(suspendRaf 期间不走 present 驱动)', () => {
  afterEach(async () => {
    if (vi.isFakeTimers()) await vi.runAllTimersAsync()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
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
