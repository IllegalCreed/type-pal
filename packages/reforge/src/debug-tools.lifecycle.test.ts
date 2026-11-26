// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { cleanupDebug, debugHarness } from './__tests__/debug-tools-fixtures.js'
import { installDebugTools } from './debug-tools.js'

afterEach(cleanupDebug)

test('Backquote 只在隐藏态和安全目标重开，Esc capture 不泄漏到关闭态', async () => {
  const h = await debugHarness()
  const gameKeydown = vi.fn()
  window.addEventListener('keydown', gameKeydown)
  try {
    const activeTab = document.activeElement
    expect(activeTab?.getAttribute('aria-selected')).toBe('true')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }))
    expect(document.getElementById('tp-debug')?.hidden).toBe(true)
    expect(document.activeElement).toBe(document.body)
    expect(gameKeydown).not.toHaveBeenCalled()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }))
    expect(gameKeydown).toHaveBeenCalledOnce()

    const guardedTargets: HTMLElement[] = [
      document.createElement('input'),
      document.createElement('textarea'),
      document.createElement('select'),
    ]
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    const editableChild = document.createElement('span')
    editable.appendChild(editableChild)
    guardedTargets.push(editableChild)
    document.body.append(...guardedTargets.slice(0, 3), editable)
    for (const target of guardedTargets) {
      target.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: '`',
          code: 'Backquote',
          bubbles: true,
          cancelable: true,
        }),
      )
      expect(document.getElementById('tp-debug')?.hidden).toBe(true)
    }
    for (const guarded of [
      { repeat: true },
      { isComposing: true },
      { shiftKey: true },
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
    ]) {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: '`', code: 'Backquote', ...guarded }),
      )
      expect(document.getElementById('tp-debug')?.hidden).toBe(true)
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '`', code: 'KeyA' }))
    expect(document.getElementById('tp-debug')?.hidden).toBe(true)

    const beforeOpen = gameKeydown.mock.calls.length
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '§', code: 'Backquote' }))
    expect(document.getElementById('tp-debug')?.hidden).toBe(false)
    expect(gameKeydown).toHaveBeenCalledTimes(beforeOpen)
    expect(document.activeElement).toBe(activeTab)
    h.dispose()
  } finally {
    window.removeEventListener('keydown', gameKeydown)
  }
})

test('三轮 hide/show 与重复安装始终单实例，dispose 幂等且 stale disposer 不碰新实例', async () => {
  const first = await debugHarness()
  vi.useFakeTimers()
  const firstPoll = vi.spyOn(first.ctx, 'runnerBusy')
  const disposeFirst = installDebugTools(first.ctx)
  try {
    for (let round = 0; round < 3; round++) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }))
      expect(document.getElementById('tp-debug')?.hidden).toBe(true)
      const callsWhileHidden = firstPoll.mock.calls.length
      vi.advanceTimersByTime(1_000)
      expect(firstPoll).toHaveBeenCalledTimes(callsWhileHidden)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '`', code: 'Backquote' }))
      expect(document.getElementById('tp-debug')?.hidden).toBe(false)
      const callsAfterShow = firstPoll.mock.calls.length
      vi.advanceTimersByTime(500)
      expect(firstPoll.mock.calls.length).toBeGreaterThan(callsAfterShow)
      expect(document.querySelectorAll('#tp-debug')).toHaveLength(1)
      expect(document.querySelectorAll('#tp-reforge-debug-style')).toHaveLength(1)
    }

    const second = {
      ...first.ctx,
      motionState: () => ({
        ...first.state.motion,
        player: { ...first.state.motion.player, id: 'second-controller' },
      }),
    }
    const secondPoll = vi.spyOn(second, 'runnerBusy')
    const disposeSecond = installDebugTools(second)
    expect(document.querySelector('[data-motion-id="second-controller"]')).not.toBeNull()
    disposeFirst()
    expect(document.querySelector('[data-motion-id="second-controller"]')).not.toBeNull()
    expect(document.querySelectorAll('#tp-debug')).toHaveLength(1)
    disposeSecond()
    disposeSecond()
    expect(document.getElementById('tp-debug')).toBeNull()
    expect(document.getElementById('tp-reforge-debug-style')).toBeNull()
    const callsAfterDispose = secondPoll.mock.calls.length
    vi.advanceTimersByTime(1_000)
    expect(secondPoll).toHaveBeenCalledTimes(callsAfterDispose)
  } finally {
    disposeFirst()
    vi.useRealTimers()
  }
})

test('hide 保留在途调试操作，dispose 才集中 abort', async () => {
  const h = await debugHarness()
  let operationSignal: AbortSignal | undefined
  h.ctx.runDetached = (signal) => {
    operationSignal = signal
    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')), {
        once: true,
      })
    })
  }

  const trigger = [...document.querySelectorAll<HTMLButtonElement>('.tpd-trigger-button')].find(
    (button) => button.textContent?.includes('shared/hold'),
  )!
  trigger.click()
  expect(operationSignal?.aborted).toBe(false)

  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }))
  expect(operationSignal?.aborted).toBe(false)
  h.dispose()
  expect(operationSignal?.aborted).toBe(true)
  await Promise.resolve()
})

test('Esc 隐藏并 reset 帧步进，Backquote 重显；dispose 才移除根节点与样式', async () => {
  const h = await debugHarness()
  const setActive = vi.spyOn(h.ctx.frameStep, 'setActive')
  ;[...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    .find((tab) => tab.textContent === '图层')!
    .click()
  ;[...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.textContent?.startsWith('▶ 单步'))!
    .click()
  expect({ active: h.ctx.frameStep.active, requested: h.state.requestedStep }).toEqual({
    active: true,
    requested: true,
  })

  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }))
  expect(setActive).toHaveBeenLastCalledWith(false)
  expect(h.reset).toHaveBeenCalledOnce()
  expect({ active: h.ctx.frameStep.active, requested: h.state.requestedStep }).toEqual({
    active: false,
    requested: false,
  })
  expect(document.getElementById('tp-debug')?.hidden).toBe(true)
  expect(document.getElementById('tp-reforge-debug-style')).not.toBeNull()

  window.dispatchEvent(new KeyboardEvent('keydown', { key: '§', code: 'Backquote' }))
  expect(document.getElementById('tp-debug')?.hidden).toBe(false)

  h.dispose()
  expect(document.getElementById('tp-debug')).toBeNull()
  expect(document.getElementById('tp-reforge-debug-style')).toBeNull()
})
