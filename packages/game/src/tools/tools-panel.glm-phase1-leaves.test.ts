/**
 * TEST-GLM-PHASE1-LEAVES-3 L17（tools-panel.ts）— 去重表：
 *  - tools-panel.test（框架/反引号/×关闭/tab 切换/场景/快捷键/对话/系统音频/主静音/计时器/
 *    战斗敌方/250ms 轮询）→ 不重复
 *  - 新差异：显示区缩放滑块 input → displayScale.setPercent(posToPct(v)) 对数刻度委托与
 *    % 文案同步、全屏按钮 → toggleFullscreen、左上角 FPS 开关 → setFpsEnabled 委派
 *    （经 localStorage 持久值可观察）。
 * 只证公开动作到注入依赖的参数（不触真实缩放/全屏/存档写盘）。
 */
import { describe, expect, it, vi } from 'vitest'
import { setupToolsPanel } from './tools-panel.js'
import { useToolsPanelTestHost } from './tools-panel.test-fixtures.js'

const mkDeps = useToolsPanelTestHost()

function openSystemTab(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
  ;[...document.querySelectorAll('.tp-tab')]
    .find((b) => b.textContent === '系统')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

describe('L17 tools-panel 显示区委托', () => {
  it('缩放滑块 input → setPercent(posToPct(v))（对数刻度 0.75→316%）并同步 % 文案', () => {
    const setPercent = vi.fn()
    setupToolsPanel(
      mkDeps({ displayScale: { getPercent: () => 100, setPercent, toggleFullscreen: vi.fn() } }),
    )
    openSystemTab()
    // 缩放滑块 = 系统 tab 首个 min=0 max=1 步进 0.001 的 range
    const scale = [...document.querySelectorAll<HTMLInputElement>('input[type="range"]')].find(
      (i) => i.min === '0' && i.max === '1',
    )!
    expect(scale).toBeDefined()
    scale.value = '0.75'
    scale.dispatchEvent(new Event('input', { bubbles: true }))
    expect(setPercent).toHaveBeenCalledWith(316) // round(10 * 10^1.5)
    expect(scale.closest('div')?.textContent).toContain('316%')
  })

  it('全屏按钮委托 toggleFullscreen 一次', () => {
    const toggleFullscreen = vi.fn()
    setupToolsPanel(
      mkDeps({
        displayScale: { getPercent: () => 100, setPercent: vi.fn(), toggleFullscreen },
      }),
    )
    openSystemTab()
    ;[...document.querySelectorAll('button')]
      .find((b) => b.textContent === '全屏')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(toggleFullscreen).toHaveBeenCalledTimes(1)
  })

  it('FPS 开关将开启/关闭持久化为 tp-fps-show=1/0', () => {
    setupToolsPanel(mkDeps())
    openSystemTab()
    // FPS toggle：默认关 → 勾选即委派 setFpsEnabled(true)（经持久化可观察）
    const fpsRow = [...document.querySelectorAll<HTMLLabelElement>('.tp-toggle')].find(
      (label) => label.textContent === '左上角显示 FPS',
    )
    expect(fpsRow).toBeDefined()
    const fpsCheckbox = fpsRow!.querySelector('input')!
    expect(fpsCheckbox.checked).toBe(false)
    fpsCheckbox.checked = true
    fpsCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
    expect(localStorage.getItem('tp-fps-show')).toBe('1')
    fpsCheckbox.checked = false
    fpsCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
    expect(localStorage.getItem('tp-fps-show')).toBe('0')
  })
})
