// index.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState, type GameState } from '../../core/game-state.js'
import {
  __resetSpeedrunForTest,
  getSpeedrunBests,
  getSpeedrunRun,
  isSpeedrunPaused,
  resetSpeedrun,
  setupSpeedrunHotkeys,
  tickSpeedrunTimer,
  toggleSpeedrunPause,
} from './index.js'
import { hideOverlay } from './overlay.js'

function makeState(over: Partial<GameState>): GameState {
  return {
    ...createInitialGameState({ x: 0, y: 0, facing: 'down' }),
    wNumScene: 1,
    ...over,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  document.body.replaceChildren()
  localStorage.clear()
  __resetSpeedrunForTest()
  resetSpeedrun()
})
let unbindHotkeys: (() => void) | null = null
afterEach(() => {
  hideOverlay()
  unbindHotkeys?.()
  unbindHotkeys = null
  vi.clearAllTimers()
  vi.useRealTimers()
  localStorage.clear()
  __resetSpeedrunForTest()
  document.body.replaceChildren()
})

describe('tickSpeedrunTimer', () => {
  it('未启用 → 不挂覆盖层、计时不动', () => {
    tickSpeedrunTimer(makeState({}), 1000)
    expect(document.getElementById('tp-speedrun-overlay')).toBeNull()
    expect(getSpeedrunRun().elapsedMs).toBe(0)
  })
  it('启用后起表、挂覆盖层、wall-clock 累加', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    tickSpeedrunTimer(makeState({ wNumScene: 1 }), 1000)
    tickSpeedrunTimer(makeState({ wNumScene: 1 }), 1500)
    expect(document.getElementById('tp-speedrun-overlay')).not.toBeNull()
    expect(getSpeedrunRun().elapsedMs).toBe(500)
  })
  it('show=0 时不挂覆盖层但仍计时', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    localStorage.setItem('tp-speedrun-show', '0')
    tickSpeedrunTimer(makeState({ wNumScene: 1 }), 0)
    tickSpeedrunTimer(makeState({ wNumScene: 1 }), 1000)
    expect(document.getElementById('tp-speedrun-overlay')).toBeNull()
    expect(getSpeedrunRun().elapsedMs).toBe(1000)
  })
})

describe('bests 默认播种', () => {
  it('首次读取用 CHECKPOINTS 默认参考线', () => {
    expect(getSpeedrunBests().clear).toBe(9_452_000) // CHECKPOINTS 的 2:37:32
  })
})

describe('setupSpeedrunHotkeys', () => {
  it('F4 启用时重置本局', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    unbindHotkeys = setupSpeedrunHotkeys()
    tickSpeedrunTimer(makeState({ wNumScene: 1 }), 0)
    tickSpeedrunTimer(makeState({ wNumScene: 1 }), 1000)
    expect(getSpeedrunRun().elapsedMs).toBe(1000)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F4' }))
    expect(getSpeedrunRun().phase).toBe('idle')
    expect(getSpeedrunRun().elapsedMs).toBe(0)
  })
  it('F4 未启用时不重置', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    unbindHotkeys = setupSpeedrunHotkeys()
    tickSpeedrunTimer(makeState({ wNumScene: 1 }), 0)
    tickSpeedrunTimer(makeState({ wNumScene: 1 }), 1000)
    localStorage.setItem('tp-speedrun-enabled', '0')
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F4' }))
    expect(getSpeedrunRun().elapsedMs).toBe(1000)
  })
  it('F8 启用时暂停本局', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    unbindHotkeys = setupSpeedrunHotkeys()
    tickSpeedrunTimer(makeState({ wNumScene: 1 }), 0)
    tickSpeedrunTimer(makeState({ wNumScene: 1 }), 1000)
    // 按键从 performance.now 取时，须与上一帧的 1000ms 对齐。
    vi.advanceTimersByTime(1000)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F8' }))
    expect(getSpeedrunRun().manualPaused).toBe(true)
  })
  it('F2 启用时切换覆盖层显隐设置', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    unbindHotkeys = setupSpeedrunHotkeys()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F2' }))
    expect(localStorage.getItem('tp-speedrun-show')).toBe('0')
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F2' }))
    expect(localStorage.getItem('tp-speedrun-show')).toBe('1')
  })
})

describe('isSpeedrunPaused (主循环冻结门控)', () => {
  it('手动暂停 → true(冻结游戏)', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    tickSpeedrunTimer(makeState({ wNumScene: 1 }), 0)
    toggleSpeedrunPause()
    expect(isSpeedrunPaused()).toBe(true)
  })
  it('未暂停 → false', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    tickSpeedrunTimer(makeState({ wNumScene: 1 }), 0)
    expect(isSpeedrunPaused()).toBe(false)
  })
  it('香蕉树暂停 → false(不冻结,否则走不过去捡香蕉)', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    localStorage.setItem('tp-speedrun-banana', '1')
    tickSpeedrunTimer(makeState({ wNumScene: 1 }), 0) // 起表
    tickSpeedrunTimer(
      makeState({ wNumScene: 177, party: { x: 1280, y: 720, facing: 'down' } }),
      100,
    ) // 站香蕉格(中间格,世界坐标)
    expect(getSpeedrunRun().bananaPaused).toBe(true)
    expect(isSpeedrunPaused()).toBe(false)
  })
})
