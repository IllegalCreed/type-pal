// Real panel actions to narrow display ports; fullscreen permission and pixel scaling are separate contracts.
import { describe, expect, it, vi } from 'vitest'
import { setupToolsPanel } from './tools-panel.js'
import { openSystemTab, useToolsPanelTestHost } from './tools-panel.test-fixtures.js'

const makeDeps = useToolsPanelTestHost()

describe('Tools panel display controls', () => {
  it('缩放滑块 input → setPercent(posToPct(v))（对数刻度 0.75→316%）并同步 % 文案', () => {
    const setPercent = vi.fn()
    setupToolsPanel(
      makeDeps({ displayScale: { getPercent: () => 100, setPercent, toggleFullscreen: vi.fn() } }),
    )
    openSystemTab()
    // 缩放滑块 = 系统 tab 首个 min=0 max=1 步进 0.001 的 range
    const scale = [...document.querySelectorAll<HTMLInputElement>('input[type="range"]')].find(
      (i) => i.min === '0' && i.max === '1',
    )
    if (!scale) throw new Error('Display scale slider missing')
    scale.value = '0.75'
    scale.dispatchEvent(new Event('input', { bubbles: true }))
    expect(setPercent.mock.calls).toEqual([[316]]) // round(10 * 10^1.5)
    expect(scale.closest('div')?.textContent).toContain('316%')
  })

  it('全屏按钮委托 toggleFullscreen 一次', () => {
    const toggleFullscreen = vi.fn()
    setupToolsPanel(
      makeDeps({
        displayScale: { getPercent: () => 100, setPercent: vi.fn(), toggleFullscreen },
      }),
    )
    openSystemTab()
    const fullscreen = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '全屏',
    )
    if (!fullscreen) throw new Error('Fullscreen button missing')
    fullscreen.click()
    expect(toggleFullscreen).toHaveBeenCalledTimes(1)
  })

  it('FPS 开关将开启/关闭持久化为 tp-fps-show=1/0', () => {
    setupToolsPanel(makeDeps())
    openSystemTab()
    // FPS toggle：默认关 → 勾选即委派 setFpsEnabled(true)（经持久化可观察）
    const fpsRow = [...document.querySelectorAll<HTMLLabelElement>('.tp-toggle')].find(
      (label) => label.textContent === '左上角显示 FPS',
    )
    if (!fpsRow) throw new Error('FPS setting missing')
    const fpsCheckbox = fpsRow.querySelector('input')
    if (!fpsCheckbox) throw new Error('FPS checkbox missing')
    expect(fpsCheckbox.checked).toBe(false)
    fpsCheckbox.checked = true
    fpsCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
    expect(localStorage.getItem('tp-fps-show')).toBe('1')
    fpsCheckbox.checked = false
    fpsCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
    expect(localStorage.getItem('tp-fps-show')).toBe('0')
  })
})
