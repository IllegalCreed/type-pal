import { afterEach, describe, expect, it, vi } from 'vitest'
import { waitForKey } from './ending-player.js'

describe('waitForKey(PAL_WaitForKey(0) port — dos-cutscenes 结局演职员表前等键)', () => {
  afterEach(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
    if (vi.isFakeTimers()) await vi.runAllTimersAsync()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  it('默认键表:非命中键不拦截不 resolve;Enter 命中 resolve 并释放监听(再次 Enter 不再拦截)', async () => {
    const p = waitForKey()
    const stray = new KeyboardEvent('keydown', { code: 'KeyZ', cancelable: true })
    expect(window.dispatchEvent(stray)).toBe(true) // 未拦截
    expect(stray.defaultPrevented).toBe(false)

    let resolved = false
    void p.then(() => {
      resolved = true
    })
    await Promise.resolve()
    expect(resolved).toBe(false)

    const hit = new KeyboardEvent('keydown', { code: 'Enter', cancelable: true })
    expect(window.dispatchEvent(hit)).toBe(false) // 命中并 preventDefault
    await p
    expect(resolved).toBe(true)

    const again = new KeyboardEvent('keydown', { code: 'Enter', cancelable: true })
    expect(window.dispatchEvent(again)).toBe(true) // 监听已移除
    expect(again.defaultPrevented).toBe(false)
  })
  it('自定义键表覆盖默认:Space 不再命中,KeyQ 命中', async () => {
    const p = waitForKey(['KeyQ'])
    const space = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    expect(window.dispatchEvent(space)).toBe(true)
    await Promise.resolve()
    let resolved = false
    void p.then(() => {
      resolved = true
    })
    await Promise.resolve()
    expect(resolved).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', cancelable: true }))
    await p
  })
})
