/** Indexed ending pixels and explicit skip boundaries; palettes retain their distinct oracle domains. */

import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/asset-fixtures.js'
import { realCanvasContext } from '../__tests__/canvas-host.js'
import { solidIndexedImage } from '../present/__tests__/raster-fixtures.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { playEndingAnimation } from './ending-player.js'

describe('结局 ending-player playEndingAnimation(PAL_EndingAnimation port)', () => {
  const palette: Palette = {
    colors: Array.from({ length: 256 }, (_, index): [number, number, number] => [index, 20, 40]),
    cycles: [],
  }

  afterEach(async () => {
    if (vi.isFakeTimers()) await vi.runAllTimersAsync()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  it('四帧后上下背景与女孩边界落在独立像素坐标', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const p = playEndingAnimation({
      upperIndices: new Uint8Array(320 * 200).fill(60),
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [solidIndexedImage(20, 20, 70), solidIndexedImage(20, 20, 71)],
      girlFrames: [
        solidIndexedImage(10, 10, 99),
        solidIndexedImage(10, 10, 99),
        solidIndexedImage(10, 10, 99),
        solidIndexedImage(10, 10, 99),
      ],
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
      beastFrames: [solidIndexedImage(20, 20, 70)],
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

describe('playEndingAnimation 取消释放与背景回退', () => {
  const palette: Palette = {
    colors: Array.from({ length: 256 }, (_, index): [number, number, number] => [index, 20, 30]),
    cycles: [],
  }

  afterEach(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
    if (vi.isFakeTimers()) await vi.runAllTimersAsync()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  it('skipKeys:播中 Space 被拦截并提前退出(刷帧数远小于 frameCount),finally 释放监听', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const ctx = realCanvasContext()
    const rendered = vi.spyOn(ctx, 'putImageData')
    const p = playEndingAnimation({
      upperIndices: new Uint8Array(320 * 200).fill(60),
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [],
      girlFrames: [],
      fb,
      canvasCtx: ctx,
      palette,
      skipKeys: ['Space'],
      frameCount: 100,
      frameDelayMs: 1000,
    })

    await vi.advanceTimersByTimeAsync(1000) // 第 1 帧完成,停在第 2 帧 sleep
    const beforeSkipCount = rendered.mock.calls.length
    const beforeSkipPixel = [...ctx.getImageData(0, 0, 1, 1).data]
    const skip = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    expect(window.dispatchEvent(skip)).toBe(false) // 播中被拦截
    expect(skip.defaultPrevented).toBe(true)

    await vi.runAllTimersAsync()
    await p
    // 提前退出:总刷帧 2(而非 100)。
    expect(beforeSkipCount).toBe(2)
    expect(beforeSkipPixel).toEqual([50, 20, 30, 255])
    expect(rendered).toHaveBeenCalledTimes(2)

    const after = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    expect(window.dispatchEvent(after)).toBe(true) // 监听已释放
    expect(after.defaultPrevented).toBe(false)
  })
  it('upperIndices 长度非 64000 → 顶行索引归零；合法 upper 对照组保持 60', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const p = playEndingAnimation({
      upperIndices: new Uint8Array(5), // 非法长度 → 回退黑
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [],
      girlFrames: [],
      fb,
      canvasCtx: realCanvasContext(),
      palette,
      frameCount: 3, // 第 3 帧 h=1:顶部 1 行来自回退黑 upper
      frameDelayMs: 1,
    })
    await vi.runAllTimersAsync()
    await p
    expect(fb.indices.slice(0, 320)).toEqual(new Uint8Array(320))
    expect(fb.indices.slice(320)).toEqual(new Uint8Array(199 * 320).fill(50))

    const fbOk = createFramebuffer()
    const pOk = playEndingAnimation({
      upperIndices: new Uint8Array(320 * 200).fill(60),
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [],
      girlFrames: [],
      fb: fbOk,
      canvasCtx: realCanvasContext(),
      palette,
      frameCount: 3,
      frameDelayMs: 1,
    })
    await vi.runAllTimersAsync()
    await pOk
    expect(fbOk.indices.slice(0, 320)).toEqual(new Uint8Array(320).fill(60))
    expect(fbOk.indices.slice(320)).toEqual(new Uint8Array(199 * 320).fill(50))
  })
})

describe('cutscene host boundaries', () => {
  const N = 320 * 200

  afterEach(async () => {
    try {
      document.body
        .querySelectorAll('video')
        .forEach((video) => video.dispatchEvent(new Event('ended')))
      if (vi.isFakeTimers()) await vi.runAllTimersAsync()
    } finally {
      vi.restoreAllMocks()
      vi.useRealTimers()
    }
  })
  it('省略跳过键时 Space 不截断结局', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const pending = playEndingAnimation({
      upperIndices: new Uint8Array(N).fill(60),
      lowerIndices: new Uint8Array(N).fill(50),
      beastFrames: [],
      girlFrames: [],
      fb,
      canvasCtx: realCanvasContext(),
      palette: legalPalette(),
      frameCount: 3,
      frameDelayMs: 10,
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await vi.runAllTimersAsync()
    await pending
    expect(fb.indices[0]).toBe(60)
  })
  it('女孩纵坐标停在 80', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const pending = playEndingAnimation({
      upperIndices: new Uint8Array(N).fill(60),
      lowerIndices: new Uint8Array(N).fill(50),
      beastFrames: [],
      girlFrames: [solidIndexedImage(1, 1, 99)],
      fb,
      canvasCtx: realCanvasContext(),
      palette: legalPalette(),
      frameCount: 202,
      frameDelayMs: 0,
    })
    await vi.runAllTimersAsync()
    await pending
    expect(fb.indices[80 * 320 + 220]).toBe(99)
    expect(fb.indices[79 * 320 + 220]).toBe(60)
  })
  it('下半背景长度不足时整屏为 0', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    fb.indices.fill(7)
    const pending = playEndingAnimation({
      upperIndices: new Uint8Array(N).fill(60),
      lowerIndices: new Uint8Array(4),
      beastFrames: [],
      girlFrames: [],
      fb,
      canvasCtx: realCanvasContext(),
      palette: legalPalette(),
      frameCount: 1,
      frameDelayMs: 0,
    })
    await vi.runAllTimersAsync()
    await pending
    expect(fb.indices[0]).toBe(0)
    expect(fb.indices[N - 1]).toBe(0)
  })
})
