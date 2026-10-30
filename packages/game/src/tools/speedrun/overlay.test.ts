import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CHECKPOINTS } from './checkpoints.js'
import { hideOverlay, renderOverlay } from './overlay.js'
import type { RunState } from './timer.js'

const run = (o: Partial<RunState>): RunState => ({
  phase: 'running',
  elapsedMs: 0,
  stepIndex: 0,
  splits: CHECKPOINTS.map(() => null),
  bananaPaused: false,
  manualPaused: false,
  hasUnCheated: false,
  countdownEndMs: null,
  ...o,
})
function cleanupOverlay() {
  hideOverlay()
  document.getElementById('tp-speedrun-style')?.remove()
}
beforeEach(cleanupOverlay)
afterEach(cleanupOverlay)

describe('overlay', () => {
  it('渲染 21 行 + 主计时', () => {
    const bests = Object.fromEntries(CHECKPOINTS.map((c) => [c.id, c.defaultBestMs]))
    renderOverlay(run({ elapsedMs: 65_000 }), CHECKPOINTS, bests)
    const root = document.getElementById('tp-speedrun-overlay')
    expect(root).not.toBeNull()
    expect(root?.querySelectorAll('.tp-sr-row').length).toBe(21)
    expect(root?.querySelector('.tp-sr-clock')?.textContent).toBe('0:01:05.00')
  })
  it('暂停加 * 前缀', () => {
    const bests = Object.fromEntries(CHECKPOINTS.map((c) => [c.id, c.defaultBestMs]))
    renderOverlay(run({ bananaPaused: true, elapsedMs: 1000 }), CHECKPOINTS, bests)
    expect(document.querySelector('.tp-sr-clock')?.textContent).toBe('*0:00:01.00')
  })
  it('已完成节点显示最佳/差值，并用该差值推算预计通关', () => {
    const bests = Object.fromEntries(CHECKPOINTS.map((c) => [c.id, c.defaultBestMs]))
    bests.stele = 10_000
    bests.clear = 20_000
    renderOverlay(
      run({ stepIndex: 1, splits: [8_000, ...CHECKPOINTS.slice(1).map(() => null)] }),
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
    renderOverlay(run({}), CHECKPOINTS, {})
    expect(document.getElementById('tp-speedrun-overlay')).not.toBeNull()
    hideOverlay()
    expect(document.getElementById('tp-speedrun-overlay')).toBeNull()
    expect(() => hideOverlay()).not.toThrow()
    expect(document.getElementById('tp-speedrun-overlay')).toBeNull()
  })
})
