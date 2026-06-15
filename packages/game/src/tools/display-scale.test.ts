import { beforeEach, describe, expect, it } from 'vitest'
import { createDisplayScaleController } from './display-scale.js'

const mkCanvas = (): HTMLCanvasElement => document.createElement('canvas')

describe('display-scale', () => {
  beforeEach(() => localStorage.clear())

  it('默认 3×(保持 index.html 现状);setMode(N) 改 CSS(320×200 × N) + 持久', () => {
    const c = mkCanvas()
    const ctrl = createDisplayScaleController(c)
    expect(ctrl.getMode()).toBe(3)
    expect(c.style.width).toBe('960px')
    ctrl.setMode(4)
    expect(ctrl.getMode()).toBe(4)
    expect(c.style.width).toBe('1280px')
    expect(c.style.height).toBe('800px')
    expect(localStorage.getItem('tp-display-scale')).toBe('4')
  })

  it('setMode(fit) 写回 fit + 持久(等比 CSS 用 min(),jsdom 不解析 → 浏览器眼校)', () => {
    const c = mkCanvas()
    const ctrl = createDisplayScaleController(c)
    ctrl.setMode(3)
    ctrl.setMode('fit')
    expect(ctrl.getMode()).toBe('fit')
    expect(localStorage.getItem('tp-display-scale')).toBe('fit')
  })

  it('启动读回 localStorage', () => {
    localStorage.setItem('tp-display-scale', '2')
    const c = mkCanvas()
    const ctrl = createDisplayScaleController(c)
    expect(ctrl.getMode()).toBe(2)
    expect(c.style.width).toBe('640px')
  })
})
