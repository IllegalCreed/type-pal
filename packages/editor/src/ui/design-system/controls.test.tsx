// @vitest-environment jsdom
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  DsActionLink,
  DsButton,
  DsCheckbox,
  DsControlGroup,
  DsField,
  DsIconButton,
  DsListHeader,
  DsMenuBar,
  type DsMenuDefinition,
  DsMultiSelect,
  DsNumberInput,
  type DsOption,
  DsRadioGroup,
  DsSelect,
  DsSwitch,
  DsTabs,
  DsTag,
  DsTextArea,
  DsTextInput,
  DsToolbar,
} from './index.js'

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

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
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

describe('editor design-system controls', () => {
  test('buttons and action links share geometry while preserving native semantics', async () => {
    const buttonRef = createRef<HTMLButtonElement>()
    await act(async () =>
      root.render(
        <>
          <DsActionLink
            variant="secondary"
            size="compact"
            icon="open"
            href="/preview"
            target="_blank"
            rel="noopener noreferrer"
          >
            试放
          </DsActionLink>
          <DsButton ref={buttonRef} variant="danger" size="compact" icon="delete">
            删除
          </DsButton>
          <DsTag>使用</DsTag>
          <DsTag tone="neutral">引用 8</DsTag>
        </>,
      ),
    )

    const link = host.querySelector<HTMLAnchorElement>('a')!
    const button = host.querySelector<HTMLButtonElement>('button')!
    expect([...link.classList]).toEqual(
      expect.arrayContaining(['ds-button', 'ds-button--secondary', 'ds-button--compact']),
    )
    expect([...button.classList]).toEqual(
      expect.arrayContaining(['ds-button', 'ds-button--danger', 'ds-button--compact']),
    )
    expect(link.getAttribute('href')).toBe('/preview')
    expect(link.target).toBe('_blank')
    expect(link.rel.split(/\s+/).sort()).toEqual(['noopener', 'noreferrer'])
    expect(buttonRef.current).toBe(button)
    buttonRef.current?.focus()
    expect(document.activeElement).toBe(button)
    expect(host.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2)
    expect([...host.querySelectorAll('.ds-tag')].map((tag) => tag.textContent)).toEqual([
      '使用',
      '引用 8',
    ])
  })

  test('keeps checkbox mixed state, radio exclusivity and switch semantics programmatic', async () => {
    const onRadio = vi.fn()
    await act(async () =>
      root.render(
        <>
          <DsCheckbox label="已启用" checked readOnly />
          <DsCheckbox label="部分选择" indeterminate />
          <DsCheckbox label="紧凑选择" size="compact" />
          <DsRadioGroup
            name="mode"
            label="移动模式"
            value="normal"
            options={[
              { value: 'normal', label: '普通' },
              { value: 'floating', label: '浮空' },
            ]}
            onChange={onRadio}
          />
          <DsSwitch label="即时预览" checked readOnly />
        </>,
      ),
    )
    const checks = [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
    const checked = checks[0]!
    const mixed = checks[1]!
    const compact = checks[2]!
    expect(checked.checked).toBe(true)
    expect(checked.closest('.ds-check-label')).not.toBeNull()
    expect(mixed.indeterminate).toBe(true)
    expect(mixed.getAttribute('aria-checked')).toBe('mixed')
    expect(compact.closest('.ds-check-label')).toHaveProperty(
      'className',
      expect.stringContaining('ds-check-label--compact'),
    )
    const radios = [...host.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
    expect(radios.map((radio) => radio.checked)).toEqual([true, false])
    await click(radios[1]!)
    expect(onRadio).toHaveBeenCalledWith('floating')
    expect(host.querySelector<HTMLInputElement>('[role="switch"]')?.checked).toBe(true)
  })

  test('keeps form shells, labels and trailing actions on the shared size contract', async () => {
    await act(async () =>
      root.render(
        <>
          <DsField id="name" label="名称" help="用于列表显示">
            <DsTextInput id="name" defaultValue="梦蛇" />
          </DsField>
          <DsNumberInput aria-label="数值" defaultValue={99} monospace />
          <DsSelect
            aria-label="紧凑模式"
            size="compact"
            value="self"
            options={[{ value: 'self', label: '自身' }]}
            onValueChange={() => undefined}
          />
          <DsTextArea aria-label="说明" defaultValue="说明文字" />
          <DsControlGroup
            leading={<span data-testid="leading">缩略图</span>}
            control={
              <DsSelect
                aria-label="特效音"
                value="335"
                options={[{ value: '335', label: 'PAL 音效 335' }]}
                onValueChange={() => undefined}
              />
            }
            actions={
              <>
                <DsIconButton label="试听" icon="play" variant="secondary" />
                <DsIconButton label="打开" icon="open" variant="secondary" size="compact" />
              </>
            }
          />
        </>,
      ),
    )

    expect(host.querySelector<HTMLLabelElement>('.ds-field__label')?.htmlFor).toBe('name')
    expect(host.querySelector<HTMLInputElement>('#name')?.className).toBe('ds-input')
    const numberInput = host.querySelector<HTMLInputElement>('[aria-label="数值"]')
    expect(numberInput?.type).toBe('number')
    expect(numberInput?.inputMode).toBe('decimal')
    expect(numberInput?.classList).toContain('ds-control--monospace')
    expect(
      host.querySelector<HTMLButtonElement>('[role="combobox"][aria-label="紧凑模式"]')?.classList,
    ).toContain('ds-select--compact')
    expect(host.querySelector<HTMLTextAreaElement>('[aria-label="说明"]')?.className).toBe(
      'ds-textarea',
    )
    expect(
      host.querySelector('.ds-control-group__control > .ds-select[aria-label="特效音"]'),
    ).not.toBeNull()
    expect(host.querySelector('[aria-label="试听"]')?.classList).toContain(
      'ds-icon-button--secondary',
    )
    expect(host.querySelector('[aria-label="打开"]')?.classList).toContain(
      'ds-icon-button--compact',
    )
  })

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
    expect(onValueChange).toHaveBeenCalledWith('c')
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
    expect(mountedOptions.length).toBeLessThanOrEqual(120)

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

  test('select Escape closes its portal and restores focus to the combobox', async () => {
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

  test('tabs use roving tabindex and arrow keys', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <DsTabs
          size="compact"
          label="角色分区"
          activeId="overview"
          items={[
            { id: 'overview', label: '总览' },
            { id: 'growth', label: '战斗与成长' },
          ]}
          onChange={onChange}
        />,
      ),
    )
    const tabs = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1])
    expect(tabs[0]?.classList).toContain('ds-tab--compact')
    await act(async () =>
      tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
    )
    expect(onChange).toHaveBeenCalledWith('growth')
  })

  test('menu navigation is a real link and Escape returns focus to its trigger', async () => {
    const menus: DsMenuDefinition[] = [
      {
        id: 'battle',
        label: '战斗',
        items: [{ id: 'battlefield', label: '战场', href: '?module=battle&page=battlefield' }],
      },
    ]
    await act(async () => root.render(<DsMenuBar label="主菜单" menus={menus} />))
    const trigger = host.querySelector<HTMLButtonElement>('.ds-menu-trigger')!
    await click(trigger)
    const link = host.querySelector<HTMLAnchorElement>('[role="menuitem"][href]')!
    expect(link.getAttribute('href')).toBe('?module=battle&page=battlefield')
    link.focus()
    await act(async () =>
      link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    )
    expect(document.activeElement).toBe(trigger)
    expect(host.querySelector('.ds-menu-popover')).toBeNull()
  })

  test('toolbar reuses the supplied handler and never manufactures a second command', async () => {
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

  test('list headers own the complete action and overflow structure', async () => {
    const create = vi.fn()
    const duplicate = vi.fn()
    await act(async () =>
      root.render(
        <DsListHeader
          title="地图"
          count={223}
          unit="张"
          actions={[{ id: 'create', label: '新建地图', icon: '＋', onClick: create }]}
          overflowActions={[{ id: 'duplicate', label: '复制地图', onClick: duplicate }]}
        />,
      ),
    )
    expect(host.querySelector('.ds-list-header__title')?.textContent).toBe('地图')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toContain('223 张')
    const createButton = host.querySelector<HTMLButtonElement>('[aria-label="新建地图"]')!
    expect(createButton.className).toBe('ds-list-header__action')
    await click(createButton)
    expect(create).toHaveBeenCalledOnce()
    const details = host.querySelector<HTMLDetailsElement>('.ds-list-header__menu')!
    details.open = true
    await click(host.querySelector<HTMLButtonElement>('.ds-list-header__menu-popup button')!)
    expect(duplicate).toHaveBeenCalledOnce()
    expect(details.open).toBe(false)
  })

  test('toggle commands expose pressed toolbar and checked menu semantics', async () => {
    const execute = vi.fn()
    await act(async () =>
      root.render(
        <>
          <DsMenuBar
            label="主菜单"
            menus={[
              {
                id: 'view',
                label: '视图',
                items: [
                  {
                    id: 'left',
                    label: '对象列表',
                    icon: 'panel-left',
                    checked: true,
                    onSelect: execute,
                  },
                ],
              },
            ]}
          />
          <DsToolbar
            label="布局"
            groups={[
              [{ id: 'left', label: '对象列表', icon: 'panel-left', pressed: true, execute }],
            ]}
          />
        </>,
      ),
    )
    await click(host.querySelector<HTMLButtonElement>('.ds-menu-trigger')!)
    expect(host.querySelector('[role="menuitemcheckbox"]')?.getAttribute('aria-checked')).toBe(
      'true',
    )
    const toolbar = host.querySelector<HTMLButtonElement>('[aria-label="对象列表"][aria-pressed]')!
    expect(toolbar.getAttribute('aria-pressed')).toBe('true')
    await click(toolbar)
    expect(execute).toHaveBeenCalledOnce()
  })

  test('multi-select preserves multiple identities and exposes selected count', async () => {
    const options: DsOption[] = [
      { value: 'a', label: '甲' },
      { value: 'b', label: '乙' },
      { value: 'c', label: '丙' },
    ]
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <DsMultiSelect
          label="队伍"
          size="compact"
          options={options}
          value={['a', 'b']}
          onChange={onChange}
        />,
      ),
    )
    await click(host.querySelector<HTMLButtonElement>('[aria-label="队伍"]')!)
    expect(host.textContent).toContain('已选 2 项')
    expect(host.querySelectorAll('.ds-multiselect__option')).toHaveLength(3)
    expect(host.querySelector('.ds-multiselect__option.ds-menu-item')).toBeNull()
    for (const label of host.querySelectorAll('.ds-multiselect__option > .ds-check-label'))
      expect(label.classList).toContain('ds-check-label--compact')
    const boxes = [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
    await click(boxes[2]!)
    expect(onChange).toHaveBeenCalledWith(['a', 'b', 'c'])
  })

  test('multi-select keeps hidden selections and closes from option focus with Escape', async () => {
    const options: DsOption[] = [
      { value: 'a', label: '甲' },
      { value: 'b', label: '乙' },
      { value: 'c', label: '丙' },
    ]
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <DsMultiSelect label="队伍" options={options} value={['a']} onChange={onChange} />,
      ),
    )

    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="队伍"]')!
    await click(trigger)
    await input(host.querySelector<HTMLInputElement>('[aria-label="搜索队伍"]')!, '丙')
    expect(host.querySelectorAll('.ds-multiselect__option')).toHaveLength(1)
    await click(
      [...host.querySelectorAll<HTMLButtonElement>('.ds-menu-item')].find(
        (button) => button.textContent === '全选',
      )!,
    )
    expect(onChange).toHaveBeenLastCalledWith(['a', 'c'])

    const option = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    option.focus()
    await act(async () =>
      option.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    )
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})
