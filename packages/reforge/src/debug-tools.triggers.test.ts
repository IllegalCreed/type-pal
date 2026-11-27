// @vitest-environment jsdom
import type { AuthorSceneDef } from '@type-pal/content'
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
import { deferred } from './__tests__/deferred.js'
import { projectData, sceneWithCommands } from './__tests__/runtime-shell/project.js'
import { loadScene } from './project-loader.js'

function replacementScene(): AuthorSceneDef {
  const scene = sceneWithCommands('b', [{ kind: 'setFlag', flag: 'replacementHook', value: true }])
  scene.entities = [
    {
      id: 'zone',
      zone: true,
      pos: { col: 4, row: 3, height: 0 },
      behaviors: {
        trigger: {
          mark: {
            label: 'Mark',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'start',
              stages: [
                {
                  id: 'start',
                  body: [{ kind: 'setFlag', flag: 'replacementEntity', value: true }],
                },
              ],
            },
          },
        },
      },
      initialPage: 'ready',
      pages: [
        {
          id: 'ready',
          label: 'Ready',
          trigger: 'mark',
          triggerActivation: { on: 'interact', range: 4 },
        },
      ],
    },
  ]
  return scene
}

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
  test.each([
    { previous: 'zone [interact r2]', current: 'zone [interact r4]', flag: 'replacementEntity' },
    { previous: 'a onEnter', current: 'b onEnter', flag: 'replacementHook' },
  ])('a stale $previous button cannot execute the replacement scene target', async (entry) => {
    const h = await debugHarness({ second: replacementScene() })
    const oldButton = trigger(entry.previous)
    h.state.scene = await loadScene(h.project, 'b')

    oldButton.click()
    await h.settle()
    expect(h.operations).toHaveLength(0)
    expect(h.world.script?.flags[entry.flag]).toBeUndefined()
    expect(status()).toContain('场景已切换')
    expect(element('[role="status"]').dataset.tone).toBe('error')

    button('刷新列表').click()
    trigger(entry.current).click()
    await h.settle()
    expect(h.world.script?.flags[entry.flag]).toBe(true)
    expect(status()).toContain('→ done')
  })

  test('a same-name trigger in another scene does not cancel the earlier operation', async () => {
    const entered = deferred<void>()
    const h = await debugHarness({
      holdEntityTrigger: true,
      second: replacementScene(),
      wait: async (_ms, signal) => {
        entered.resolve()
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
      },
    })
    try {
      trigger('zone [interact r2]').click()
      await entered.promise
      h.state.scene = await loadScene(h.project, 'b')
      button('刷新列表').click()
      trigger('zone [interact r4]').click()
      await Promise.allSettled(h.operations.slice(1))
      expect(h.signals[0]?.aborted).toBe(false)
      expect(h.world.script?.flags.replacementEntity).toBe(true)

      expect(element('.tpd-scrollbox-tall').textContent).toContain('zone [interact r2] (a)')
      trigger('zone [interact r2] (a)').click()
      await h.settle()
      expect(h.signals[0]?.aborted).toBe(true)
      expect(h.world.script?.flags.triggered).toBeUndefined()
      expect(status()).toContain('→ cancel')
    } finally {
      h.dispose()
      await h.settle()
    }
  })

  test('refresh uses the current trigger activation from the actual runtime', async () => {
    const h = await debugHarness()
    await h.runtime.runCommands(
      [
        {
          kind: 'setEntityTriggerActivation',
          target: { scene: 'a', entity: 'zone' },
          selection: { kind: 'use', value: { on: 'interact', range: 4 } },
        },
      ],
      { signal: new AbortController().signal },
    )
    button('刷新列表').click()
    const labels = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.tpd-trigger-button'),
      (entry) => entry.textContent,
    )
    expect(labels).toContain('zone [interact r4] trigger')
    trigger('zone [interact r4]').click()
    await h.settle()
    expect(h.world.script?.flags.triggered).toBe(true)
  })

  test('an entry disabled after refresh reports that the trigger did not run', async () => {
    const h = await debugHarness()
    const original = trigger('zone [interact r2]')
    await h.runtime.runCommands(
      [
        {
          kind: 'selectEntityBehavior',
          target: { scene: 'a', entity: 'zone' },
          channel: 'trigger',
          selection: { kind: 'disabled' },
        },
      ],
      { signal: new AbortController().signal },
    )

    original.click()
    await h.settle()
    expect(h.world.script?.flags.triggered).toBeUndefined()
    expect(status()).toContain('→ 未命中')
    expect(element('[role="status"]').dataset.tone).toBe('warn')
  })
})
