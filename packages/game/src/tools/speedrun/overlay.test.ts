import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getLanguage, useFallbackLanguage } from '../../localization/language.js'
import { CHECKPOINTS } from './checkpoints.js'
import { hideOverlay, injectOverlayStyles, renderOverlay } from './overlay.js'
import type { BestTimes } from './store.js'
import type { RunState } from './timer.js'

const ROOT_ID = 'tp-speedrun-overlay'
const STYLE_ID = 'tp-speedrun-style'
let previousLanguage = getLanguage()
let previousHtmlLanguage: string | null = null
function clearOverlayNodes() {
  hideOverlay()
  document.getElementById(STYLE_ID)?.remove()
}
beforeEach(() => {
  previousLanguage = getLanguage()
  previousHtmlLanguage = document.documentElement.getAttribute('lang')
  clearOverlayNodes()
  useFallbackLanguage('zh-CN')
})
afterEach(() => {
  try {
    clearOverlayNodes()
  } finally {
    useFallbackLanguage(previousLanguage)
    if (previousHtmlLanguage === null) document.documentElement.removeAttribute('lang')
    else document.documentElement.lang = previousHtmlLanguage
  }
})

const runState = (overrides: Partial<RunState>): RunState => ({
  phase: 'running',
  elapsedMs: 0,
  stepIndex: 0,
  splits: CHECKPOINTS.map(() => null),
  bananaPaused: false,
  manualPaused: false,
  hasUnCheated: false,
  countdownEndMs: null,
  ...overrides,
})

function defaultBestTimes(): BestTimes {
  return Object.fromEntries(CHECKPOINTS.map((c) => [c.id, c.defaultBestMs]))
}

describe('Run rows, clock and lifecycle', () => {
  it('渲染 21 行 + 主计时', () => {
    const bests = defaultBestTimes()
    renderOverlay(runState({ elapsedMs: 65_000 }), CHECKPOINTS, bests)
    const root = document.getElementById('tp-speedrun-overlay')
    expect(root).not.toBeNull()
    expect(root?.querySelectorAll('.tp-sr-row').length).toBe(21)
    expect(root?.querySelector('.tp-sr-clock')?.textContent).toBe('0:01:05.00')
  })
  it('暂停加 * 前缀', () => {
    const bests = defaultBestTimes()
    renderOverlay(runState({ bananaPaused: true, elapsedMs: 1000 }), CHECKPOINTS, bests)
    expect(document.querySelector('.tp-sr-clock')?.textContent).toBe('*0:00:01.00')
  })
  it('已完成节点显示最佳/差值，并用该差值推算预计通关', () => {
    const bests = defaultBestTimes()
    bests.stele = 10_000
    bests.clear = 20_000
    renderOverlay(
      runState({
        elapsedMs: 8_000,
        stepIndex: 1,
        splits: [8_000, ...CHECKPOINTS.slice(1).map(() => null)],
      }),
      CHECKPOINTS,
      bests,
    )

    const first = document.querySelector('.tp-sr-row')
    expect(first?.querySelector('.tp-sr-best')?.textContent).toBe('0:00:10')
    expect(first?.querySelector('.tp-sr-diff')?.textContent).toBe('-0:02')
    expect(first?.querySelector('.tp-sr-diff')?.className).toContain('fast')
    expect(document.querySelector('.tp-sr-eta')?.textContent).toBe('预计通关 0:00:18')
  })
  it('hideOverlay 移除真实根节点，再次移除保持为空', () => {
    renderOverlay(runState({}), CHECKPOINTS, {})
    expect(document.getElementById('tp-speedrun-overlay')).not.toBeNull()
    hideOverlay()
    expect(document.getElementById('tp-speedrun-overlay')).toBeNull()
    expect(() => hideOverlay()).not.toThrow()
    expect(document.getElementById('tp-speedrun-overlay')).toBeNull()
  })
})

describe('In-place updates and stylesheet ownership', () => {
  it('render 两次：同一 RunState 原位变化，保留根节点并更新主计时', () => {
    const state = runState({
      elapsedMs: 65_432,
      stepIndex: 1,
      splits: [12_345, ...CHECKPOINTS.slice(1).map(() => null)],
    })
    renderOverlay(state, CHECKPOINTS, defaultBestTimes())
    const first = document.getElementById(ROOT_ID)!
    state.elapsedMs = 99_999
    renderOverlay(state, CHECKPOINTS, defaultBestTimes())
    const second = document.getElementById(ROOT_ID)
    expect(second).toBe(first)
    expect(document.querySelectorAll(`#${ROOT_ID}`)).toHaveLength(1)
    expect(first.textContent).toContain('1:39.99')
    expect(first.querySelector('.tp-sr-clock')?.textContent).toBe('0:01:39.99')
  })
  it('injectOverlayStyles 创建指定样式，二次注入保留同一节点', () => {
    expect(document.getElementById(STYLE_ID)).toBeNull()
    injectOverlayStyles()
    const style = document.getElementById(STYLE_ID)
    expect(style).toBeInstanceOf(HTMLStyleElement)
    expect(style?.textContent).toContain('#tp-speedrun-overlay')
    expect(style?.textContent).toContain('pointer-events:none')
    injectOverlayStyles()
    expect(document.querySelectorAll(`#${STYLE_ID}`)).toHaveLength(1)
    expect(document.getElementById(STYLE_ID)).toBe(style)
  })
})
