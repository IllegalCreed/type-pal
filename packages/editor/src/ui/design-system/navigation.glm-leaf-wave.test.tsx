// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  DsMenuBar,
  type DsMenuDefinition,
  DsToolbar,
  handleMenuCharacterSearch,
} from './navigation.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
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
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
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
  await act(async () => (element as HTMLElement).click())
}

describe('DsMenuBar 剩余合同', () => {
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
    const onNavigate = vi.fn()
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
    expect(openMenu()).toBeNull()
  })
})

describe('DsToolbar 剩余合同', () => {
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
  })
})

describe('handleMenuCharacterSearch 剩余合同', () => {
  const labels = ['新建', '打开', '保存']

  function event(key: string, modifiers: { meta?: boolean; ctrl?: boolean; alt?: boolean } = {}) {
    // 测试宿主垫片：函数只读取 key/修饰键，等价于生产侧的 React 合成事件字段。
    return {
      key,
      metaKey: modifiers.meta ?? false,
      ctrlKey: modifiers.ctrl ?? false,
      altKey: modifiers.alt ?? false,
    } as Parameters<typeof handleMenuCharacterSearch>[0]
  }

  test('matches single unmodified characters case-insensitively by label prefix', () => {
    expect(handleMenuCharacterSearch(event('保'), labels)).toBe(2)
    expect(handleMenuCharacterSearch(event('d'), ['Open', 'Duplicate'])).toBe(1)
    expect(handleMenuCharacterSearch(event('z'), labels)).toBeUndefined()
  })

  test('ignores multi-character keys and modifier chords', () => {
    expect(handleMenuCharacterSearch(event('ArrowDown'), labels)).toBeUndefined()
    expect(handleMenuCharacterSearch(event('Enter'), labels)).toBeUndefined()
    expect(handleMenuCharacterSearch(event('s', { meta: true }), labels)).toBeUndefined()
    expect(handleMenuCharacterSearch(event('s', { ctrl: true }), labels)).toBeUndefined()
    expect(handleMenuCharacterSearch(event('s', { alt: true }), labels)).toBeUndefined()
  })
})
