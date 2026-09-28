/**
 * TEST-GLM-PHASE1-LEAVES-3 L21（index.ts）— 去重表：
 *  - index.test（启用起表/覆盖层/默认参考线/F4/F8/F2/暂停冻结）→ 不重复
 *  - 新差异：setupSpeedrunHotkeys 返回的解绑函数移除监听（解绑后 F4 不再重置/不弹 toast）、
 *    未启用时按键直接短路。
 * 默认不启用真实游戏计时器业务；只在自有 localStorage profile 验证。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetSpeedrunForTest, setupSpeedrunHotkeys } from './index.js'

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  __resetSpeedrunForTest()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('L21 setupSpeedrunHotkeys 解绑', () => {
  it('启用时 F4 弹重置 toast；解绑后 F4 无新 toast', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    const unbind = setupSpeedrunHotkeys()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F4' }))
    const container = document.getElementById('tp-toast-container')
    const toastsAfterFirst = container?.childElementCount ?? 0
    expect(toastsAfterFirst).toBeGreaterThan(0)
    unbind()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F4' }))
    expect(document.getElementById('tp-toast-container')?.childElementCount).toBe(toastsAfterFirst)
  })

  it('未启用时按键短路（无 toast、无覆盖层）；解绑函数幂等可重复调', () => {
    const unbind = setupSpeedrunHotkeys()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F4' }))
    expect(document.getElementById('tp-toast-container')).toBeNull()
    unbind()
    unbind() // 幂等
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F4' }))
    expect(document.getElementById('tp-toast-container')).toBeNull()
  })
})
