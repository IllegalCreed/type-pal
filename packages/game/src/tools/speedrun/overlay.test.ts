import { afterEach, describe, expect, it } from 'vitest'
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
afterEach(() => hideOverlay())

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
  it('hideOverlay 移除', () => {
    renderOverlay(run({}), CHECKPOINTS, {})
    hideOverlay()
    expect(document.getElementById('tp-speedrun-overlay')).toBeNull()
  })
})
