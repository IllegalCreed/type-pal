import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hideFpsOverlay, isFpsEnabled, setFpsEnabled, tickFps } from './fps-overlay.js'

const ROOT_ID = 'tp-fps-overlay'
const STYLE_ID = 'tp-fps-style'
const FPS_KEY = 'tp-fps-show'
let previousPreference: string | null
let previousLayout: string | undefined
beforeEach(() => {
  previousPreference = localStorage.getItem(FPS_KEY)
  previousLayout = document.documentElement.dataset.tpLayout
  document.documentElement.dataset.tpLayout = 'desktop'
  setFpsEnabled(false)
  localStorage.removeItem(FPS_KEY)
  document.getElementById(STYLE_ID)?.remove()
})
afterEach(() => {
  setFpsEnabled(false)
  document.getElementById(STYLE_ID)?.remove()
  if (previousPreference === null) localStorage.removeItem(FPS_KEY)
  else localStorage.setItem(FPS_KEY, previousPreference)
  if (previousLayout === undefined) delete document.documentElement.dataset.tpLayout
  else document.documentElement.dataset.tpLayout = previousLayout
})
describe('FPS overlay sampling and visibility', () => {
  it('isFpsEnabled / setFpsEnabled 持久化 localStorage', () => {
    expect(isFpsEnabled()).toBe(false)
    setFpsEnabled(true)
    expect(isFpsEnabled()).toBe(true)
    expect(localStorage.getItem('tp-fps-show')).toBe('1')
    setFpsEnabled(false)
    expect(isFpsEnabled()).toBe(false)
    localStorage.setItem(FPS_KEY, 'xxx')
    expect(isFpsEnabled()).toBe(false)
  })

  it('未启用 → tickFps 纯 no-op,不建 overlay', () => {
    tickFps(0)
    tickFps(16)
    expect(document.getElementById(ROOT_ID)).toBeNull()
  })

  it('启用 → 首帧立即建框,采样窗满后显示正确 FPS(120fps 模拟)', () => {
    setFpsEnabled(true)
    tickFps(0) // 锚点 + 立即建框
    expect(document.getElementById(ROOT_ID)).not.toBeNull()
    // 模拟 120fps:8.333ms/帧,跑 ~600ms(跨过 500ms 采样窗)
    let t = 0
    for (let i = 0; i < 72; i++) {
      t += 1000 / 120
      tickFps(t)
    }
    const shown = Number(document.getElementById(ROOT_ID)?.textContent?.replace(/\D/g, ''))
    expect(shown).toBeGreaterThanOrEqual(110)
    expect(shown).toBeLessThanOrEqual(125)
  })

  it('启用 → 25fps(逻辑 tick 量化)如实显示 ~25', () => {
    setFpsEnabled(true)
    tickFps(0)
    let t = 0
    for (let i = 0; i < 20; i++) {
      t += 40 // 25fps
      tickFps(t)
    }
    const shown = Number(document.getElementById(ROOT_ID)?.textContent?.replace(/\D/g, ''))
    expect(shown).toBeGreaterThanOrEqual(22)
    expect(shown).toBeLessThanOrEqual(28)
  })

  it('setFpsEnabled(false) → 立即隐藏 overlay', () => {
    setFpsEnabled(true)
    tickFps(0)
    expect(document.getElementById(ROOT_ID)).not.toBeNull()
    setFpsEnabled(false)
    expect(document.getElementById(ROOT_ID)).toBeNull()
  })

  it('启用中途关闭(localStorage 改 0)→ tickFps 自清 overlay', () => {
    setFpsEnabled(true)
    tickFps(0)
    expect(document.getElementById(ROOT_ID)).not.toBeNull()
    localStorage.setItem('tp-fps-show', '0') // 模拟外部关闭(不走 setFpsEnabled)
    tickFps(8)
    expect(document.getElementById(ROOT_ID)).toBeNull()
  })

  it('采样满窗后 ≥50 为绿、<50 为红；49 不得误标绿', () => {
    setFpsEnabled(true)
    tickFps(0)
    for (let i = 1; i <= 25; i++) tickFps(i * 20)
    expect(document.querySelector('#tp-fps-overlay .v')?.className).toBe('v')
    expect(document.querySelector('#tp-fps-overlay .v.lo')).toBeNull()
    expect(document.querySelector('#tp-fps-overlay .v')?.textContent).toBe('50')

    setFpsEnabled(false)
    setFpsEnabled(true)
    tickFps(0)
    for (let i = 1; i <= 25; i++) tickFps(i * (510 / 25))
    expect(document.querySelector('#tp-fps-overlay .v.lo')).not.toBeNull()
    expect(document.querySelector('#tp-fps-overlay .v')?.textContent).toBe('49')
  })

  it('连续启停丢弃未满窗的脏帧计数，下一窗按新节奏采样', () => {
    setFpsEnabled(true)
    tickFps(0)
    for (let i = 1; i <= 10; i++) tickFps(i * 8)
    setFpsEnabled(false)
    setFpsEnabled(true)
    tickFps(10_000)
    for (let i = 1; i <= 25; i++) tickFps(10_000 + i * 20)
    expect(document.querySelector('#tp-fps-overlay .v')?.textContent).toBe('50')
    expect(document.querySelector('#tp-fps-overlay .v.lo')).toBeNull()
  })

  it('Hiding an absent overlay is harmless', () => {
    expect(() => hideFpsOverlay()).not.toThrow()
  })

  it('Hiding removes only the root and retains its style', () => {
    setFpsEnabled(true)
    tickFps(0) // 首帧建框
    expect(document.getElementById(ROOT_ID)).not.toBeNull()
    const styleCount = () => document.querySelectorAll(`#${STYLE_ID}`).length
    expect(styleCount()).toBe(1)
    hideFpsOverlay()
    expect(document.getElementById(ROOT_ID)).toBeNull()
    expect(styleCount()).toBe(1) // 样式不随框删
  })
})
