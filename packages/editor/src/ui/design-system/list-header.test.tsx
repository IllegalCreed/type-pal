// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { installReactActEnvironment } from '../../__tests__/react-io-wait.js'
import { DsListHeader } from './index.js'

let host: HTMLDivElement
let root: Root
let restoreAct: () => void

beforeEach(() => {
  restoreAct = installReactActEnvironment()
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
  restoreAct()
})

function menuTrigger(): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')
  expect(button).not.toBeNull()
  return button!
}

function menu(): HTMLElement | null {
  return document.querySelector('[role="menu"]')
}

function menuItems(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.click())
}

async function key(element: Element, keyName: string): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }),
    )
  })
}

function renderHeader(overrides: Partial<Parameters<typeof DsListHeader>[0]> = {}): void {
  act(() =>
    root.render(
      <DsListHeader
        title="组合库"
        count={12}
        unit="项"
        actions={[
          {
            id: 'add',
            label: '新增',
            icon: 'add',
            onClick: () => undefined,
          },
        ]}
        overflowActions={[
          { id: 'rename', label: '重命名', onClick: () => undefined },
          { id: 'locked', label: '停用位', disabled: true, onClick: () => undefined },
          { id: 'remove', label: '删除', danger: true, onClick: () => undefined },
        ]}
        {...overrides}
      />,
    ),
  )
}

describe('list header overflow and actions', () => {
  test('overflow menu opens, focuses the first enabled item and executes it once', async () => {
    const rename = vi.fn()
    renderHeader({
      overflowActions: [
        { id: 'locked', label: '停用位', disabled: true, onClick: vi.fn() },
        { id: 'rename', label: '重命名', onClick: rename },
        { id: 'remove', label: '删除', danger: true, onClick: vi.fn() },
      ],
    })
    expect(menuTrigger().getAttribute('aria-expanded')).toBe('false')
    await click(menuTrigger())
    expect(menuTrigger().getAttribute('aria-expanded')).toBe('true')
    expect(menuItems()).toHaveLength(3)
    expect(document.activeElement?.getAttribute('role')).toBe('menuitem')
    expect(document.activeElement?.textContent).toBe('重命名')

    await click(document.activeElement as HTMLButtonElement)
    expect(rename).toHaveBeenCalledTimes(1)
    expect(menuTrigger().getAttribute('aria-expanded')).toBe('false')
    expect(menu()).toBeNull()
  })

  test('menu keyboard cycling covers enabled items only and Escape restores trigger focus', async () => {
    renderHeader()
    const triggerButton = menuTrigger()
    await act(async () => triggerButton.focus())
    await key(triggerButton, 'ArrowDown')
    expect(triggerButton.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement?.textContent).toBe('重命名')

    await key(document.activeElement!, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('删除')
    await key(document.activeElement!, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('重命名')
    await key(document.activeElement!, 'ArrowUp')
    expect(document.activeElement?.textContent).toBe('删除')
    await key(document.activeElement!, 'Home')
    expect(document.activeElement?.textContent).toBe('重命名')
    await key(document.activeElement!, 'End')
    expect(document.activeElement?.textContent).toBe('删除')

    await key(document.activeElement!, 'Escape')
    expect(menuTrigger().getAttribute('aria-expanded')).toBe('false')
    expect(menu()).toBeNull()
    expect(document.activeElement).toBe(triggerButton)
  })

  test('disabled items stay inert; outside pointerdown dismisses and refocuses the trigger', async () => {
    const locked = vi.fn()
    const add = vi.fn()
    renderHeader({
      actions: [{ id: 'add', label: '新增', icon: 'add', onClick: add }],
      overflowActions: [
        { id: 'locked', label: '停用位', disabled: true, onClick: locked },
        { id: 'rename', label: '重命名', onClick: vi.fn() },
        { id: 'remove', label: '删除', danger: true, onClick: vi.fn() },
      ],
    })
    await click(host.querySelector<HTMLButtonElement>('[aria-label="新增"]')!)
    expect(add).toHaveBeenCalledTimes(1)

    await click(menuTrigger())
    const disabledItem = menuItems().find((item) => item.textContent === '停用位')!
    expect(disabledItem.disabled).toBe(true)
    await click(disabledItem)
    expect(locked).not.toHaveBeenCalled()
    expect(menuTrigger().getAttribute('aria-expanded')).toBe('true')

    await act(async () => {
      host.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    })
    expect(menuTrigger().getAttribute('aria-expanded')).toBe('false')
    expect(menu()).toBeNull()
    expect(document.activeElement).toBe(menuTrigger())
    expect(locked).not.toHaveBeenCalled()
  })
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
        help={{ label: '地图列表', content: '这里只列出当前项目中的地图。' }}
        actions={[{ id: 'create', label: '新建地图', icon: 'add', onClick: create }]}
        overflowActions={[{ id: 'duplicate', label: '复制地图', onClick: duplicate }]}
      />,
    ),
  )
  expect(host.querySelector('.ds-list-header__title')?.textContent).toBe('地图')
  expect(host.querySelector('.ds-list-header__count')?.textContent).toContain('223 张')
  const help = host.querySelector('[aria-label="地图列表说明"]')!
  const descriptionId = help.getAttribute('aria-describedby')
  expect(descriptionId && document.getElementById(descriptionId)?.textContent).toBe(
    '这里只列出当前项目中的地图。',
  )
  const createButton = host.querySelector<HTMLButtonElement>('[aria-label="新建地图"]')!
  expect(createButton.classList).toContain('ds-list-header__action')
  expect(createButton.classList).toContain('ds-icon-button--compact')
  expect(createButton.querySelector('.ds-icon')).not.toBeNull()
  await click(createButton)
  expect(create).toHaveBeenCalledOnce()
  const overflowTrigger = host.querySelector<HTMLButtonElement>('[aria-label="更多操作"]')!
  await click(overflowTrigger)
  expect(overflowTrigger.getAttribute('aria-expanded')).toBe('true')
  const overflowMenu = document.querySelector<HTMLElement>('.ds-list-header__menu-popup')!
  expect(overflowMenu.closest('.ds-list-header__menu-layer')?.parentElement).toBe(document.body)
  expect(host.contains(overflowMenu)).toBe(false)
  await click(overflowMenu.querySelector<HTMLButtonElement>('button')!)
  expect(duplicate).toHaveBeenCalledOnce()
  expect(document.querySelector('.ds-list-header__menu-popup')).toBeNull()
  expect(overflowTrigger.getAttribute('aria-expanded')).toBe('false')
})
