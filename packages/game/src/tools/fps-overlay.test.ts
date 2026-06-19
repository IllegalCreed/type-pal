// fps-overlay.test.ts —— 左上角 FPS 覆盖层:持久化 + 采样算法 + 显隐(jsdom)。
import { beforeEach, describe, expect, it } from 'vitest'
import { hideFpsOverlay, isFpsEnabled, setFpsEnabled, tickFps } from './fps-overlay.js'

const ROOT_ID = 'tp-fps-overlay'

describe('fps-overlay', () => {
  beforeEach(() => {
    setFpsEnabled(false) // 复位 module 内采样态 + 隐藏 overlay
    localStorage.clear()
    hideFpsOverlay()
  })

  it('isFpsEnabled / setFpsEnabled 持久化 localStorage', () => {
    expect(isFpsEnabled()).toBe(false)
    setFpsEnabled(true)
    expect(isFpsEnabled()).toBe(true)
    expect(localStorage.getItem('tp-fps-show')).toBe('1')
    setFpsEnabled(false)
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
})
