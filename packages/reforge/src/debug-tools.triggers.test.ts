// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  button,
  cleanupDebug,
  command,
  debugHarness,
  element,
  status,
  trigger,
} from './__tests__/debug-tools-fixtures.js'
import { projectData } from './__tests__/runtime-shell/project.js'

afterEach(cleanupDebug)
describe('Debug trigger current runtime', () => {
  test.each([
    ['shared/mark', 'shared'],
    ['zone [interact r2]', 'triggered'],
    ['zone [auto]', 'auto'],
    ['a onEnter', 'entered'],
    ['a onTeleport', 'teleported'],
  ])('%s runs its actual channel and removes only its temporary running button', async (prefix, flag) => {
    const h = await debugHarness(),
      count = document.querySelectorAll('.tpd-trigger-button').length
    trigger(prefix!).click()
    expect(document.querySelectorAll('.tpd-trigger-button')).toHaveLength(count + 1)
    await h.settle()
    expect(h.world.script?.flags[flag!]).toBe(true)
    expect(status()).toContain('→ done')
    expect(document.querySelectorAll('.tpd-trigger-button')).toHaveLength(count)
    expect(projectData(h.project)).toEqual(h.projectBefore)
  })
  test('same running trigger click aborts entered wait, drops tail command and can start again', async () => {
    let entered = 0
    let firstEntered!: () => void, secondEntered!: () => void
    const firstEntry = new Promise<void>((resolve) => {
      firstEntered = resolve
    })
    const secondEntry = new Promise<void>((resolve) => {
      secondEntered = resolve
    })
    const h = await debugHarness({
      wait: async (_ms, signal) => {
        entered++
        if (entered === 1) firstEntered()
        else secondEntered()
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('cancelled', 'AbortError')),
            { once: true },
          )
        })
      },
    })
    try {
      trigger('shared/hold').click()
      await firstEntry
      expect(entered).toBe(1)
      trigger('shared/hold').click()
      await h.settle()
      expect(h.signals).toHaveLength(1)
      expect(h.signals[0]?.aborted).toBe(true)
      expect(h.world.script?.flags.afterWait).toBeUndefined()
      expect(status()).toContain('→ cancel')
      expect(element('[role="status"]').dataset.tone).toBe('warn')
      trigger('shared/hold').click()
      await secondEntry
      expect(entered).toBe(2)
    } finally {
      h.dispose()
      await h.settle()
    }
  })
  test('busy trigger confirms separately from console and rejection leaves list unchanged', async () => {
    const h = await debugHarness(),
      confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    h.state.busy = true
    const before = element('.tpd-scrollbox-tall').textContent
    trigger('shared/mark').click()
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('shared/mark'))
    expect(h.operations).toEqual([])
    expect(element('.tpd-scrollbox-tall').textContent).toBe(before)
    confirm.mockReturnValue(true)
    trigger('shared/mark').click()
    await h.settle()
    expect(h.world.script?.flags.shared).toBe(true)
  })
  test.each([
    'zone [interact r2]',
    'a onEnter',
  ])('%s reports scene loss after enumeration instead of executing stale scene', async (prefix) => {
    const h = await debugHarness(),
      before = structuredClone(h.world)
    h.state.scene = undefined
    trigger(prefix).click()
    await h.settle()
    expect(status()).toContain('场景')
    expect(element('[role="status"]').dataset.tone).toBe('error')
    expect(h.world).toEqual(before)
    button('刷新列表').click()
    expect(
      [...document.querySelectorAll('.tpd-trigger-button')].every((b) =>
        b.textContent?.startsWith('shared/'),
      ),
    ).toBe(true)
  })
  test('run-trigger distinguishes executed, missing behavior, and absent current scene', async () => {
    const h = await debugHarness()
    command('run-trigger zone')
    await h.settle()
    expect(status()).toBe('run-trigger zone → ran')
    expect(h.world.script?.flags.triggered).toBe(true)
    command('run-trigger blank')
    await h.settle()
    expect(status()).toBe('run-trigger blank → 未命中')
    h.state.scene = undefined
    command('run-trigger zone')
    await h.settle()
    expect(status()).toContain('当前场景无 canonical 定义')
  })
})
