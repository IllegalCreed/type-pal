// @vitest-environment jsdom

import type { AmbienceDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AddAmbienceCommand, DeleteAmbienceCommand } from '../core/commands.js'
import type { EditorState, EditSession } from '../core/edit-session.js'
import type { ScriptEditorState, ScriptEditSession } from '../core/script-editor.js'
import { AmbienceTab } from './AmbienceTab.js'

const day: AmbienceDef = { id: 'day', name: '白天', tint: [255, 255, 255] }
const review: AmbienceDef = { id: '123', name: '123', tint: [255, 255, 255] }

function editorState(overrides: Partial<EditorState> = {}): EditorState {
  return {
    scenes: [],
    items: [],
    sharedScripts: {},
    scriptChunks: {},
    ambiences: [day, review],
    ...overrides,
  } as unknown as EditorState
}

function sessionFor(state: EditorState, dispatch = vi.fn()): EditSession {
  return { dispatch, getState: () => state } as unknown as EditSession
}

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

  test('deletes an unreferenced ambience only after the shared confirmation dialog', async () => {
    const dispatch = vi.fn()
    const confirm = vi.spyOn(window, 'confirm')
    const session = sessionFor(editorState(), dispatch)
    await act(async () => {
      root.render(<AmbienceTab ambiences={[day, review]} session={session} />)
    })

    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="删除氛围 123"]')!
    await act(async () => trigger.click())

    const dialog = host.querySelector<HTMLDialogElement>(
      'dialog[open][aria-label="删除氛围“123”？"]',
    )!
    expect(dialog).not.toBeNull()
    expect(dialog.classList.contains('ds-dialog')).toBe(true)
    expect(dialog.textContent).toContain('当前未发现脚本、昼夜切换或运行态引用')
    expect(dispatch).not.toHaveBeenCalled()

    const deleteButton = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '确认删除',
    )!
    await act(async () => deleteButton.click())
    await act(
      async () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve())
        }),
    )

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch.mock.calls[0]?.[0]).toBeInstanceOf(DeleteAmbienceCommand)
    expect(dialog.hasAttribute('open')).toBe(false)
    expect(document.activeElement).toBe(
      host.querySelector<HTMLButtonElement>('button[aria-label="删除氛围 白天"]'),
    )
    expect(confirm).not.toHaveBeenCalled()
  })

  test('lists blocking references and keeps deletion disabled', async () => {
    const dispatch = vi.fn()
    const openReference = vi.fn()
    const state = editorState()
    const scriptState: ScriptEditorState = {
      scenes: [],
      items: [],
      sharedScripts: {
        'shared/review': {
          name: '评审脚本',
          self: 'none',
          body: [{ kind: 'setAmbience', ambience: '123' }],
        },
      },
    }
    await act(async () => {
      root.render(
        <AmbienceTab
          ambiences={[day, review]}
          session={sessionFor(state, dispatch)}
          script={{
            session: {
              getState: () => scriptState,
            } as unknown as ScriptEditSession,
          }}
          onOpenReference={openReference}
        />,
      )
    })

    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[aria-label="删除氛围 123"]')?.click()
    })

    const dialog = host.querySelector<HTMLDialogElement>(
      'dialog[open][aria-label="删除氛围“123”？"]',
    )!
    expect(dialog.textContent).toContain('仍有 1 处引用')
    expect(dialog.textContent).toContain('评审脚本')
    expect(dialog.querySelector('.ds-reference-panel')).not.toBeNull()
    const deleteButton = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '确认删除',
    )!
    expect(deleteButton.disabled).toBe(true)
    expect(dispatch).not.toHaveBeenCalled()

    await act(async () => {
      dialog.querySelector<HTMLButtonElement>('button[aria-label^="打开引用："]')?.click()
    })
    expect(openReference).toHaveBeenCalledTimes(1)
    expect(dialog.hasAttribute('open')).toBe(false)
  })
})
