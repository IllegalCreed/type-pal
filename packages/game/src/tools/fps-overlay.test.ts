// fps-overlay.test.ts —— 左上角 FPS 覆盖层:持久化 + 采样算法 + 显隐(jsdom)。
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { hideFpsOverlay, isFpsEnabled, setFpsEnabled, tickFps } from './fps-overlay.js'

const SOURCE = resolve(process.cwd(), 'src/tools/fps-overlay.ts')
const THRESHOLD = "v.className = fps >= 50 ? 'v' : 'v lo'"

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

  it('relaxing fps >= 50 to fps >= 49 makes the 49-red contract AssertionError-red', () => {
    const before = createHash('sha256').update(readFileSync(SOURCE)).digest('hex')
    const text = readFileSync(SOURCE, 'utf8')
    expect(text).toContain(THRESHOLD)
    const mutant = text.replace('fps >= 50', 'fps >= 49')
    expect(mutant).not.toBe(text)
    const className = (source: string, fps: number) => {
      const threshold = Number(/fps >= (\d+)/.exec(source)?.[1])
      return fps >= threshold ? 'v' : 'v lo'
    }
    expect(className(text, 50)).toBe('v')
    expect(className(text, 49)).toBe('v lo')
    expect(() => {
      expect(className(mutant, 49)).toBe('v lo')
    }).toThrowError(/expected|AssertionError/i)
    expect(createHash('sha256').update(readFileSync(SOURCE)).digest('hex')).toBe(before)
  })
})
