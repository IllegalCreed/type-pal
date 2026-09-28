// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { type DsOption, DsSelect } from './select.js'

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

const options: DsOption[] = [
  { value: 'alpha', label: 'Alpha', description: '首选' },
  { value: 'beta', label: 'Beta' },
  { value: 'off', label: '停用项', disabled: true },
  { value: 'gamma', label: 'Gamma' },
]

function trigger(): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>('button.ds-select')
  expect(button).not.toBeNull()
  return button!
}

function activeOptionLabel(): string | null {
  return (
    document
      .querySelector<HTMLElement>('.ds-select-option[data-active="true"]')
      ?.querySelector<HTMLElement>('.ds-select-option__label')?.textContent ?? null
  )
}

async function key(element: HTMLElement, keyName: string): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }),
    )
  })
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.click())
}

function renderSelect(overrides: Partial<Parameters<typeof DsSelect>[0]> = {}): void {
  const props: Parameters<typeof DsSelect>[0] = {
    'aria-label': '目标',
    options,
    value: '',
    onValueChange: () => undefined,
    ...overrides,
  }
  act(() => root.render(<DsSelect {...props} />))
}

describe('DsSelect 剩余合同', () => {
  test('selected, missing and placeholder values render without opening the popover', () => {
    const onValueChange = vi.fn()
    renderSelect({ value: 'beta', onValueChange })
    expect(trigger().textContent).toContain('Beta')
    expect(trigger().dataset.missing).toBeUndefined()
    expect(trigger().getAttribute('aria-expanded')).toBe('false')

    renderSelect({ value: 'ghost', onValueChange })
    expect(trigger().textContent).toContain('ghost（缺失）')
    expect(trigger().dataset.missing).toBe('true')

    renderSelect({ value: '', placeholder: '选择目标', onValueChange })
    expect(trigger().textContent).toContain('选择目标')
    renderSelect({ value: '', onValueChange })
    expect(trigger().textContent).toContain('请选择')
    expect(document.querySelector('.ds-select-popover')).toBeNull()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  test('keyboard open, skip disabled, commit by Enter and Escape restores focus', async () => {
    const onValueChange = vi.fn()
    renderSelect({ value: '', onValueChange })
    const button = trigger()
    button.focus()
    await key(button, 'ArrowDown')
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(activeOptionLabel()).toBe('Alpha')

    await key(button, 'ArrowDown')
    expect(activeOptionLabel()).toBe('Beta')

    await key(button, 'Enter')
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith('beta')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelector('.ds-select-popover')).toBeNull()
    expect(document.activeElement).toBe(button)

    button.focus()
    await key(button, 'ArrowDown')
    expect(button.getAttribute('aria-expanded')).toBe('true')
    await key(button, 'Escape')
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)
  })

  test('disabled options reject clicks and keep the popover open; disabled trigger stays closed', async () => {
    const onValueChange = vi.fn()
    renderSelect({ value: 'alpha', onValueChange })
    const button = trigger()
    await click(button)
    const disabledOption = [...document.querySelectorAll<HTMLElement>('.ds-select-option')].find(
      (option) => option.getAttribute('aria-disabled') === 'true',
    )!
    expect(disabledOption.textContent).toContain('停用项')
    await click(disabledOption)
    expect(onValueChange).not.toHaveBeenCalled()
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('.ds-select-popover')).not.toBeNull()

    const enabled = [...document.querySelectorAll<HTMLElement>('.ds-select-option')].find(
      (option) => option.textContent?.includes('Gamma'),
    )!
    await click(enabled)
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith('gamma')
    expect(button.getAttribute('aria-expanded')).toBe('false')

    renderSelect({ value: 'alpha', onValueChange, disabled: true })
    await click(trigger())
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelector('.ds-select-popover')).toBeNull()
  })

  test('search mode filters by label and value, commits from search and reports empty state', async () => {
    const onValueChange = vi.fn()
    const many: DsOption[] = [
      ...Array.from({ length: 24 }, (_, index) => ({
        value: `v${String(index).padStart(2, '0')}`,
        label: `选项 ${String(index).padStart(2, '0')}`,
      })),
      { value: 'v24', label: '选项 24', description: '特殊' },
    ]
    renderSelect({ value: 'v07', options: many, searchable: true, onValueChange })
    const button = trigger()
    await click(button)
    const search = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
    expect(document.activeElement).toBe(search)
    expect(search.getAttribute('placeholder')).toBe('搜索 25 项')
    expect(document.querySelector('.ds-select-popover__status')?.textContent).toBe('共 25 项')

    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setValue.call(search, 'v12')
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const rows = [...document.querySelectorAll('.ds-select-option')]
    expect(rows).toHaveLength(1)
    expect(rows[0]?.textContent).toContain('选项 12')
    expect(document.querySelector('.ds-select-popover__status')?.textContent).toBe('找到 1 项')

    await key(search, 'Enter')
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith('v12')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)

    await click(button)
    const reopened = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
    await act(async () => {
      setValue.call(reopened, '不存在的词')
      reopened.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(document.querySelector('.ds-select-popover__empty')?.textContent).toBe('没有匹配的选项')
    expect(document.querySelector('.ds-select-popover__status')?.textContent).toBe('找到 0 项')
    expect(onValueChange).toHaveBeenCalledTimes(1)
    await key(reopened, 'Escape')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)
  })

  test('closed-trigger typeahead commits the matching enabled label directly', async () => {
    const onValueChange = vi.fn()
    renderSelect({ value: '', onValueChange })
    const button = trigger()
    button.focus()
    await key(button, 'b')
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith('beta')

    await key(button, '停')
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
  })
})
