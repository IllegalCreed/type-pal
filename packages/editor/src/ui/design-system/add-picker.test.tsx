// @vitest-environment jsdom
import { act, type RefObject, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DsAddPickerDialog, type DsAddPickerOption } from './add-picker.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value(this: HTMLElement, options: ScrollToOptions) {
      this.scrollTop = options.top ?? 0
      this.dispatchEvent(new Event('scroll'))
    },
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
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function options(count: number): DsAddPickerOption[] {
  return Array.from({ length: count }, (_, index) => {
    const suffix = String(index).padStart(3, '0')
    return {
      id: `item-${suffix}`,
      label: `道具 ${suffix}`,
      description: `内部编号 ${suffix}`,
      searchText: index === count - 1 ? '最后一项' : undefined,
      leading: <span aria-hidden="true">图</span>,
      trailing: <span>使用</span>,
    }
  })
}

function picker(props: {
  candidates?: readonly DsAddPickerOption[]
  onConfirm?: (id: string) => void | false | Promise<void | false>
  scopeKey?: string
  revision?: number
  readOnly?: boolean
  loading?: boolean
  error?: string
  fallbackFocusRef?: RefObject<HTMLElement | null>
}) {
  return (
    <DsAddPickerDialog
      adoptionId="project/startup-inventory"
      triggerLabel="添加道具"
      title="添加初始道具"
      description="搜索并选择一个道具，确认后加入初始库存。"
      confirmLabel="添加道具"
      options={props.candidates ?? options(8)}
      scopeKey={props.scopeKey ?? 'entry:a'}
      revision={props.revision ?? 0}
      readOnly={props.readOnly}
      loading={props.loading}
      error={props.error}
      fallbackFocusRef={props.fallbackFocusRef}
      onConfirm={props.onConfirm ?? (() => undefined)}
    />
  )
}

describe('DsAddPickerDialog', () => {
  test('keeps search and selection local, cancels cleanly, then confirms exactly once', async () => {
    let resolveConfirm: () => void = () => undefined
    const pending = new Promise<void>((resolve) => {
      resolveConfirm = resolve
    })
    const onConfirm = vi.fn(() => pending)
    await act(async () => root.render(picker({ onConfirm })))

    const trigger = host.querySelector<HTMLButtonElement>('button')!
    trigger.focus()
    await click(trigger)
    const dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    const search = dialog.querySelector<HTMLInputElement>('input[type="search"]')!
    expect(document.activeElement).toBe(search)
    expect(onConfirm).not.toHaveBeenCalled()

    await input(search, 'item-003')
    const option = dialog.querySelector<HTMLElement>('[role="option"]')!
    await click(option)
    expect(option.getAttribute('aria-selected')).toBe('true')
    expect(onConfirm).not.toHaveBeenCalled()
    await click(
      [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent === '取消',
      )!,
    )
    expect(onConfirm).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(trigger)

    await click(trigger)
    const reopened = host.querySelector<HTMLDialogElement>('dialog[open]')!
    expect(reopened.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('')
    expect(reopened.querySelector('[role="option"][aria-selected="true"]')).toBeNull()
    await click(reopened.querySelector<HTMLElement>('[role="option"]')!)
    const confirm = [...reopened.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === '添加道具',
    )!
    await act(async () => {
      confirm.click()
      confirm.click()
    })
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith('item-000')
    expect(confirm.getAttribute('aria-busy')).toBe('true')
    await act(async () => resolveConfirm())
    expect(host.querySelector('dialog[open]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  test('searches label, stable id, description and extra search text from one result source', async () => {
    await act(async () => root.render(picker({ candidates: options(12) })))
    await click(host.querySelector<HTMLButtonElement>('button')!)
    const search = host.querySelector<HTMLInputElement>('input[type="search"]')!

    for (const [query, expected] of [
      ['道具 004', 'item-004'],
      ['item-006', 'item-006'],
      ['内部编号 008', 'item-008'],
      ['最后一项', 'item-011'],
    ] as const) {
      await input(search, query)
      const rows = [...host.querySelectorAll<HTMLElement>('[role="option"]')]
      expect(rows).toHaveLength(1)
      expect(rows[0]?.querySelector<HTMLElement>('[data-option-id]')?.dataset.optionId).toBe(
        expected,
      )
      expect(host.querySelector('[role="status"]')?.textContent).toContain('1 项')
    }
  })

  test('searches and confirms the last of 500 candidates without mounting the full collection', async () => {
    const onConfirm = vi.fn()
    await act(async () => root.render(picker({ candidates: options(500), onConfirm })))
    const trigger = host.querySelector<HTMLButtonElement>('button')!
    trigger.focus()
    await click(trigger)
    expect(host.querySelectorAll('[role="option"]').length).toBeLessThanOrEqual(16)

    const search = host.querySelector<HTMLInputElement>('input[type="search"]')!
    await input(search, 'item-499')
    const rows = host.querySelectorAll<HTMLElement>('[role="option"]')
    expect(rows).toHaveLength(1)
    const activeId = search.getAttribute('aria-activedescendant')!
    expect(document.getElementById(activeId)).toBe(rows[0])
    await act(async () =>
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    expect(rows[0]?.getAttribute('aria-selected')).toBe('true')
    expect(onConfirm).not.toHaveBeenCalled()

    const confirm = [...host.querySelectorAll<HTMLButtonElement>('dialog button')].find(
      (button) => button.textContent === '添加道具',
    )!
    await click(confirm)
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onConfirm).toHaveBeenCalledWith('item-499')
  })

  test.each([
    0, 1, 8, 79, 80, 81, 234, 500,
  ])('keeps the %i option boundary within the shared virtualization budget', async (count) => {
    await act(async () => root.render(picker({ candidates: options(count) })))
    const trigger = host.querySelector<HTMLButtonElement>('button')!
    if (count === 0) {
      expect(trigger.disabled).toBe(true)
      expect(host.textContent).toContain('没有可添加的候选')
      return
    }
    await click(trigger)
    const mounted = host.querySelectorAll('[role="option"]').length
    if (count <= 80) expect(mounted).toBe(count)
    else {
      expect(mounted).toBeGreaterThan(0)
      expect(mounted).toBeLessThanOrEqual(16)
    }
    expect(host.querySelector('[role="option"]')?.getAttribute('aria-setsize')).toBe(String(count))
  })

  test('closes and clears the draft when scope, revision or readOnly changes', async () => {
    const onConfirm = vi.fn()
    await act(async () => root.render(picker({ onConfirm })))
    await click(host.querySelector<HTMLButtonElement>('button')!)
    await click(host.querySelector<HTMLElement>('[role="option"]')!)

    await act(async () => root.render(picker({ onConfirm, revision: 1 })))
    expect(host.querySelector('dialog[open]')).toBeNull()
    expect(onConfirm).not.toHaveBeenCalled()
    await click(host.querySelector<HTMLButtonElement>('button')!)
    expect(host.querySelector('[role="option"][aria-selected="true"]')).toBeNull()

    await act(async () => root.render(picker({ onConfirm, scopeKey: 'entry:b', revision: 1 })))
    expect(host.querySelector('dialog[open]')).toBeNull()
    await act(async () =>
      root.render(picker({ onConfirm, scopeKey: 'entry:b', revision: 1, readOnly: true })),
    )
    expect(host.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  test('locks dismissal while confirming and ignores a late result after revision resync', async () => {
    let resolveConfirm: () => void = () => undefined
    const pending = new Promise<void>((resolve) => {
      resolveConfirm = resolve
    })
    const onConfirm = vi.fn(() => pending)
    await act(async () => root.render(picker({ onConfirm, revision: 0 })))
    const trigger = host.querySelector<HTMLButtonElement>('button')!
    trigger.focus()
    await click(trigger)
    await click(host.querySelector<HTMLElement>('[role="option"]')!)
    const confirm = [...host.querySelectorAll<HTMLButtonElement>('dialog button')].find(
      (button) => button.textContent === '添加道具',
    )!
    await click(confirm)
    expect(onConfirm).toHaveBeenCalledOnce()
    const busyDialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    expect(busyDialog.getAttribute('aria-busy')).toBe('true')
    expect(busyDialog.querySelector<HTMLButtonElement>('button[aria-label="关闭"]')).toBeNull()
    expect(
      [...busyDialog.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent === '取消',
      )?.disabled,
    ).toBe(true)
    const nativeCancel = new Event('cancel', { cancelable: true })
    await act(async () => busyDialog.dispatchEvent(nativeCancel))
    expect(nativeCancel.defaultPrevented).toBe(true)
    expect(host.querySelector('dialog[open]')).toBe(busyDialog)

    await act(async () => root.render(picker({ onConfirm, revision: 1 })))
    expect(host.querySelector('dialog[open]')).toBeNull()
    await click(host.querySelector<HTMLButtonElement>('button')!)
    const reopened = host.querySelector<HTMLDialogElement>('dialog[open]')!
    await act(async () => resolveConfirm())
    expect(host.querySelector('dialog[open]')).toBe(reopened)
    expect(reopened.querySelector('[role="option"][aria-selected="true"]')).toBeNull()
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  test.each([
    'loading',
    'error',
  ] as const)('drops a pending cycle when external %s state takes ownership', async (state) => {
    let resolveConfirm: () => void = () => undefined
    const pending = new Promise<void>((resolve) => {
      resolveConfirm = resolve
    })
    const onConfirm = vi.fn(() => pending)
    await act(async () => root.render(picker({ onConfirm })))
    await click(host.querySelector<HTMLButtonElement>('button')!)
    await click(host.querySelector<HTMLElement>('[role="option"]')!)
    const confirm = [...host.querySelectorAll<HTMLButtonElement>('dialog button')].find(
      (button) => button.textContent === '添加道具',
    )!
    await click(confirm)
    await act(async () =>
      root.render(
        picker({
          onConfirm,
          ...(state === 'loading' ? { loading: true } : { error: '候选读取失败' }),
        }),
      ),
    )
    expect(host.querySelector('dialog[open]')).toBeNull()
    await act(async () => resolveConfirm())
    expect(host.querySelector('dialog[open]')).toBeNull()
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(host.textContent).toContain(state === 'loading' ? '正在加载候选' : '候选读取失败')
  })

  test('distinguishes loading, error, empty and filtered-zero states without moving the footer', async () => {
    await act(async () => root.render(picker({ loading: true })))
    expect(host.textContent).toContain('正在加载候选')
    await act(async () => root.render(picker({ error: '候选读取失败' })))
    expect(host.textContent).toContain('候选读取失败')
    await act(async () => root.render(picker({ candidates: [] })))
    expect(host.textContent).toContain('没有可添加的候选')

    await act(async () => root.render(picker({ candidates: options(3) })))
    await click(host.querySelector<HTMLButtonElement>('button')!)
    const footer = host.querySelector('.ds-overlay__footer')
    await input(host.querySelector<HTMLInputElement>('input[type="search"]')!, '不存在')
    expect(host.textContent).toContain('没有找到匹配项')
    expect(host.querySelector('.ds-overlay__footer')).toBe(footer)
  })

  test('revalidates a stale selection against the latest candidates before confirmation', async () => {
    const onConfirm = vi.fn()
    const candidates = options(2)
    await act(async () => root.render(picker({ candidates, onConfirm })))
    await click(host.querySelector<HTMLButtonElement>('button')!)
    await click(host.querySelector<HTMLElement>('[role="option"]')!)
    expect(host.querySelector('[role="option"][aria-selected="true"]')).not.toBeNull()

    await act(async () => root.render(picker({ candidates: [candidates[1]!], onConfirm })))
    expect(host.querySelector('[role="option"][aria-selected="true"]')).toBeNull()
    expect(host.textContent).toContain('候选已发生变化')
    const confirm = [...host.querySelectorAll<HTMLButtonElement>('dialog button')].find(
      (button) => button.textContent === '添加道具',
    )!
    expect(confirm.disabled).toBe(true)
    await click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  test('clears a selected option when a new search hides it', async () => {
    const onConfirm = vi.fn()
    await act(async () => root.render(picker({ candidates: options(3), onConfirm })))
    await click(host.querySelector<HTMLButtonElement>('button')!)
    await click(
      host.querySelector<HTMLElement>('[data-option-id="item-000"]')!.closest('[role="option"]')!,
    )
    expect(host.querySelector('[role="option"][aria-selected="true"]')).not.toBeNull()

    await input(host.querySelector<HTMLInputElement>('input[type="search"]')!, 'item-001')
    expect(host.querySelector('[role="option"][aria-selected="true"]')).toBeNull()
    const confirm = [...host.querySelectorAll<HTMLButtonElement>('dialog button')].find(
      (button) => button.textContent === '添加道具',
    )!
    expect(confirm.disabled).toBe(true)
    await click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  test('keeps disabled reasons visible and never selects an all-disabled collection', async () => {
    const onConfirm = vi.fn()
    const candidates = options(2).map((option) => ({
      ...option,
      disabledReason: `${option.label} 已在初始库存中`,
    }))
    await act(async () => root.render(picker({ candidates, onConfirm })))
    await click(host.querySelector<HTMLButtonElement>('button')!)

    expect(host.querySelectorAll('[role="option"][aria-disabled="true"]')).toHaveLength(2)
    expect(host.textContent).toContain('已在初始库存中')
    const identity = host.querySelector<HTMLElement>('.ds-add-picker-option__identity')!
    expect(identity.querySelector('.ds-control--monospace')?.textContent).toBe('item-000')
    expect(identity.querySelector('.ds-add-picker-option__detail')?.textContent).toBe(
      '道具 000 已在初始库存中',
    )
    expect(identity.textContent).not.toContain('内部编号 000')
    expect(host.textContent).toContain('0 项可添加')
    expect(
      host
        .querySelector<HTMLInputElement>('input[type="search"]')
        ?.getAttribute('aria-activedescendant'),
    ).toBeNull()
    const confirm = [...host.querySelectorAll<HTMLButtonElement>('dialog button')].find(
      (button) => button.textContent === '添加道具',
    )!
    expect(confirm.disabled).toBe(true)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  test('uses layered Escape so the first press closes results and the second closes the dialog', async () => {
    await act(async () => root.render(picker({})))
    await click(host.querySelector<HTMLButtonElement>('button')!)
    const search = host.querySelector<HTMLInputElement>('input[type="search"]')!
    const firstEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    await act(async () => search.dispatchEvent(firstEscape))

    expect(firstEscape.defaultPrevented).toBe(true)
    expect(host.querySelector('dialog[open]')).not.toBeNull()
    expect(host.querySelector('[role="listbox"]')).toBeNull()

    const secondEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    await act(async () => search.dispatchEvent(secondEscape))
    expect(secondEscape.defaultPrevented).toBe(true)
    expect(host.querySelector('dialog[open]')).toBeNull()
    expect(document.activeElement).toBe(host.querySelector('button'))
  })

  test('closes an open draft if loading or an external error starts', async () => {
    const onConfirm = vi.fn()
    await act(async () => root.render(picker({ onConfirm })))
    await click(host.querySelector<HTMLButtonElement>('button')!)
    await click(host.querySelector<HTMLElement>('[role="option"]')!)

    await act(async () => root.render(picker({ onConfirm, loading: true })))
    expect(host.querySelector('dialog[open]')).toBeNull()
    expect(host.textContent).toContain('正在加载候选')
    expect(onConfirm).not.toHaveBeenCalled()

    await act(async () => root.render(picker({ onConfirm })))
    await click(host.querySelector<HTMLButtonElement>('button')!)
    await act(async () => root.render(picker({ onConfirm, error: '候选已失效' })))
    expect(host.querySelector('dialog[open]')).toBeNull()
    expect(host.textContent).toContain('候选已失效')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  test('restores a business fallback when confirming the last candidate disables the opener', async () => {
    function Harness() {
      const [candidates, setCandidates] = useState<readonly DsAddPickerOption[]>(options(1))
      const fallbackRef = useRef<HTMLElement>(null)
      return (
        <section ref={fallbackRef} tabIndex={-1}>
          {picker({
            candidates,
            fallbackFocusRef: fallbackRef,
            onConfirm: () => {
              setCandidates([])
            },
          })}
        </section>
      )
    }
    await act(async () => root.render(<Harness />))
    const fallback = host.querySelector<HTMLElement>('section')!
    const trigger = host.querySelector<HTMLButtonElement>('button')!
    await click(trigger)
    await click(host.querySelector<HTMLElement>('[role="option"]')!)
    const confirm = [...host.querySelectorAll<HTMLButtonElement>('dialog button')].find(
      (button) => button.textContent === '添加道具',
    )!
    await click(confirm)
    expect(trigger.disabled).toBe(true)
    expect(document.activeElement).toBe(fallback)
  })

  test('ignores IME Enter, then lets keyboard selection update only the dialog draft', async () => {
    const onConfirm = vi.fn()
    await act(async () => root.render(picker({ onConfirm })))
    await click(host.querySelector<HTMLButtonElement>('button')!)
    const search = host.querySelector<HTMLInputElement>('input[type="search"]')!

    await act(async () =>
      search.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }),
      ),
    )
    expect(host.querySelector('[role="option"][aria-selected="true"]')).toBeNull()
    expect(onConfirm).not.toHaveBeenCalled()

    await act(async () =>
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    expect(host.querySelector('[role="option"][aria-selected="true"]')).not.toBeNull()
    expect(document.activeElement).toBe(search)
    expect(onConfirm).not.toHaveBeenCalled()

    const confirm = [...host.querySelectorAll<HTMLButtonElement>('dialog button')].find(
      (button) => button.textContent === '添加道具',
    )!
    await click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  test('keeps the dialog open after a rejected or throwing adapter and allows retry', async () => {
    const rejected = vi.fn(() => false as const)
    await act(async () => root.render(picker({ onConfirm: rejected })))
    await click(host.querySelector<HTMLButtonElement>('button')!)
    await click(host.querySelector<HTMLElement>('[role="option"]')!)
    let confirm = [...host.querySelectorAll<HTMLButtonElement>('dialog button')].find(
      (button) => button.textContent === '添加道具',
    )!
    await click(confirm)
    expect(rejected).toHaveBeenCalledTimes(1)
    expect(host.querySelector('dialog[open]')).not.toBeNull()
    expect(host.textContent).toContain('未能添加')

    const throwing = vi.fn(() => {
      throw new Error('当前项目拒绝添加')
    })
    await act(async () => root.render(picker({ onConfirm: throwing })))
    confirm = [...host.querySelectorAll<HTMLButtonElement>('dialog button')].find(
      (button) => button.textContent === '添加道具',
    )!
    await click(confirm)
    expect(throwing).toHaveBeenCalledTimes(1)
    expect(host.querySelector('dialog[open]')).not.toBeNull()
    expect(host.textContent).toContain('当前项目拒绝添加')
  })

  test('unmounts an open draft without confirming and releases modal ownership', async () => {
    const onConfirm = vi.fn()
    await act(async () => root.render(picker({ onConfirm })))
    await click(host.querySelector<HTMLButtonElement>('button')!)
    await click(host.querySelector<HTMLElement>('[role="option"]')!)
    expect(document.body.style.overflow).toBe('hidden')

    await act(async () => root.render(<></>))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(document.body.style.overflow).toBe('')
  })
})
