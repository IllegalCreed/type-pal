/**
 * TEST-GLM-PHASE1-LEAVES-3 L21（index.ts）— 去重表：
 *  - index.test（启用起表/覆盖层/默认参考线/F4/F8/F2/暂停冻结）→ 不重复
 *  - 新差异：setupSpeedrunHotkeys 返回的解绑函数移除监听（解绑后 F4 不再重置/不弹 toast）、
 *    未启用时按键直接短路。
 * 通过合法 GameState 实际起表，解绑后同时观察计时与 toast；每例清理自己的键盘监听和定时器。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../../core/game-state.js'
import {
  __resetSpeedrunForTest,
  getSpeedrunRun,
  setupSpeedrunHotkeys,
  tickSpeedrunTimer,
} from './index.js'

let unbindHotkeys: (() => void) | undefined

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  __resetSpeedrunForTest()
  document.body.innerHTML = ''
})

afterEach(() => {
  unbindHotkeys?.()
  unbindHotkeys = undefined
  __resetSpeedrunForTest()
  vi.clearAllTimers()
  vi.useRealTimers()
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('L21 setupSpeedrunHotkeys 解绑', () => {
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
