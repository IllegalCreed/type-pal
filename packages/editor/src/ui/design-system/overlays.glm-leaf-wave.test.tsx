// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DsAddPickerDialog, type DsAddPickerOption } from './add-picker.js'
import { DsDialog, DsDrawer } from './overlays.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  document.body.style.overflow = ''
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function key(element: Element, keyName: string): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }),
    )
  })
}

function dialog(): HTMLDialogElement {
  const element = host.querySelector<HTMLDialogElement>('dialog[open]')
  expect(element).not.toBeNull()
  return element!
}

describe('DsDrawer 剩余合同', () => {
  test('opens with body focus, closes once from the close button and restores opener focus', async () => {
    const onClose = vi.fn()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            打开抽屉
          </button>
          <DsDrawer
            open={open}
            title="场景详情"
            onClose={() => {
              onClose()
              setOpen(false)
            }}
          >
            <input aria-label="场景名" />
          </DsDrawer>
        </>
      )
    }
    await act(async () => root.render(<Harness />))
    const opener = host.querySelector<HTMLButtonElement>('button')!
    opener.focus()
    await act(async () => opener.click())
    const drawer = dialog()
    expect(drawer.getAttribute('aria-labelledby')).toBe(drawer.querySelector('.ds-card__title')?.id)
    expect(document.activeElement).toBe(drawer.querySelector('[aria-label="场景名"]'))
    expect(document.body.style.overflow).toBe('hidden')

    await act(async () => drawer.querySelector<HTMLButtonElement>('[aria-label="关闭"]')!.click())
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(host.querySelector('dialog[open]')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(opener)
  })
})

describe('DsDialog 剩余合同', () => {
  test('non-dismissible dialogs drop the close button and ignore native cancel requests', async () => {
    const onClose = vi.fn()
    await act(async () =>
      root.render(
        <DsDialog open title="强制流程" dismissible={false} onClose={onClose} ariaBusy>
          <input aria-label="必填字段" />
        </DsDialog>,
      ),
    )
    const forced = dialog()
    expect(forced.getAttribute('aria-busy')).toBe('true')
    expect(forced.querySelector('[aria-label="关闭"]')).toBeNull()

    const cancelEvent = new Event('cancel', { cancelable: true })
    await act(async () => forced.dispatchEvent(cancelEvent))
    expect(cancelEvent.defaultPrevented).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
    expect(forced.hasAttribute('open')).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')

    await act(async () => root.render(null))
    expect(document.body.style.overflow).toBe('')
    expect(onClose).not.toHaveBeenCalled()
  })

  test('keeps alertdialog role and custom close label on dismissible dialogs', async () => {
    const onClose = vi.fn()
    await act(async () =>
      root.render(
        <DsDialog open role="alertdialog" title="删除确认" closeLabel="放弃" onClose={onClose}>
          内容
        </DsDialog>,
      ),
    )
    const confirmDialog = dialog()
    expect(confirmDialog.getAttribute('role')).toBe('alertdialog')
    const closeButton = confirmDialog.querySelector<HTMLButtonElement>('[aria-label="放弃"]')!
    await act(async () => closeButton.click())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('focuses the footer action when the body has no focusable control', async () => {
    const onClose = vi.fn()
    await act(async () =>
      root.render(
        <DsDialog
          open
          title="确认迁移"
          onClose={onClose}
          footer={<button type="button">确认</button>}
        >
          <p>纯文本正文</p>
        </DsDialog>,
      ),
    )
    expect(document.activeElement?.textContent).toBe('确认')
  })
})

const options: DsAddPickerOption[] = [
  { id: 'a', label: '甲', searchText: ['别名一'] },
  { id: 'b', label: '乙', disabledReason: '已在库存中' },
  { id: 'c', label: '丙' },
]

function picker(overrides: Partial<Parameters<typeof DsAddPickerDialog>[0]> = {}) {
  const props: Parameters<typeof DsAddPickerDialog>[0] = {
    adoptionId: 'project/lab',
    triggerLabel: '添加',
    title: '添加候选',
    confirmLabel: '确认添加',
    options,
    scopeKey: 'scope',
    revision: 0,
    onConfirm: () => undefined,
    ...overrides,
  }
  return <DsAddPickerDialog {...props} />
}

async function openPicker(): Promise<HTMLInputElement> {
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
  const search = dialog().querySelector<HTMLInputElement>('input[type="search"]')
  expect(search).not.toBeNull()
  return search!
}

async function type(query: string, input: HTMLInputElement): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, query)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('DsAddPickerDialog 剩余合同', () => {
  test('collapses results on Escape, re-expands with arrows and closes on the second Escape', async () => {
    await act(async () => root.render(picker()))
    const search = await openPicker()
    await key(search, 'Escape')
    expect(dialog().textContent).toContain('结果已收起；继续输入或按方向键重新展开。')
    expect(dialog().querySelector('[role="option"]')).toBeNull()

    await key(search, 'ArrowDown')
    expect(dialog().querySelector('[role="option"]')).not.toBeNull()

    await key(search, 'Escape')
    await key(search, 'Escape')
    expect(host.querySelector('dialog[open]')).toBeNull()
  })

  test('searches extra text arrays and disabled reasons with custom labels and empty copy', async () => {
    await act(async () =>
      root.render(picker({ searchLabel: '查找候选', emptyMessage: '清单是空的。', options: [] })),
    )
    const emptyTrigger = host.querySelector<HTMLButtonElement>('button')!
    expect(emptyTrigger.disabled).toBe(true)
    expect(host.querySelector('.ds-add-picker-owner__status')?.textContent).toBe('清单是空的。')

    await act(async () => root.render(picker({ searchLabel: '查找候选' })))
    await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
    expect(dialog().querySelector('label')?.textContent).toBe('查找候选')

    const search = dialog().querySelector<HTMLInputElement>('input[type="search"]')!
    await type('别名一', search)
    expect([...dialog().querySelectorAll('[role="option"]')]).toHaveLength(1)
    expect(dialog().querySelector('[data-option-id="a"]')).not.toBeNull()

    await type('库存', search)
    const disabledRow = dialog().querySelector('[role="option"][aria-disabled="true"]')!
    expect(disabledRow.querySelector('[data-option-id="b"]')).not.toBeNull()
    expect(disabledRow.textContent).toContain('已在库存中')

    await type('不存在的词', search)
    expect(dialog().textContent).toContain('没有找到匹配项。')
  })
})
