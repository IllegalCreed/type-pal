// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest'
import { expectDefined } from './defined.js'
import { type ScreenShake, shakeOffsetY, WavedBgCache, wavePhase } from './screen-fx.js'
import { waveOffsets } from './wave-distortion.js'

describe('battle screen effects', () => {
  test('the shared PAL wave truncates low amplitudes and reflects a full cycle', () => {
    const half = waveOffsets(128)
    expect(half).toHaveLength(32)
    expect(half.slice(0, 4)).toEqual([30, 56, 78, 96])
    expect(half.slice(16, 18)).toEqual([290, 264])
    const low = waveOffsets(8)
    expect([low[0], low[7], low[15]]).toEqual([1, 8, 0])
  })

  test('wavePhase:40ms 一拍,32 相位循环(原版 static index 的 time-based 等效)', () => {
    expect(wavePhase(0)).toBe(0)
    expect(wavePhase(39)).toBe(0)
    expect(wavePhase(40)).toBe(1)
    expect(wavePhase(40 * 32)).toBe(0)
  })

  test('shakeOffsetY:活跃期 40ms 拍奇偶交替 ±level,过期/空 = 0', () => {
    const shake: ScreenShake = { untilMs: 1000, level: 3 }
    expect(shakeOffsetY(null, 100)).toBe(0)
    expect(shakeOffsetY(shake, 1000)).toBe(0) // 到期
    expect(shakeOffsetY(shake, 0)).toBe(3) // 偶拍 +
    expect(shakeOffsetY(shake, 40)).toBe(-3) // 奇拍 −
    expect(shakeOffsetY(shake, 80)).toBe(3)
  })

  test('bakes the active phase, reuses the same phase, and rebakes when the source identity changes', () => {
    const source = document.createElement('canvas')
    source.width = 320
    source.height = 200
    const ctx = expectDefined(source.getContext('2d'))
    ctx.fillStyle = '#f00'
    ctx.fillRect(30, 0, 1, 1)
    ctx.fillRect(56, 0, 1, 1)
    ctx.fillStyle = '#00f'
    ctx.fillRect(0, 0, 1, 1)

    const cache = new WavedBgCache()
    expect(cache.render(source, 0, 0, 'scene')).toBe(source)
    expect(cache.render(source, 256, 0, 'scene')).toBe(source)
    const baked = cache.render(source, 128, 0, 'scene')
    if (!(baked instanceof HTMLCanvasElement))
      throw new Error('active battle wave requires a canvas')
    expect([baked.width, baked.height]).toEqual([320, 200])
    const bakedCtx = expectDefined(baked.getContext('2d'))
    const pixel = (x: number) => Array.from(bakedCtx.getImageData(x, 0, 1, 1).data)
    expect(pixel(0)).toEqual([255, 0, 0, 255])
    expect(pixel(290)).toEqual([0, 0, 255, 255])
    const draw = vi.spyOn(bakedCtx, 'drawImage')
    try {
      expect(cache.render(source, 128, 39, 'scene')).toBe(baked)
      expect(draw).not.toHaveBeenCalled()
      expect(cache.render(source, 128, 40, 'scene')).toBe(baked)
      expect(draw.mock.calls[0]).toEqual([source, 56, 0, 264, 1, 0, 0, 264, 1])
      expect(pixel(0)).toEqual([255, 0, 0, 255])
      const summon = document.createElement('canvas')
      summon.width = 320
      summon.height = 200
      const summonCtx = expectDefined(summon.getContext('2d'))
      summonCtx.fillStyle = '#0f0'
      summonCtx.fillRect(56, 0, 1, 1)
      expect(cache.render(summon, 128, 40, 'summon-tint')).toBe(baked)
      expect(pixel(0)).toEqual([0, 255, 0, 255])
    } finally {
      draw.mockRestore()
    }
  })

  test('a missing canvas context can recover at the same phase and copy zero/full-width rows', () => {
    const source = document.createElement('canvas')
    source.width = 320
    source.height = 200
    const ctx = expectDefined(source.getContext('2d'))
    ctx.fillStyle = '#f00'
    ctx.fillRect(0, 0, 1, 1)
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    const cache = new WavedBgCache()
    try {
      getContext.mockReturnValueOnce(null)
      expect(cache.render(source, 8, 600, 'scene')).toBe(source)
    } finally {
      getContext.mockRestore()
    }
    const baked = cache.render(source, 8, 600, 'scene')
    if (!(baked instanceof HTMLCanvasElement)) throw new Error('wave cache was not restored')
    const bakedCtx = expectDefined(baked.getContext('2d'))
    const draw = vi.spyOn(bakedCtx, 'drawImage')
    try {
      cache.render(source, 8, 1240, 'scene')
      expect(draw.mock.calls[0]).toEqual([source, 0, 0, 320, 1, 0, 0, 320, 1])
      expect(Array.from(bakedCtx.getImageData(0, 0, 1, 1).data)).toEqual([255, 0, 0, 255])
    } finally {
      draw.mockRestore()
    }
  })
})
