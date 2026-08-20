// @vitest-environment jsdom

import type { AmbienceDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AddAmbienceCommand } from '../core/commands.js'
import type { EditorState, EditSession } from '../core/edit-session.js'
import { AmbienceTab } from './AmbienceTab.js'

const day: AmbienceDef = { id: 'day', name: '白天', tint: [255, 255, 255] }

function setInputValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('AmbienceTab creation dialog', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.restoreAllMocks()
  })

  test('uses the shared dialog and validates before dispatching one trimmed ambience command', async () => {
    const dispatch = vi.fn()
    const prompt = vi.spyOn(window, 'prompt')
    const alert = vi.spyOn(window, 'alert')

    await act(async () => {
      root.render(
        <AmbienceTab ambiences={[day]} session={{ dispatch } as unknown as EditSession} />,
      )
    })

    const open = host.querySelector<HTMLButtonElement>('button[aria-label="新建氛围"]')!
    await act(async () => open.click())

    const dialog = host.querySelector<HTMLDialogElement>('dialog[open][aria-label="新建氛围"]')!
    expect(dialog).not.toBeNull()
    expect(dialog.classList.contains('ds-dialog')).toBe(true)
    expect(dialog.querySelectorAll('.ds-field')).toHaveLength(2)
    expect(dialog.querySelectorAll('.ds-input')).toHaveLength(2)
    expect(dialog.textContent).toContain('稳定 ID')
    expect(dialog.textContent).toContain('显示名称')

    const form = dialog.querySelector<HTMLFormElement>('form')!
    await act(async () => {
      form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    })
    expect(dialog.querySelector('[role="alert"]')?.textContent).toBe('请输入稳定 ID。')
    expect(dispatch).not.toHaveBeenCalled()

    const id = dialog.querySelector<HTMLInputElement>('input[name="ambience-id"]')!
    await act(async () => setInputValue(id, 'day'))
    await act(async () => {
      form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    })
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('已存在')
    expect(dispatch).not.toHaveBeenCalled()

    const name = dialog.querySelector<HTMLInputElement>('input[name="ambience-name"]')!
    await act(async () => {
      setInputValue(id, '  dusk  ')
      setInputValue(name, '  黄昏  ')
    })
    await act(async () => {
      form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    })

    expect(dispatch).toHaveBeenCalledTimes(1)
    const command = dispatch.mock.calls[0]?.[0]
    expect(command).toBeInstanceOf(AddAmbienceCommand)
    const next = (command as AddAmbienceCommand).apply({ ambiences: [] } as unknown as EditorState)
    expect(next.ambiences).toEqual([{ id: 'dusk', name: '黄昏', tint: [255, 255, 255] }])
    expect(dialog.hasAttribute('open')).toBe(false)
    expect(prompt).not.toHaveBeenCalled()
    expect(alert).not.toHaveBeenCalled()

    await act(async () => open.click())
    expect(host.querySelector<HTMLInputElement>('input[name="ambience-id"]')?.value).toBe('')
    expect(host.querySelector<HTMLInputElement>('input[name="ambience-name"]')?.value).toBe('')
    expect(host.querySelector('[role="alert"]')).toBeNull()

    await act(async () => {
      host.querySelector<HTMLButtonElement>('dialog[open] button:not([aria-label])')?.click()
    })
    expect(dispatch).toHaveBeenCalledTimes(1)
  })
})
