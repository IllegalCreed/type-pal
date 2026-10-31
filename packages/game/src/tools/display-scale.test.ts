import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDisplayScaleController, MAX_PERCENT, MIN_PERCENT } from './display-scale.js'

const SCALE_KEY = 'tp-display-scale'
let previousScale: string | null
beforeEach(() => {
  previousScale = localStorage.getItem(SCALE_KEY)
  localStorage.removeItem(SCALE_KEY)
})
afterEach(() => {
  if (previousScale === null) localStorage.removeItem(SCALE_KEY)
  else localStorage.setItem(SCALE_KEY, previousScale)
})
describe('Standalone canvas scale and fullscreen delegation', () => {
  it('Standalone canvas defaults to 100% at 960 by 600 CSS pixels', () => {
    const canvas = document.createElement('canvas')
    const controller = createDisplayScaleController(canvas)
    expect(controller.getPercent()).toBe(100)
    expect(canvas.style.width).toBe('960px')
    expect(canvas.style.height).toBe('600px')
  })

  it('setPercent 改 canvas + 持久;clamp [10,1000]', () => {
    const canvas = document.createElement('canvas')
    const controller = createDisplayScaleController(canvas)
    controller.setPercent(50)
    expect(controller.getPercent()).toBe(50)
    expect(canvas.style.width).toBe('480px') // 320 × 3 × 0.5
    expect(canvas.style.height).toBe('300px')
    expect(localStorage.getItem('tp-display-scale')).toBe('50')
    controller.setPercent(5)
    expect(controller.getPercent()).toBe(10) // 下限
    controller.setPercent(2000)
    expect(controller.getPercent()).toBe(1000) // 上限
  })

  it('1000% = 9600×6000', () => {
    const canvas = document.createElement('canvas')
    const controller = createDisplayScaleController(canvas)
    controller.setPercent(1000)
    expect(canvas.style.width).toBe('9600px')
  })

  it('启动读回 localStorage', () => {
    localStorage.setItem('tp-display-scale', '200')
    const controller = createDisplayScaleController(document.createElement('canvas'))
    expect(controller.getPercent()).toBe(200)
  })

  it.each(['foo', '0', '-12', 'NaN'])('损坏或非正存储 %s 回落到 100%，不得沿用脏值', (stored) => {
    localStorage.setItem('tp-display-scale', stored)
    const canvas = document.createElement('canvas')
    const controller = createDisplayScaleController(canvas)
    expect(controller.getPercent()).toBe(100)
    expect(canvas.style.width).toBe('960px')
  })

  it('NaN setPercent 回到默认 100%，不写入 NaN CSS 或 localStorage', () => {
    const canvas = document.createElement('canvas')
    const controller = createDisplayScaleController(canvas)
    controller.setPercent(Number.NaN)
    expect(controller.getPercent()).toBe(100)
    expect(canvas.style.width).toBe('960px')
    expect(localStorage.getItem(SCALE_KEY)).toBe('100')
  })

  it('Fractional percent rounds to an integer and persists that value', () => {
    const canvas = document.createElement('canvas')
    const controller = createDisplayScaleController(canvas)
    controller.setPercent(33.6)
    expect(controller.getPercent()).toBe(34)
    expect(localStorage.getItem(SCALE_KEY)).toBe('34')
  })

  it('画布居中锚定样式（fixed/50%/translate -50%），常量边界 10/1000 可达', () => {
    const canvas = document.createElement('canvas')
    const controller = createDisplayScaleController(canvas)
    expect(canvas.style.position).toBe('fixed')
    expect(canvas.style.left).toBe('50%')
    expect(canvas.style.top).toBe('50%')
    expect(canvas.style.transform).toBe('translate(-50%, -50%)')
    controller.setPercent(MIN_PERCENT)
    expect(canvas.style.width).toBe('96px') // 320 * 3 * 0.1
    controller.setPercent(MAX_PERCENT)
    expect(canvas.style.height).toBe('6000px') // 200 * 3 * 10
  })

  it('toggleFullscreen：无全屏元素 → canvas.requestFullscreen；有 → exitFullscreen', () => {
    const canvas = document.createElement('canvas')
    const request = vi.fn(() => Promise.resolve())
    Object.defineProperty(canvas, 'requestFullscreen', { configurable: true, value: request })
    const fullscreenElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
    const exitFullscreen = Object.getOwnPropertyDescriptor(document, 'exitFullscreen')
    try {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
      const controller = createDisplayScaleController(canvas)
      controller.toggleFullscreen()
      expect(request).toHaveBeenCalledTimes(1)
      const exit = vi.fn(() => Promise.resolve())
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: document.body,
      })
      Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit })
      controller.toggleFullscreen()
      expect(exit).toHaveBeenCalledTimes(1)
      expect(request).toHaveBeenCalledTimes(1)
    } finally {
      if (fullscreenElement) Object.defineProperty(document, 'fullscreenElement', fullscreenElement)
      else Reflect.deleteProperty(document, 'fullscreenElement')
      if (exitFullscreen) Object.defineProperty(document, 'exitFullscreen', exitFullscreen)
      else Reflect.deleteProperty(document, 'exitFullscreen')
    }
  })
})
