// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  button,
  cleanupDebug,
  command,
  debugHarness,
  element,
} from './__tests__/debug-tools-fixtures.js'

import { injectDebugToolsStyles } from './debug-tools-styles.js'

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

test('样式幂等，五个语义 tab 使用 roving focus，切换后表单与 console 状态不丢', async () => {
  const h = await debugHarness()
  injectDebugToolsStyles()
  injectDebugToolsStyles()
  expect(document.querySelectorAll('#tp-reforge-debug-style')).toHaveLength(1)
  const css = document.getElementById('tp-reforge-debug-style')!.textContent
  expect(css).toContain('--tpd-bg:rgba(24,24,28,.96)')
  expect(css).toContain('--tpd-accent:#6c8eef')
  expect(css).toContain('#tp-debug[hidden] { display:none; }')
  expect(css).not.toContain('Songti SC')

  expect(document.querySelector('[role="tablist"]')?.getAttribute('aria-orientation')).toBe(
    'horizontal',
  )
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
  const panels = [...document.querySelectorAll<HTMLElement>('[role="tabpanel"]')]
  expect(tabs.map((tab) => tab.textContent)).toEqual(['状态', '指令', '触发', '战斗', '图层'])
  expect(panels).toHaveLength(5)
  expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1, -1])

  tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  expect(tabs[1]!.getAttribute('aria-selected')).toBe('true')
  expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1, -1, -1])
  const command = document.querySelector<HTMLInputElement>('[aria-label="调试命令"]')!
  command.value = 'help'
  command.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  expect(document.querySelector('.tpd-console')?.textContent).toContain('scene <id>')

  tabs[4]!.click()
  tabs[1]!.click()
  expect(document.querySelector('.tpd-console')?.textContent).toContain('scene <id>')
  expect(command.isConnected).toBe(true)
  h.dispose()
})
