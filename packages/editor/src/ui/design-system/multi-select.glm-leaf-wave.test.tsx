// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DsMultiSelect } from './multi-select.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const options = [
  { value: 'a', label: '甲' },
  { value: 'b', label: '乙', description: '备用' },
  { value: 'off', label: '停用', disabled: true },
  { value: 'c', label: '丙' },
] as const

type Props = Parameters<typeof DsMultiSelect>[0]

function trigger(): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>('button.ds-multiselect__trigger')
  expect(button).not.toBeNull()
  return button!
}

function dialog(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[role="dialog"]')
  expect(element).not.toBeNull()
  return element!
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.click())
}

async function open(): Promise<HTMLElement> {
  if (document.querySelector('[role="dialog"]')) await click(trigger())
  await click(trigger())
  return dialog()
}

async function search(query: string): Promise<HTMLInputElement> {
  const input = dialog().querySelector<HTMLInputElement>('input.ds-input')!
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setValue.call(input, query)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  return input
}

function visibleCheckboxLabels(): string[] {
  return [...dialog().querySelectorAll<HTMLInputElement>('.ds-check-control')].map(
    (input) => input.closest('label')?.textContent ?? '',
  )
}

function renderMulti(overrides: Partial<Props> = {}): void {
  const props: Props = {
    label: '字体',
    options,
    value: [],
    onChange: () => undefined,
    ...overrides,
  }
  act(() => root.render(<DsMultiSelect {...props} />))
}

describe('DsMultiSelect 剩余合同', () => {
  test('label, count and overflow summaries follow external value updates', () => {
    renderMulti({ value: ['a', 'b', 'c'] })
    expect(trigger().textContent).toContain('甲、乙 +1')

    renderMulti({ value: ['a', 'b', 'c'], summaryMode: 'count' })
    expect(trigger().textContent).toContain('已选 3 项')

    renderMulti({ value: ['ghost'] })
    expect(trigger().textContent).toContain('ghost')

    renderMulti({ value: [] })
    expect(trigger().textContent).toContain('请选择')
  })

  test('filter matches label, value and description and reports the empty state', async () => {
    renderMulti({ value: [] })
    const opened = await open()
    expect(opened.getAttribute('aria-label')).toBe('选择字体')
    expect(visibleCheckboxLabels()).toEqual(['甲', '乙', '停用', '丙'])

    await search('乙')
    expect(visibleCheckboxLabels()).toEqual(['乙'])
    await search('b')
    expect(visibleCheckboxLabels()).toEqual(['乙'])
    await search('备用')
    expect(visibleCheckboxLabels()).toEqual(['乙'])
    await search('不存在的词')
    expect(dialog().textContent).toContain('没有匹配的选项')
  })

  test('select-all keeps prior values, follows the filter and never adds disabled options', async () => {
    const onChange = vi.fn()
    renderMulti({ value: ['a'], onChange })
    await open()
    await click(
      [...dialog().querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent === '全选',
      )!,
    )
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(['a', 'b', 'c'])

    renderMulti({ value: ['a'], onChange })
    await open()
    await search('丙')
    await click(
      [...dialog().querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent === '全选',
      )!,
    )
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith(['a', 'c'])
  })

  test('clear commits an empty value regardless of the current selection', async () => {
    const onChange = vi.fn()
    renderMulti({ value: ['a', 'b'], onChange })
    await open()
    expect(dialog().textContent).toContain('已选 2 项')
    await click(
      [...dialog().querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent === '清空',
      )!,
    )
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith([])
  })

  test('checkbox toggles commit actual membership and disabled rows stay inert', async () => {
    const onChange = vi.fn()
    renderMulti({ value: ['a'], onChange })
    await open()
    const checkboxes = [...dialog().querySelectorAll<HTMLInputElement>('.ds-check-control')]
    const c = checkboxes.find((input) => input.closest('label')?.textContent === '丙')!
    await click(c)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(['a', 'c'])

    renderMulti({ value: ['a', 'c'], onChange })
    await open()
    const again = [...dialog().querySelectorAll<HTMLInputElement>('.ds-check-control')].find(
      (input) => input.closest('label')?.textContent === '丙',
    )!
    expect(again.checked).toBe(true)
    await click(again)
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith(['a'])

    renderMulti({ value: ['a', 'c'], onChange })
    await open()
    const disabled = [...dialog().querySelectorAll<HTMLInputElement>('.ds-check-control')].find(
      (input) => input.closest('label')?.textContent === '停用',
    )!
    expect(disabled.disabled).toBe(true)
    await click(disabled)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  test('Escape inside the dialog restores trigger focus and reopening starts clean', async () => {
    renderMulti({ value: ['a'] })
    const button = trigger()
    await click(button)
    const searchInput = dialog().querySelector<HTMLInputElement>('input.ds-input')!
    expect(document.activeElement).toBe(searchInput)

    await act(async () => {
      searchInput.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)

    await click(button)
    expect(dialog().querySelector<HTMLInputElement>('input.ds-input')?.value).toBe('')
    expect(visibleCheckboxLabels()).toEqual(['甲', '乙', '停用', '丙'])

    button.focus()
    await act(async () => {
      button.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  test('disabled multiselect closes on prop change and refuses to open', async () => {
    const onChange = vi.fn()
    renderMulti({ value: ['a'], onChange })
    await open()
    renderMulti({ value: ['a'], onChange, disabled: true })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(trigger().disabled).toBe(true)
    await click(trigger())
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })
})
