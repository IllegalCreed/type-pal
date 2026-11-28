// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { installReactActEnvironment } from '../../__tests__/react-io-wait.js'
import { type DsOption, DsSelect, DsSelectField } from './index.js'

let host: HTMLDivElement
let root: Root
let restoreAct: () => void

beforeEach(() => {
  restoreAct = installReactActEnvironment()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    vi.restoreAllMocks()
    restoreAct()
  }
})

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.click())
}

async function keyDown(
  element: HTMLElement,
  key: string,
  init: Omit<KeyboardEventInit, 'key'> = {},
): Promise<void> {
  await act(async () =>
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    ),
  )
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

test('select supports portal click and keyboard selection while skipping disabled options', async () => {
  const onValueChange = vi.fn()
  const options: DsOption[] = [
    { value: 'a', label: '甲' },
    { value: 'b', label: '乙', disabled: true },
    { value: 'c', label: '丙' },
  ]
  await act(async () =>
    root.render(
      <DsSelect aria-label="目标" value="a" options={options} onValueChange={onValueChange} />,
    ),
  )

  const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
  expect(trigger.getAttribute('aria-haspopup')).toBe('listbox')
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  await click(trigger)

  const listbox = document.querySelector<HTMLElement>('[role="listbox"]')!
  const optionElements = [...document.querySelectorAll<HTMLElement>('[role="option"]')]
  expect(host.contains(listbox)).toBe(false)
  expect(trigger.getAttribute('aria-controls')).toBe(listbox.id)
  expect(optionElements.map((option) => option.textContent)).toEqual(['甲', '乙', '丙'])
  expect(optionElements[1]?.getAttribute('aria-disabled')).toBe('true')

  await click(optionElements[1]!)
  expect(onValueChange).not.toHaveBeenCalled()
  expect(trigger.getAttribute('aria-expanded')).toBe('true')

  await click(optionElements[2]!)
  expect(onValueChange).toHaveBeenCalledWith('c')
  expect(document.querySelector('[role="listbox"]')).toBeNull()

  onValueChange.mockClear()
  await keyDown(trigger, 'ArrowDown')
  await keyDown(trigger, 'ArrowDown')
  const activeId = trigger.getAttribute('aria-activedescendant')
  expect(activeId).not.toBeNull()
  expect(document.getElementById(activeId!)?.textContent).toContain('丙')
  await keyDown(trigger, 'Enter')
  expect(onValueChange.mock.calls).toEqual([['c']])

  await act(async () =>
    root.render(
      <DsSelect
        aria-label="目标"
        value="a"
        options={options}
        disabled
        onValueChange={onValueChange}
      />,
    ),
  )
  await click(trigger)
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  expect(onValueChange.mock.calls).toEqual([['c']])
})

test('select preserves full clipped copy and supports a monospace secondary identifier', async () => {
  await act(async () =>
    root.render(
      <DsSelect
        aria-label="资源候选"
        title="灵泉水、炼丹炉·水纹超级长名称 · spiritWater"
        value="spirit-water"
        options={[
          {
            value: 'spirit-water',
            label: '灵泉水、炼丹炉·水纹超级长名称',
            description: 'spiritWater',
            title: '灵泉水、炼丹炉·水纹超级长名称 · spiritWater',
            descriptionMonospace: true,
          },
        ]}
        onValueChange={() => undefined}
      />,
    ),
  )

  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="资源候选"]')!
  expect(trigger.title).toBe('灵泉水、炼丹炉·水纹超级长名称 · spiritWater')
  expect(trigger.querySelector('.ds-select__description')?.classList).toContain(
    'ds-control--monospace',
  )
  await click(trigger)
  const option = document.querySelector<HTMLElement>('[role="option"]')!
  expect(option.textContent).toContain('spiritWater')
  expect(option.title).toBe('灵泉水、炼丹炉·水纹超级长名称 · spiritWater')
  expect(option.querySelector('.ds-select-option__description')?.classList).toContain(
    'ds-control--monospace',
  )
})

test('select keeps its popup inside the nearest native dialog top-layer context', async () => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0)
    return 1
  })
  const onValueChange = vi.fn()
  const options: DsOption[] = Array.from({ length: 30 }, (_, index) => ({
    value: String(index),
    label: `选项 ${index}`,
  }))
  await act(async () =>
    root.render(
      <dialog open aria-label="编辑指令">
        <button type="button" aria-label="弹窗前一个控件">
          前一个
        </button>
        <DsSelect aria-label="开关名" value="0" options={options} onValueChange={onValueChange} />
        <button type="button" aria-label="弹窗后一个控件">
          后一个
        </button>
      </dialog>,
    ),
  )

  const dialog = host.querySelector<HTMLDialogElement>('dialog')!
  const trigger = dialog.querySelector<HTMLButtonElement>('[role="combobox"]')!
  await click(trigger)
  const listbox = dialog.querySelector<HTMLElement>('[role="listbox"]')!
  expect(listbox).not.toBeNull()
  expect(listbox.closest('dialog')).toBe(dialog)
  const search = dialog.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
  expect(document.activeElement).toBe(search)
  await keyDown(search, 'Tab')
  expect(document.activeElement).toBe(dialog.querySelector('[aria-label="弹窗后一个控件"]'))
  expect(dialog.hasAttribute('open')).toBe(true)

  trigger.focus()
  await click(trigger)
  const reopenedSearch = dialog.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
  await keyDown(reopenedSearch, 'Escape')
  expect(dialog.querySelector('[role="listbox"]')).toBeNull()
  expect(dialog.hasAttribute('open')).toBe(true)
  expect(document.activeElement).toBe(trigger)

  await click(trigger)
  const reopenedListbox = dialog.querySelector<HTMLElement>('[role="listbox"]')!
  const option = [...reopenedListbox.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent?.includes('选项 1'),
  )!
  await click(option)
  expect(onValueChange).toHaveBeenCalledWith('1')
})

test('select surfaces an unknown controlled value without inventing an option', async () => {
  await act(async () =>
    root.render(
      <DsSelect
        aria-label="未知目标"
        value="missing-id"
        options={[{ value: 'known-id', label: '已知目标' }]}
        onValueChange={() => undefined}
      />,
    ),
  )

  const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
  expect(trigger.dataset.missing).toBe('true')
  expect(trigger.textContent).toContain('missing-id（缺失）')
  await click(trigger)
  expect(document.querySelectorAll('[role="option"]')).toHaveLength(1)
  expect(document.querySelector('[role="option"]')?.getAttribute('aria-selected')).toBe('false')
})

test('large selects search their full data set while mounting only a bounded option window', async () => {
  const options: DsOption[] = Array.from({ length: 500 }, (_, index) => {
    const suffix = String(index).padStart(3, '0')
    return { value: `item-${suffix}`, label: `选项 ${suffix}` }
  })
  await act(async () =>
    root.render(
      <DsSelect
        aria-label="大型列表"
        value="item-050"
        options={options}
        onValueChange={() => undefined}
      />,
    ),
  )

  await click(host.querySelector<HTMLButtonElement>('[role="combobox"]')!)
  const search = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
  const mountedOptions = document.querySelectorAll('[role="option"]')
  expect(search.placeholder).toBe('搜索 500 项')
  expect(mountedOptions.length).toBeGreaterThan(0)
  expect(mountedOptions.length).toBeLessThanOrEqual(16)

  await input(search, '选项 499')
  expect(
    [...document.querySelectorAll('[role="option"]')].map((option) => option.textContent),
  ).toEqual(['选项 499'])
  expect(document.querySelector('.ds-select-popover__status')?.textContent).toBe('找到 1 项')
})

test('searchable select keeps its active option mounted across filtering and virtual scrolling', async () => {
  const options: DsOption[] = Array.from({ length: 500 }, (_, index) => {
    const suffix = String(index).padStart(3, '0')
    return { value: `item-${suffix}`, label: `选项 ${suffix}` }
  })
  await act(async () =>
    root.render(
      <DsSelect
        aria-label="虚拟列表"
        value="item-450"
        options={options}
        onValueChange={() => undefined}
      />,
    ),
  )

  await click(host.querySelector<HTMLButtonElement>('[aria-label="虚拟列表"]')!)
  const search = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
  expect(document.getElementById(search.getAttribute('aria-activedescendant')!)).not.toBeNull()

  await input(search, '选项')
  expect(document.getElementById(search.getAttribute('aria-activedescendant')!)).not.toBeNull()

  const listbox = document.querySelector<HTMLElement>('[role="listbox"]')!
  await act(async () => {
    listbox.scrollTop = 400 * 40
    listbox.dispatchEvent(new Event('scroll', { bubbles: true }))
  })
  const active = document.getElementById(search.getAttribute('aria-activedescendant')!)
  expect(active).not.toBeNull()
  expect(Number(active?.getAttribute('aria-posinset'))).toBeGreaterThanOrEqual(400)
  expect(active?.getAttribute('aria-setsize')).toBe('500')
})

test('searchable select restores logical Tab order around its portalled search field', async () => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0)
    return 1
  })
  const options: DsOption[] = Array.from({ length: 30 }, (_, index) => ({
    value: String(index),
    label: `选项 ${index}`,
  }))
  await act(async () =>
    root.render(
      <>
        <button type="button" aria-label="前一个控件">
          前一个
        </button>
        <DsSelect
          aria-label="搜索选择器"
          value="0"
          options={options}
          onValueChange={() => undefined}
        />
        <button type="button" aria-label="后一个控件">
          后一个
        </button>
      </>,
    ),
  )

  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="搜索选择器"]')!
  trigger.focus()
  await click(trigger)
  let search = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
  expect(document.activeElement).toBe(search)
  expect(search.getAttribute('role')).toBe('combobox')
  expect(trigger.getAttribute('role')).toBeNull()
  await keyDown(search, 'Tab')
  expect(document.querySelector('[role="listbox"]')).toBeNull()
  expect(document.activeElement).toBe(host.querySelector('[aria-label="后一个控件"]'))

  trigger.focus()
  await click(trigger)
  search = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
  await keyDown(search, 'Tab', { shiftKey: true })
  expect(document.activeElement).toBe(host.querySelector('[aria-label="前一个控件"]'))

  trigger.focus()
  await click(trigger)
  search = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
  await keyDown(search, 'Escape')
  expect(document.querySelector('[role="listbox"]')).toBeNull()
  expect(document.activeElement).toBe(trigger)
})

test('Escape closes its portal and restores focus to the combobox', async () => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0)
    return 1
  })
  await act(async () =>
    root.render(
      <DsSelect
        aria-label="逃离列表"
        value="a"
        options={[
          { value: 'a', label: '甲' },
          { value: 'b', label: '乙' },
        ]}
        onValueChange={() => undefined}
      />,
    ),
  )

  const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
  trigger.focus()
  await click(trigger)
  await keyDown(trigger, 'Escape')

  expect(document.querySelector('[role="listbox"]')).toBeNull()
  expect(document.activeElement).toBe(trigger)
})

test('search mode filters by label and value, commits from search and reports empty state', async () => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0)
    return 1
  })
  const onValueChange = vi.fn()
  const many: DsOption[] = [
    ...Array.from({ length: 24 }, (_, index) => ({
      value: `v${String(index).padStart(2, '0')}`,
      label: `选项 ${String(index).padStart(2, '0')}`,
    })),
    { value: 'v24', label: '选项 24', description: '特殊' },
  ]

  await act(async () =>
    root.render(
      <DsSelect
        aria-label="目标"
        value="v07"
        options={many}
        searchable
        onValueChange={onValueChange}
      />,
    ),
  )
  const button = host.querySelector<HTMLButtonElement>('[aria-label="目标"]')!
  await click(button)
  const search = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
  expect(search.getAttribute('aria-label')).toBe('筛选目标')
  expect(search.getAttribute('placeholder')).toBe('搜索 25 项')
  expect(document.querySelector('.ds-select-popover__status')?.textContent).toBe('共 25 项')

  await input(search, 'v12')
  const rows = [...document.querySelectorAll('.ds-select-option')]
  expect(rows).toHaveLength(1)
  expect(rows[0]?.textContent).toContain('选项 12')
  expect(document.querySelector('.ds-select-popover__status')?.textContent).toBe('找到 1 项')

  await keyDown(search, 'Enter')
  expect(onValueChange).toHaveBeenCalledTimes(1)
  expect(onValueChange).toHaveBeenCalledWith('v12')
  expect(button.getAttribute('aria-expanded')).toBe('false')
  expect(document.activeElement).toBe(button)

  await click(button)
  const reopened = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
  await input(reopened, '特殊')
  expect(document.querySelector('[role="option"]')?.textContent).toBe('选项 24特殊')
  await input(reopened, '不存在的词')
  expect(document.querySelector('.ds-select-popover__empty')?.textContent).toBe('没有匹配的选项')
  expect(document.querySelector('.ds-select-popover__status')?.textContent).toBe('找到 0 项')
  expect(onValueChange).toHaveBeenCalledTimes(1)
  await keyDown(reopened, 'Escape')
  expect(button.getAttribute('aria-expanded')).toBe('false')
  expect(document.activeElement).toBe(button)
})

test('typeahead skips disabled labels while closed and chooses an open match only on confirmation', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const onValueChange = vi.fn()
  await act(async () =>
    root.render(
      <DsSelect
        aria-label="目标"
        value="alpha"
        options={[
          { value: 'alpha', label: 'Alpha' },
          { value: 'disable', label: 'Disabled', disabled: true },
          { value: 'b', label: 'Beta' },
        ]}
        onValueChange={onValueChange}
      />,
    ),
  )
  const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!

  await keyDown(trigger, 'd')
  expect(onValueChange).not.toHaveBeenCalled()
  expect(trigger.getAttribute('aria-expanded')).toBe('false')

  clock.mockReturnValue(1800)
  await keyDown(trigger, 'b')
  expect(onValueChange.mock.calls).toEqual([['b']])
  expect(trigger.getAttribute('aria-expanded')).toBe('false')

  clock.mockReturnValue(2600)
  await keyDown(trigger, 'ArrowDown')
  await keyDown(trigger, 'b')
  const activeId = trigger.getAttribute('aria-activedescendant')
  expect(activeId && document.getElementById(activeId)?.textContent).toBe('Beta')
  expect(onValueChange.mock.calls).toEqual([['b']])
  await keyDown(trigger, 'Enter')
  expect(onValueChange.mock.calls).toEqual([['b'], ['b']])
})

test('keeps placeholders distinct from real options and mirrors a new controlled selection', async () => {
  const change = vi.fn()
  const view = (value: string, options: DsOption[], placeholder?: string) => (
    <DsSelect
      size="compact"
      aria-label="精灵"
      value={value}
      options={options}
      onValueChange={change}
      placeholder={placeholder}
    />
  )
  await act(async () => root.render(view('', [], '尚无选项')))
  const trigger = host.querySelector<HTMLButtonElement>('button')!
  expect(trigger.textContent).toContain('尚无选项')
  expect(trigger.disabled).toBe(false)
  expect(trigger.classList.contains('ds-select--compact')).toBe(true)
  const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
  await act(async () => trigger.dispatchEvent(tab))
  expect(tab.defaultPrevented).toBe(false)
  expect(trigger.getAttribute('aria-expanded')).toBe('false')

  const alternatives = [
    { value: 'cat', label: '狸猫' },
    { value: 'flower', label: '花精' },
  ]
  await act(async () => root.render(view('', alternatives)))
  expect(trigger.textContent).toContain('请选择')
  await act(async () => root.render(view('cat', alternatives)))
  expect(trigger.textContent).toContain('狸猫')
  await act(async () => root.render(view('flower', alternatives)))
  expect(trigger.textContent).toContain('花精')
  expect(trigger.dataset.missing).toBeUndefined()
  expect(change).not.toHaveBeenCalled()
})

test('the field connects its label, range error and help to the same trigger', async () => {
  const props = {
    id: 'facing',
    label: '朝向',
    options: [{ value: 'north', label: '北' }],
    value: 'north',
    onValueChange: () => undefined,
  }
  await act(async () =>
    root.render(
      <DsSelectField
        {...props}
        required
        layout="inline"
        help="面向离开点。"
        error="当前场景不支持。"
      />,
    ),
  )
  const trigger = host.querySelector<HTMLButtonElement>('button')!
  expect(trigger.labels?.[0]?.control).toBe(trigger)
  expect(trigger.labels?.[0]?.textContent).toContain('朝向')
  expect(trigger.closest('.ds-field--inline')).not.toBeNull()
  expect(trigger.getAttribute('aria-required')).toBe('true')
  expect(trigger.getAttribute('aria-invalid')).toBe('true')
  const describedText = () =>
    document.getElementById(trigger.getAttribute('aria-describedby') ?? '')?.textContent
  expect(describedText()).toBe('当前场景不支持。')

  await act(async () => root.render(<DsSelectField {...props} help="面向离开点。" />))
  expect(describedText()).toBe('面向离开点。')
  expect(trigger.hasAttribute('aria-invalid')).toBe(false)

  await act(async () => root.render(<DsSelectField {...props} invalid />))
  expect(trigger.getAttribute('aria-invalid')).toBe('true')
  expect(trigger.hasAttribute('aria-describedby')).toBe(false)
})
