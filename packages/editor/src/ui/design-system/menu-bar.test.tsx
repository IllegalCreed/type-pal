// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DsMenuBar, type DsMenuDefinition, DsToolbar, handleMenuCharacterSearch } from './index.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  // 首个可用菜单项聚焦发生在 rAF（渲染后），桩延迟到微任务以贴近真实时序。
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0))
    return 1
  })
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

const menus: DsMenuDefinition[] = [
  {
    id: 'file',
    label: '文件',
    items: [
      { id: 'new', label: '新建', onSelect: () => undefined },
      { id: 'disabled-action', label: '禁用项', disabled: true, onSelect: () => undefined },
      {
        id: 'grid',
        label: '显示网格',
        checked: true,
        onSelect: () => undefined,
      },
    ],
  },
  {
    id: 'edit',
    label: '编辑',
    items: [
      { id: 'undo', label: '撤销', shortcut: 'Ctrl+Z', onSelect: () => undefined },
      {
        id: 'docs',
        label: '帮助文档',
        href: 'https://example.com/docs',
      },
    ],
  },
]

function trigger(label: string): HTMLButtonElement {
  const button = [...host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(
    (candidate) => candidate.textContent === label,
  )
  expect(button).not.toBeNull()
  return button!
}

function openMenu(): HTMLElement | null {
  return document.querySelector('[role="menu"]')
}

async function key(element: Element, keyName: string): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }),
    )
  })
}

async function click(element: Element): Promise<void> {
  if (!(element instanceof HTMLElement)) throw new Error('click target must be an HTMLElement')
  await act(async () => element.click())
}

describe('menu navigation and commands', () => {
  test('opens on click, focuses the first enabled item and executes real selections', async () => {
    const selected = vi.fn()
    act(() =>
      root.render(
        <DsMenuBar
          label="主导航"
          menus={[
            {
              id: 'file',
              label: '文件',
              items: [
                { id: 'new', label: '新建', onSelect: selected },
                { id: 'locked', label: '禁用项', disabled: true, onSelect: selected },
              ],
            },
          ]}
        />,
      ),
    )
    await click(trigger('文件'))
    expect(trigger('文件').getAttribute('aria-expanded')).toBe('true')
    expect(openMenu()?.getAttribute('aria-label')).toBe('文件')
    expect(document.activeElement?.textContent).toBe('新建')

    await click(document.activeElement!)
    expect(selected).toHaveBeenCalledTimes(1)
    expect(trigger('文件').getAttribute('aria-expanded')).toBe('false')
    expect(openMenu()).toBeNull()
  })

  test('arrow keys move between triggers without opening from a closed bar, ArrowDown opens', async () => {
    act(() => root.render(<DsMenuBar label="主导航" menus={menus} />))
    const fileTrigger = trigger('文件')
    fileTrigger.focus()
    await key(fileTrigger, 'ArrowRight')
    expect(document.activeElement).toBe(trigger('编辑'))
    expect(openMenu()).toBeNull()

    await key(trigger('编辑'), 'ArrowDown')
    expect(trigger('编辑').getAttribute('aria-expanded')).toBe('true')
    expect(openMenu()?.getAttribute('aria-label')).toBe('编辑')

    await key(openMenu()!, 'Escape')
    expect(openMenu()).toBeNull()
    expect(document.activeElement).toBe(trigger('编辑'))
  })

  test('sections, checkbox items, href navigation and disabled entries keep their contracts', async () => {
    const onNavigate = vi.fn<NonNullable<Parameters<typeof DsMenuBar>[0]['onNavigate']>>((event) =>
      event.preventDefault(),
    )
    const toggled = vi.fn()
    const sectioned: DsMenuDefinition[] = [
      {
        id: 'file',
        label: '文件',
        items: [
          {
            id: 'grid',
            label: '显示网格',
            checked: true,
            onSelect: toggled,
          },
          { id: 'locked-link', label: '禁用链接', href: 'https://example.com/x', disabled: true },
        ],
      },
      {
        id: 'edit',
        label: '编辑',
        items: [{ id: 'docs', label: '帮助文档', href: 'https://example.com/docs' }],
      },
    ]
    act(() => root.render(<DsMenuBar label="主导航" menus={sectioned} onNavigate={onNavigate} />))
    await click(trigger('文件'))
    const menu = openMenu()!
    const group = menu.querySelector('[role="group"]')
    expect(group).not.toBeNull()
    const checkbox = menu.querySelector('[role="menuitemcheckbox"]')!
    expect(checkbox.getAttribute('aria-checked')).toBe('true')
    expect(checkbox.textContent).toContain('显示网格')

    const disabledLink = [...menu.querySelectorAll('a')].find(
      (link) => link.textContent === '禁用链接',
    )!
    expect(disabledLink.getAttribute('href')).toBeNull()

    await click(checkbox)
    expect(toggled).toHaveBeenCalledTimes(1)
    expect(openMenu()).toBeNull()

    await click(trigger('编辑'))
    const link = [...openMenu()!.querySelectorAll('a')].find(
      (candidate) => candidate.textContent === '帮助文档',
    )!
    await click(link)
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(onNavigate.mock.calls[0]?.[1]?.id).toBe('docs')
    expect(onNavigate.mock.calls[0]?.[1]?.href).toBe('https://example.com/docs')
    expect(onNavigate.mock.calls[0]?.[0]?.nativeEvent.defaultPrevented).toBe(true)
    expect(openMenu()).toBeNull()
  })
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
  const link = document.querySelector<HTMLAnchorElement>('[role="menuitem"][href]')!
  const popover = link.closest<HTMLElement>('.ds-menu-popover')!
  expect(popover.closest('.ds-menu-floating-layer')?.parentElement).toBe(document.body)
  expect(host.contains(popover)).toBe(false)
  expect(link.getAttribute('href')).toBe('?module=battle&page=battlefield')
  link.focus()
  await act(async () =>
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  )
  expect(document.activeElement).toBe(trigger)
  expect(document.querySelector('.ds-menu-popover')).toBeNull()
})

test('section-grid menu exposes modules as groups and pages as primary links', async () => {
  const menus: DsMenuDefinition[] = [
    {
      id: 'navigation',
      label: '导航',
      layout: 'section-grid',
      items: [
        { id: 'scene', section: '场景', label: '场景编排', href: '?module=scene' },
        { id: 'ambience', section: '场景', label: '氛围', href: '?module=scene&page=ambience' },
        {
          id: 'overview',
          section: '项目设置',
          label: '概览',
          href: '?module=project&page=overview',
          current: true,
        },
      ],
    },
  ]
  await act(async () => root.render(<DsMenuBar label="主菜单" menus={menus} />))
  await click(host.querySelector<HTMLButtonElement>('.ds-menu-trigger')!)

  const popover = document.querySelector<HTMLElement>('.ds-menu-popover')!
  expect(popover.dataset.layout).toBe('section-grid')
  expect(popover.querySelector(':scope > .ds-menu-group-flow')?.getAttribute('role')).toBe(
    'presentation',
  )
  expect(
    [...popover.querySelectorAll<HTMLElement>('[role="group"]')].map((group) =>
      group.getAttribute('aria-label'),
    ),
  ).toEqual(['场景', '项目设置'])
  expect(
    [...popover.querySelectorAll<HTMLElement>('.ds-menu-section-title')].map(
      (title) => title.textContent,
    ),
  ).toEqual(['场景', '项目设置'])
  expect(
    [...popover.querySelectorAll<HTMLAnchorElement>('.ds-menu-item')].map(
      (item) => item.textContent,
    ),
  ).toEqual(['场景编排', '氛围', '概览'])
  expect(popover.querySelector('[aria-current="page"]')?.textContent).toBe('概览')
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
          groups={[[{ id: 'left', label: '对象列表', icon: 'panel-left', pressed: true, execute }]]}
        />
      </>,
    ),
  )
  await click(host.querySelector<HTMLButtonElement>('.ds-menu-trigger')!)
  expect(document.querySelector('[role="menuitemcheckbox"]')?.getAttribute('aria-checked')).toBe(
    'true',
  )
  const toolbar = host.querySelector<HTMLButtonElement>('[aria-label="对象列表"][aria-pressed]')!
  expect(toolbar.getAttribute('aria-pressed')).toBe('true')
  await click(toolbar)
  expect(execute).toHaveBeenCalledOnce()
})

describe('legacy exported menu character search', () => {
  const labels = ['新建', '打开', '保存']

  function search(
    key: string,
    labels: readonly string[],
    modifiers: { meta?: boolean; ctrl?: boolean; alt?: boolean } = {},
  ): number | undefined {
    let result: number | undefined
    act(() =>
      root.render(
        <button
          type="button"
          onKeyDown={(event) => {
            result = handleMenuCharacterSearch(event, labels)
          }}
        >
          Keyboard host
        </button>,
      ),
    )
    const target = host.querySelector('button')
    if (!target) throw new Error('keyboard host missing')
    act(() => {
      target.dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          metaKey: modifiers.meta ?? false,
          ctrlKey: modifiers.ctrl ?? false,
          altKey: modifiers.alt ?? false,
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    return result
  }

  test('matches single unmodified characters case-insensitively by label prefix', () => {
    expect(search('保', labels)).toBe(2)
    expect(search('d', ['Open', 'Duplicate'])).toBe(1)
    expect(search('z', labels)).toBeUndefined()
  })

  test('ignores multi-character keys and modifier chords', () => {
    expect(search('ArrowDown', labels)).toBeUndefined()
    expect(search('Enter', labels)).toBeUndefined()
    expect(search('s', labels, { meta: true })).toBeUndefined()
    expect(search('s', labels, { ctrl: true })).toBeUndefined()
    expect(search('s', labels, { alt: true })).toBeUndefined()
  })
})
