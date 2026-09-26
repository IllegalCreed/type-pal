// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  button,
  cleanupDebug,
  command,
  debugHarness,
  element,
} from './__tests__/debug-tools-fixtures.js'

afterEach(cleanupDebug)
describe('Debug layer and navigation actions', () => {
  test('console and checkbox layer toggles share one model and do not enable frame stepping implicitly', async () => {
    const h = await debugHarness()
    button('图层').click()
    const [collision, triggers, step] = [
      ...document.querySelectorAll<HTMLInputElement>('.tpd-toggle input'),
    ]
    expect([collision!.checked, triggers!.checked, step!.checked]).toEqual([false, true, false])
    command('collision')
    command('triggers')
    expect(h.ctx.layers).toEqual({ collision: true, triggers: false })
    expect([collision!.checked, triggers!.checked]).toEqual([true, false])
    collision!.click()
    triggers!.click()
    expect(h.ctx.layers).toEqual({ collision: false, triggers: true })
    step!.click()
    expect(h.ctx.frameStep.active).toBe(true)
    button('▶ 单步（一拍 = 100ms）').click()
    expect(h.requestStep).toHaveBeenCalledOnce()
    step!.click()
    command('step')
    expect(h.ctx.frameStep.active).toBe(false)
    expect(h.requestStep).toHaveBeenCalledTimes(2)
  })
  test('tab keyboard wraps left/up, supports Home/End/down and leaves unrelated keys alone', async () => {
    await debugHarness()
    const key = (name: string) =>
      element<HTMLElement>('[role="tab"][aria-selected="true"]').dispatchEvent(
        new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
      )
    const active = () => document.activeElement?.textContent
    key('ArrowLeft')
    expect(active()).toBe('图层')
    key('ArrowUp')
    expect(active()).toBe('战斗')
    key('Home')
    expect(active()).toBe('状态')
    key('End')
    expect(active()).toBe('图层')
    key('ArrowDown')
    expect(active()).toBe('状态')
    key('x')
    expect(active()).toBe('状态')
  })
  test('select keyup is isolated but tab keyup propagates to game listener', async () => {
    await debugHarness()
    const onKey = vi.fn()
    window.addEventListener('keyup', onKey)
    try {
      element('select').dispatchEvent(
        new KeyboardEvent('keyup', { key: 'ArrowDown', bubbles: true }),
      )
      expect(onKey).not.toHaveBeenCalled()
      button('状态').dispatchEvent(new KeyboardEvent('keyup', { key: 'x', bubbles: true }))
      expect(onKey).toHaveBeenCalledOnce()
    } finally {
      window.removeEventListener('keyup', onKey)
    }
  })
  test('live busy badges refresh on real interval and close-button pauses polling', async () => {
    const h = await debugHarness()
    vi.useFakeTimers()
    // Reinstall after enabling the timer driver so its one periodic owner is controllable.
    const { installDebugTools } = await import('./debug-tools.js')
    const dispose = installDebugTools(h.ctx)
    try {
      h.state.runner = h.state.dialog = true
      vi.advanceTimersByTime(500)
      expect(
        [...document.querySelectorAll('.tpd-badge')].map((b) => [
          b.textContent,
          b.getAttribute('data-state'),
        ]),
      ).toEqual([
        ['主 runner 占用中', 'busy'],
        ['对话进行中', 'busy'],
      ])
      element<HTMLButtonElement>('.tpd-close').click()
      h.state.runner = h.state.dialog = false
      vi.advanceTimersByTime(500)
      expect(element('.tpd-badge').textContent).toBe('主 runner 占用中')
    } finally {
      dispose()
      vi.useRealTimers()
    }
  })
})
