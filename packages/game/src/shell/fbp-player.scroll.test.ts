import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/asset-fixtures.js'
import { realCanvasContext } from '../__tests__/canvas-host.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { scrollFbp } from './fbp-player.js'

const palette: Palette = {
  colors: Array.from({ length: 256 }, (_, index): [number, number, number] => [index, 20, 40]),
  cycles: [],
}
function filledScreenIndices(index: number): Uint8Array {
  return new Uint8Array(320 * 200).fill(index)
}
afterEach(async () => {
  try {
    if (vi.isFakeTimers()) await vi.runAllTimersAsync()
  } finally {
    vi.restoreAllMocks()
    vi.useRealTimers()
  }
})
describe('特效 B fbp-player scrollFbp(PAL_ScrollFBP port)', () => {
  it('下滑卷入完成 → 整屏 = 新图(末帧 CopyEntireSurface)', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    fb.indices.fill(0x11) // 旧屏
    const p = scrollFbp({
      fbpIndices: filledScreenIndices(0x22),
      speed: 100,
      fScrollDown: true,
      fb,
      canvasCtx: realCanvasContext(),
      palette,
    })
    await vi.runAllTimersAsync()
    await p
    expect(fb.indices.every((v) => v === 0x22)).toBe(true) // 全是新图
    vi.useRealTimers()
  })
  it('滚动中间帧 = 旧屏下移 + 新图自顶推入(下滑方向)', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    // 旧屏索引 100，新图索引 200，独立观察两侧归属。
    fb.indices.fill(100)
    const target = new Uint8Array(320 * 200).fill(200)
    const p = scrollFbp({
      fbpIndices: target,
      speed: 100,
      fScrollDown: true,
      fb,
      canvasCtx: realCanvasContext(),
      palette,
    })
    // 推进到约一半(110 步)再看:顶部应是新图(200),底部应是旧屏(100)
    await vi.advanceTimersByTimeAsync(8 * 110) // delay=800/100=8ms × 110 步
    const top = fb.indices[0]! // 顶部行
    const bottom = fb.indices[320 * 199]! // 底部行
    await vi.runAllTimersAsync()
    await p
    expect(top).toBe(200) // 顶部 = 新图(自顶推入)
    expect(bottom).toBe(100) // 底部 = 旧屏(下移中)
    vi.useRealTimers()
  })
})

describe('FBP scroll boundaries', () => {
  it('speed 0 的步进等待是 800 毫秒', async () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(globalThis, 'setTimeout')
    const fb = createFramebuffer()
    const pending = scrollFbp({
      fbpIndices: filledScreenIndices(0x22),
      speed: 0,
      fScrollDown: true,
      fb,
      canvasCtx: realCanvasContext(),
      palette: legalPalette(),
    })
    const firstDelay = spy.mock.calls[0]?.[1]
    await vi.advanceTimersByTimeAsync(799)
    expect(fb.indices).toEqual(filledScreenIndices(0))
    await vi.advanceTimersByTimeAsync(1)
    expect(fb.indices[0]).toBe(0x22)
    expect(fb.indices[199 * 320]).toBe(0)
    await vi.runAllTimersAsync()
    await pending
    expect(firstDelay).toBe(800)
  })
  it('上滚中途顶行是旧屏底行是新图', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    fb.indices.fill(100)
    const pending = scrollFbp({
      fbpIndices: filledScreenIndices(200),
      speed: 100,
      fScrollDown: false,
      fb,
      canvasCtx: realCanvasContext(),
      palette: legalPalette(),
    })
    await vi.advanceTimersByTimeAsync(8 * 110)
    const top = fb.indices[0]
    const bottom = fb.indices[199 * 320]
    await vi.runAllTimersAsync()
    await pending
    expect(top).toBe(100)
    expect(bottom).toBe(200)
  })
  it('长度不足的滚动不改 framebuffer', async () => {
    const fb = createFramebuffer()
    fb.indices.fill(77)
    await scrollFbp({
      fbpIndices: new Uint8Array(10),
      speed: 1,
      fScrollDown: true,
      fb,
      canvasCtx: realCanvasContext(),
      palette: legalPalette(),
    })
    expect(fb.indices).toEqual(filledScreenIndices(77))
  })
})
