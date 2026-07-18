// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ProjectSaveDialog } from './ProjectSaveDialog.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }),
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    }),
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.restoreAllMocks()
})

describe('ProjectSaveDialog', () => {
  test('uses an uncancellable native modal with an indeterminate preparation state', async () => {
    await act(async () => root.render(<ProjectSaveDialog activity={{ phase: 'preparing' }} />))

    const dialog = document.body.querySelector<HTMLDialogElement>('.project-save-dialog')!
    expect(dialog.open).toBe(true)
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.textContent).toContain('正在保存工程')
    expect(dialog.textContent).toContain('正在整理并校验工程内容')
    expect(dialog.querySelector('[role="progressbar"]')?.hasAttribute('aria-valuenow')).toBe(false)

    const cancel = new Event('cancel', { cancelable: true })
    expect(dialog.dispatchEvent(cancel)).toBe(false)
    expect(dialog.open).toBe(true)
  })

  test('reports real byte progress and switches copy text for save-as', async () => {
    await act(async () =>
      root.render(
        <ProjectSaveDialog activity={{ phase: 'writing', completed: 512, total: 1024 }} />,
      ),
    )
    const progress = document.body.querySelector<HTMLElement>('[role="progressbar"]')!
    expect(progress.getAttribute('aria-valuenow')).toBe('50')
    expect(document.body.textContent).toContain('50% · 512 B / 1 KB')

    await act(async () => root.render(<ProjectSaveDialog activity={{ phase: 'saving-as' }} />))
    expect(document.body.textContent).toContain('正在另存工程')
    expect(document.body.textContent).toContain('正在复制素材并写入新目录')
  })
})
