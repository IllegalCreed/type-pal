import { beforeEach, describe, expect, it } from 'vitest'
import { createDisplayScaleController } from './display-scale.js'

const mkCanvas = (): HTMLCanvasElement => document.createElement('canvas')

describe('display-scale', () => {
  beforeEach(() => localStorage.clear())

  it('默认 100% = 960×600(index.html 现状)', () => {
    const c = mkCanvas()
    const ctrl = createDisplayScaleController(c)
    expect(ctrl.getPercent()).toBe(100)
    expect(c.style.width).toBe('960px')
    expect(c.style.height).toBe('600px')
  })

  it('setPercent 改 canvas + 持久;clamp [10,1000]', () => {
    const c = mkCanvas()
    const ctrl = createDisplayScaleController(c)
    ctrl.setPercent(50)
    expect(ctrl.getPercent()).toBe(50)
    expect(c.style.width).toBe('480px') // 320 × 3 × 0.5
    expect(c.style.height).toBe('300px')
    expect(localStorage.getItem('tp-display-scale')).toBe('50')
    ctrl.setPercent(5)
    expect(ctrl.getPercent()).toBe(10) // 下限
    ctrl.setPercent(2000)
    expect(ctrl.getPercent()).toBe(1000) // 上限
  })

  it('1000% = 9600×6000', () => {
    const c = mkCanvas()
    const ctrl = createDisplayScaleController(c)
    ctrl.setPercent(1000)
    expect(c.style.width).toBe('9600px')
  })

  it('启动读回 localStorage', () => {
    localStorage.setItem('tp-display-scale', '200')
    const ctrl = createDisplayScaleController(mkCanvas())
    expect(ctrl.getPercent()).toBe(200)
  })
})
