// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DsToolbar } from './index.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})

async function click(element: Element): Promise<void> {
  if (!(element instanceof HTMLElement)) throw new Error('click target must be an HTMLElement')
  await act(async () => element.click())
}

describe('toolbar command surface', () => {
  test('executes real commands and renders pressed, busy, disabled and grouped chrome', async () => {
    const undo = vi.fn()
    const redo = vi.fn()
    const remove = vi.fn()
    act(() =>
      root.render(
        <DsToolbar
          label="编辑工具"
          groups={[
            [
              { id: 'undo', label: '撤销', icon: 'undo', execute: undo, pressed: true },
              {
                id: 'redo',
                label: '重做',
                icon: 'redo',
                disabled: true,
                disabledReason: '没有可重做的步骤',
                execute: redo,
              },
            ],
            [
              {
                id: 'delete',
                label: '删除',
                icon: 'delete',
                busy: true,
                execute: remove,
              },
              { id: 'save', label: '保存', icon: 'save', showLabel: true, execute: vi.fn() },
            ],
          ]}
        />,
      ),
    )
    expect(host.querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBe('编辑工具')
    await click(host.querySelector('[aria-label="撤销"]')!)
    expect(undo).toHaveBeenCalledTimes(1)
    expect(host.querySelector('[aria-label="撤销"]')?.getAttribute('aria-pressed')).toBe('true')

    const redoButton = host.querySelector<HTMLButtonElement>('[aria-label="重做"]')!
    expect(redoButton.disabled).toBe(true)
    await click(redoButton)
    expect(redo).not.toHaveBeenCalled()

    const deleteButton = host.querySelector<HTMLButtonElement>('[aria-label="删除"]')!
    expect(deleteButton.disabled).toBe(true)
    expect(deleteButton.getAttribute('aria-busy')).toBe('true')

    expect(host.querySelectorAll('.ds-toolbar__divider')).toHaveLength(1)
    const saveButton = host.querySelector<HTMLButtonElement>('[aria-label="保存"]')!
    expect(saveButton.textContent).toContain('保存')
    expect(saveButton.classList.contains('ds-button')).toBe(true)
    await click(deleteButton)
    expect(remove).not.toHaveBeenCalled()
  })
})

test('a toolbar activation invokes the supplied save adapter once', async () => {
  const execute = vi.fn()
  await act(async () =>
    root.render(
      <DsToolbar
        label="快捷工具栏"
        groups={[[{ id: 'save', label: '保存', icon: 'save', execute }]]}
      />,
    ),
  )
  await click(host.querySelector<HTMLButtonElement>('[aria-label="保存"]')!)
  expect(execute).toHaveBeenCalledTimes(1)
})
