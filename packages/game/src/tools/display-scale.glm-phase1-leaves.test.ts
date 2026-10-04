/**
 * TEST-GLM-PHASE1-LEAVES-3 L19（display-scale.ts / fps-overlay.ts）— 去重表：
 *  - display-scale.test（默认 100/setPercent clamp 持久/1000%/读回）→ 不重复
 *  - fps-overlay.test（持久化/no-op/25-120fps/红绿阈值/启停脏帧）→ 不重复
 *  - 新差异：display-scale 非整数四舍五入、居中锚定样式、toggleFullscreen 委派
 *    requestFullscreen/exitFullscreen；fps-overlay hideFpsOverlay 从未创建时 no-op、
 *    创建后 hide 清 DOM 与样式留存、isFpsEnabled 非法值视为关。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDisplayScaleController, MAX_PERCENT, MIN_PERCENT } from './display-scale.js'
import { hideFpsOverlay, isFpsEnabled, setFpsEnabled, tickFps } from './fps-overlay.js'

const SCALE_KEY = 'tp-display-scale'
const FPS_KEY = 'tp-fps-show'
const FPS_ROOT = 'tp-fps-overlay'
const FPS_STYLE = 'tp-fps-style'

beforeEach(() => {
  localStorage.removeItem(SCALE_KEY)
  localStorage.removeItem(FPS_KEY)
  document.body.innerHTML = ''
  document.getElementById(FPS_STYLE)?.remove()
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.removeItem(SCALE_KEY)
  localStorage.removeItem(FPS_KEY)
  document.body.innerHTML = ''
  document.getElementById(FPS_STYLE)?.remove()
})

function mkCanvas(): HTMLCanvasElement {
  return document.createElement('canvas')
}

describe('L19 display-scale 剩余合同', () => {
  it('NaN setPercent 回到默认 100%，不写入 NaN CSS 或 localStorage', () => {
    const canvas = mkCanvas()
    const ctl = createDisplayScaleController(canvas)
    ctl.setPercent(Number.NaN)
    expect(ctl.getPercent()).toBe(100)
    expect(canvas.style.width).toBe('960px')
    expect(localStorage.getItem(SCALE_KEY)).toBe('100')
  })

  it('非整数 setPercent 四舍五入（clampPct round 分支）', () => {
    const canvas = mkCanvas()
    const ctl = createDisplayScaleController(canvas)
    ctl.setPercent(33.6)
    expect(ctl.getPercent()).toBe(34)
    expect(localStorage.getItem(SCALE_KEY)).toBe('34')
  })

  it('画布居中锚定样式（fixed/50%/translate -50%），常量边界 10/1000 可达', () => {
    const canvas = mkCanvas()
    const ctl = createDisplayScaleController(canvas)
    expect(canvas.style.position).toBe('fixed')
    expect(canvas.style.left).toBe('50%')
    expect(canvas.style.transform).toBe('translate(-50%, -50%)')
    ctl.setPercent(MIN_PERCENT)
    expect(canvas.style.width).toBe('96px') // 320 * 3 * 0.1
    ctl.setPercent(MAX_PERCENT)
    expect(canvas.style.height).toBe('6000px') // 200 * 3 * 10
  })

  it('toggleFullscreen：无全屏元素 → canvas.requestFullscreen；有 → exitFullscreen', () => {
    const canvas = mkCanvas()
    const req = vi.fn()
    Object.defineProperty(canvas, 'requestFullscreen', { configurable: true, value: req })
    const ctl = createDisplayScaleController(canvas)
    ctl.toggleFullscreen() // fullscreenElement 天然 undefined → 进全屏分支
    expect(req).toHaveBeenCalledTimes(1)
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.body,
    })
    try {
      const exit = vi.fn(() => Promise.resolve())
      Object.defineProperty(document, 'exitFullscreen', {
        configurable: true,
        value: exit,
      })
      try {
        ctl.toggleFullscreen()
        expect(exit).toHaveBeenCalledTimes(1)
      } finally {
        delete (document as { exitFullscreen?: unknown }).exitFullscreen
      }
    } finally {
      delete (document as { fullscreenElement?: unknown }).fullscreenElement
    }
  })
})

describe('L19 fps-overlay 剩余合同', () => {
  it('hideFpsOverlay 从未创建 → no-op 不抛', () => {
    expect(() => hideFpsOverlay()).not.toThrow()
  })

  it('启用建框后 hide 清根节点；样式留存（幂等注入不重复）；非法持久值视为关', () => {
    setFpsEnabled(true)
    tickFps(0) // 首帧建框
    expect(document.getElementById(FPS_ROOT)).not.toBeNull()
    const styleCount = () => document.querySelectorAll(`#${FPS_STYLE}`).length
    expect(styleCount()).toBe(1)
    hideFpsOverlay()
    expect(document.getElementById(FPS_ROOT)).toBeNull()
    expect(styleCount()).toBe(1) // 样式不随框删
    localStorage.setItem(FPS_KEY, 'xxx')
    expect(isFpsEnabled()).toBe(false) // 仅 '1' 为开
  })
})
