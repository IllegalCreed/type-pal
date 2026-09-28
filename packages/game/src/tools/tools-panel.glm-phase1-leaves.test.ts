/**
 * TEST-GLM-PHASE1-LEAVES-3 L17（tools-panel.ts）— 去重表：
 *  - tools-panel.test（框架/反引号/×关闭/tab 切换/场景/快捷键/对话/系统音频/主静音/计时器/
 *    战斗敌方/250ms 轮询）→ 不重复
 *  - 新差异：显示区缩放滑块 input → displayScale.setPercent(posToPct(v)) 对数刻度委托与
 *    % 文案同步、全屏按钮 → toggleFullscreen、左上角 FPS 开关 → setFpsEnabled 委派
 *    （经 localStorage 持久值可观察）。
 * 只证公开动作到注入依赖的参数（不触真实缩放/全屏/存档写盘）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../core/game-state.js'
import type { AudioVolumeController } from '../shell/audio-volume.js'
import { __resetSpeedrunForTest } from './speedrun/index.js'
import { setupToolsPanel, type ToolsPanelDeps } from './tools-panel.js'

function mkVol(): AudioVolumeController {
  return {
    getVolume: () => 0.8,
    setVolume: vi.fn(),
    isMuted: () => false,
    setMuted: vi.fn(),
  }
}

function mkDeps(over: Partial<ToolsPanelDeps> = {}): ToolsPanelDeps {
  return {
    getGs: () => createInitialGameState({ x: 0, y: 0, facing: 'down' }),
    getResources: () => ({ playerRoles: { roles: [] }, objectPoisons: [], items: [] }) as never,
    displayScale: {
      getPercent: () => 100,
      setPercent: vi.fn(),
      toggleFullscreen: vi.fn(),
    },
    audioVolume: mkVol(),
    sfxVolume: mkVol(),
    videoVolume: mkVol(),
    saveSlot: async () => {},
    loadSlot: async () => null,
    ...over,
  }
}

function openSystemTab(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
  ;[...document.querySelectorAll('.tp-tab')]
    .find((b) => b.textContent === '系统')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = ''
  document.getElementById('tp-tools-style')?.remove()
  document.getElementById('tp-fps-style')?.remove()
  localStorage.removeItem('tp-fps-show')
  __resetSpeedrunForTest()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  localStorage.removeItem('tp-fps-show')
})

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

  it('全屏按钮 → toggleFullscreen；FPS 开关 → setFpsEnabled(true) 持久化 tp-fps-show=1', () => {
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
    // FPS toggle：默认关 → 勾选即委派 setFpsEnabled(true)（经持久化可观察）
    const fpsCheckbox = document.querySelector<HTMLInputElement>(
      '.tp-toggle input[type="checkbox"]',
    )!
    expect(fpsCheckbox.checked).toBe(false)
    fpsCheckbox.checked = true
    fpsCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
    expect(localStorage.getItem('tp-fps-show')).toBe('1')
    fpsCheckbox.checked = false
    fpsCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
    expect(localStorage.getItem('tp-fps-show')).toBe('0')
  })
})
