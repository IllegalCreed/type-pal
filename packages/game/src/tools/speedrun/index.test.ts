import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameState } from '../../core/game-state.js'
import { createInitialGameState } from '../../core/game-state.js'
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

const OWNED_STORAGE_KEYS = [
  'tp-speedrun-enabled',
  'tp-speedrun-show',
  'tp-speedrun-banana',
  'tp-speedrun-bests',
] as const
const OWNED_NODE_IDS = [
  'tp-speedrun-overlay',
  'tp-speedrun-countdown',
  'tp-toast-container',
  'tp-speedrun-style',
] as const
const previousValues = new Map<string, string | null>()
let previousLayout: string | undefined
let unbindHotkeys: (() => void) | null = null
function clearOwnedNodes() {
  for (const id of OWNED_NODE_IDS) document.getElementById(id)?.remove()
}
beforeEach(() => {
  previousValues.clear()
  for (const key of OWNED_STORAGE_KEYS) {
    previousValues.set(key, localStorage.getItem(key))
    localStorage.removeItem(key)
  }
  previousLayout = document.documentElement.dataset.tpLayout
  document.documentElement.dataset.tpLayout = 'desktop'
  vi.useFakeTimers()
  clearOwnedNodes()
  __resetSpeedrunForTest()
  resetSpeedrun()
})
afterEach(() => {
  try {
    unbindHotkeys?.()
  } finally {
    unbindHotkeys = null
    __resetSpeedrunForTest()
    vi.clearAllTimers()
    vi.useRealTimers()
    clearOwnedNodes()
    for (const [key, value] of previousValues) {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    }
    if (previousLayout === undefined) delete document.documentElement.dataset.tpLayout
    else document.documentElement.dataset.tpLayout = previousLayout
  }
})

function gameState(overrides: Partial<GameState>): GameState {
  return {
    ...createInitialGameState({ x: 0, y: 0, facing: 'down' }),
    wNumScene: 1,
    ...overrides,
  }
}

describe('tickSpeedrunTimer', () => {
  it('未启用 → 不挂覆盖层、计时不动', () => {
    tickSpeedrunTimer(gameState({}), 1000)
    expect(document.getElementById('tp-speedrun-overlay')).toBeNull()
    expect(getSpeedrunRun().elapsedMs).toBe(0)
  })
  it('启用后起表、挂覆盖层、wall-clock 累加', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    tickSpeedrunTimer(gameState({ wNumScene: 1 }), 1000)
    tickSpeedrunTimer(gameState({ wNumScene: 1 }), 1500)
    expect(document.getElementById('tp-speedrun-overlay')).not.toBeNull()
    expect(getSpeedrunRun().elapsedMs).toBe(500)
  })
  it('show=0 时不挂覆盖层但仍计时', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    localStorage.setItem('tp-speedrun-show', '0')
    tickSpeedrunTimer(gameState({ wNumScene: 1 }), 0)
    tickSpeedrunTimer(gameState({ wNumScene: 1 }), 1000)
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
  it('F4 未启用时不重置', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    unbindHotkeys = setupSpeedrunHotkeys()
    tickSpeedrunTimer(gameState({ wNumScene: 1 }), 0)
    tickSpeedrunTimer(gameState({ wNumScene: 1 }), 1000)
    localStorage.setItem('tp-speedrun-enabled', '0')
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F4' }))
    expect(getSpeedrunRun().elapsedMs).toBe(1000)
  })
  it('F8 启用时暂停本局', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    unbindHotkeys = setupSpeedrunHotkeys()
    tickSpeedrunTimer(gameState({ wNumScene: 1 }), 0)
    tickSpeedrunTimer(gameState({ wNumScene: 1 }), 1000)
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
    tickSpeedrunTimer(gameState({ wNumScene: 1 }), 0)
    toggleSpeedrunPause()
    expect(isSpeedrunPaused()).toBe(true)
  })
  it('未暂停 → false', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    tickSpeedrunTimer(gameState({ wNumScene: 1 }), 0)
    expect(isSpeedrunPaused()).toBe(false)
  })
  it('香蕉树暂停 → false(不冻结,否则走不过去捡香蕉)', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    localStorage.setItem('tp-speedrun-banana', '1')
    tickSpeedrunTimer(gameState({ wNumScene: 1 }), 0) // 起表
    tickSpeedrunTimer(
      gameState({ wNumScene: 177, party: { x: 1280, y: 720, facing: 'down' } }),
      100,
    ) // 站香蕉格(中间格,世界坐标)
    expect(getSpeedrunRun().bananaPaused).toBe(true)
    expect(isSpeedrunPaused()).toBe(false)
  })
})

describe('Speedrun hotkeys and teardown', () => {
  it('启用时 F4 重置；解绑后 F4 不改变计时且无新 toast', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    unbindHotkeys = setupSpeedrunHotkeys()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wNumScene = 1
    tickSpeedrunTimer(gs, 0)
    tickSpeedrunTimer(gs, 1000)
    expect(getSpeedrunRun().elapsedMs).toBe(1000)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F4' }))
    expect(getSpeedrunRun().phase).toBe('idle')
    expect(getSpeedrunRun().elapsedMs).toBe(0)
    const container = document.getElementById('tp-toast-container')
    const toastsAfterFirst = container?.childElementCount ?? 0
    expect(toastsAfterFirst).toBe(1)
    tickSpeedrunTimer(gs, 2000)
    tickSpeedrunTimer(gs, 2500)
    expect(getSpeedrunRun().elapsedMs).toBe(500)
    unbindHotkeys()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F4' }))
    expect(getSpeedrunRun().elapsedMs).toBe(500)
    expect(getSpeedrunRun().phase).toBe('running')
    expect(document.getElementById('tp-toast-container')?.childElementCount).toBe(toastsAfterFirst)
  })
  it('未启用时按键短路（无 toast）；解绑函数幂等可重复调', () => {
    unbindHotkeys = setupSpeedrunHotkeys()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F4' }))
    expect(document.getElementById('tp-toast-container')).toBeNull()
    unbindHotkeys()
    unbindHotkeys() // 幂等
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F4' }))
    expect(document.getElementById('tp-toast-container')).toBeNull()
  })
})
