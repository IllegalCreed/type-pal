// index.test.ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GameState } from '../../core/game-state.js'
import { hideOverlay } from './overlay.js'
import { __resetSpeedrunForTest, getSpeedrunBests, getSpeedrunRun, resetSpeedrun, tickSpeedrunTimer } from './index.js'

const fakeGs = (o: Partial<GameState>): GameState =>
  ({ wNumScene: 1, party: { x: 0, y: 0, facing: 0 }, wNumMusic: 0, inventory: [], battleState: undefined, ...o }) as unknown as GameState

beforeEach(() => {
  localStorage.clear()
  __resetSpeedrunForTest()
  resetSpeedrun()
})
afterEach(() => hideOverlay())

describe('tickSpeedrunTimer', () => {
  it('未启用 → 不挂覆盖层、计时不动', () => {
    tickSpeedrunTimer(fakeGs({}), 1000)
    expect(document.getElementById('tp-speedrun-overlay')).toBeNull()
  })
  it('启用后起表、挂覆盖层、wall-clock 累加', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    tickSpeedrunTimer(fakeGs({ wNumScene: 1 }), 1000)
    tickSpeedrunTimer(fakeGs({ wNumScene: 1 }), 1500)
    expect(document.getElementById('tp-speedrun-overlay')).not.toBeNull()
    expect(getSpeedrunRun().elapsedMs).toBe(500)
  })
  it('show=0 时不挂覆盖层但仍计时', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    localStorage.setItem('tp-speedrun-show', '0')
    tickSpeedrunTimer(fakeGs({ wNumScene: 1 }), 0)
    tickSpeedrunTimer(fakeGs({ wNumScene: 1 }), 1000)
    expect(document.getElementById('tp-speedrun-overlay')).toBeNull()
    expect(getSpeedrunRun().elapsedMs).toBe(1000)
  })
})

describe('bests 默认播种', () => {
  it('首次读取用 CHECKPOINTS 默认参考线', () => {
    expect(getSpeedrunBests()['clear']).toBeGreaterThan(0)
  })
})
