/**
 * TEST-GLM-PHASE1-LEAVES-3 L21（overlay.ts）— 去重表：
 *  - overlay.test（渲染 21 行+主计时/暂停 * 前缀/hideOverlay 移除）→ 不重复
 *  - 新差异：renderOverlay 二次调用原位更新（单根节点不重复建）、样式注入幂等、
 *    hideOverlay 幂等（二次移除不抛）。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CHECKPOINTS } from './checkpoints.js'
import { hideOverlay, injectOverlayStyles, renderOverlay } from './overlay.js'
import type { BestTimes } from './store.js'

const ROOT_ID = 'tp-speedrun-overlay'

beforeEach(() => {
  document.body.innerHTML = ''
  document.getElementById('tp-speedrun-overlay-style')?.remove()
})

afterEach(() => {
  hideOverlay()
})

function run(): Parameters<typeof renderOverlay>[0] {
  return {
    phase: 'running',
    elapsedMs: 65_432,
    stepIndex: 1,
    splits: [12_345, null],
    bananaPaused: false,
    manualPaused: false,
    hasUnCheated: false,
    countdownEndMs: null,
  }
}

function bests(): BestTimes {
  return Object.fromEntries(CHECKPOINTS.map((c) => [c.id, c.defaultBestMs]))
}

describe('L21 overlay 原位更新与幂等', () => {
  it('render 两次 → 单根节点、文本随数据更新', () => {
    renderOverlay(run(), CHECKPOINTS, bests())
    const first = document.getElementById(ROOT_ID)!
    renderOverlay({ ...run(), elapsedMs: 99_999 }, CHECKPOINTS, bests())
    const second = document.getElementById(ROOT_ID)
    expect(second).toBe(first)
    expect(document.querySelectorAll(`#${ROOT_ID}`)).toHaveLength(1)
    expect(first.textContent).toContain('1:39.99') // 99999ms → 1:39.99
  })

  it('injectOverlayStyles 幂等；hideOverlay 二次调用不抛', () => {
    injectOverlayStyles()
    const styles = document.querySelectorAll('style').length
    injectOverlayStyles()
    expect(document.querySelectorAll('style').length).toBe(styles)
    hideOverlay()
    expect(() => hideOverlay()).not.toThrow()
  })
})
