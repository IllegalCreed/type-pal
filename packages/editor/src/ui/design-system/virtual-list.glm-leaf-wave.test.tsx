// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DsVirtualList, DsVirtualListbox } from './virtual-list.js'

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
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo
})

function virtualList(onSelect: (item: number, index: number) => void, selectedKey?: number) {
  return (
    <DsVirtualList
      label="测试目录"
      items={Array.from({ length: 100 }, (_, index) => index)}
      itemHeight={20}
      height={60}
      overscan={2}
      getKey={(item) => item}
      selectedKey={selectedKey}
      selectionFollowsFocus
      onSelect={onSelect}
      renderItem={(item, _index, control) => (
        <button type="button" tabIndex={control.tabIndex} onFocus={control.onFocus}>
          项目 {item}
        </button>
      )}
    />
  )
}

describe('DsVirtualList 剩余合同', () => {
  test('scrolls a far selected key into view on mount', async () => {
    await act(async () => root.render(virtualList(() => undefined, 99)))
    const viewport = host.querySelector<HTMLElement>('.ds-virtual-list')!
    expect(viewport.scrollTop).toBe(100 * 20 - 60)
    expect(host.querySelector('[data-virtual-index="99"]')?.textContent).toContain('项目 99')
  })

  test('clamps ArrowUp at the first row and Home jumps to index zero', async () => {
    const onSelect = vi.fn<(item: number, index: number) => void>()
    await act(async () => root.render(virtualList(onSelect, 0)))
    const viewport = host.querySelector<HTMLElement>('.ds-virtual-list')!
    const first = host.querySelector<HTMLButtonElement>('[data-virtual-index="0"] button')!
    await act(async () => {
      first.focus()
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    })
    expect(onSelect).toHaveBeenLastCalledWith(0, 0)
    expect(viewport.scrollTop).toBe(0)

    await act(async () =>
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
      ),
    )
    expect(onSelect).toHaveBeenLastCalledWith(0, 0)
    expect(document.activeElement?.textContent).toContain('项目 0')
  })

  test('hover moves the active row without selecting', async () => {
    const onSelect = vi.fn<(item: number, index: number) => void>()
    await act(async () => root.render(virtualList(onSelect, 0)))
    const row = host.querySelector<HTMLElement>('[data-virtual-index="3"]')!
    await act(async () => row.dispatchEvent(new Event('pointermove', { bubbles: true })))
    expect(host.querySelector('[data-virtual-index="3"]')?.getAttribute('data-active')).toBe('true')
    expect(host.querySelector('[data-virtual-index="0"]')?.hasAttribute('data-active')).toBe(false)
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('DsVirtualListbox 剩余合同', () => {
  test('click selects an enabled row, hover activates it and disabled rows stay inert', async () => {
    const onSelect = vi.fn<(item: number, index: number) => void>()
    await act(async () =>
      root.render(
        <DsVirtualListbox
          label="候选道具"
          items={[0, 1, 2]}
          itemHeight={40}
          height={120}
          getKey={(item) => item}
          getDisabled={(item) => item === 1}
          selectedKey={null}
          onSelect={onSelect}
          renderItem={(item) => <>项目 {item}</>}
        />,
      ),
    )
    const enabled = host.querySelector<HTMLElement>('[data-virtual-index="2"]')!
    await act(async () => enabled.dispatchEvent(new Event('pointermove', { bubbles: true })))
    expect(enabled.getAttribute('data-active')).toBe('true')
    await act(async () => enabled.click())
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(2, 2)

    const disabled = host.querySelector<HTMLElement>('[data-virtual-index="1"]')!
    expect(disabled.getAttribute('aria-disabled')).toBe('true')
    await act(async () => disabled.click())
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  test('keeps short collections fully mounted below the virtualize threshold', async () => {
    await act(async () =>
      root.render(
        <DsVirtualListbox
          label="候选道具"
          items={[0, 1, 2]}
          itemHeight={40}
          height={120}
          virtualizeAbove={80}
          getKey={(item) => item}
          selectedKey={null}
          onSelect={() => undefined}
          renderItem={(item) => <>项目 {item}</>}
        />,
      ),
    )
    const listboxRoot = host.querySelector('[role="listbox"]')!
    expect(listboxRoot.getAttribute('data-virtual')).toBeNull()
    expect(host.querySelectorAll('[role="option"]')).toHaveLength(3)
    expect(listboxRoot.querySelector('.ds-virtual-list__spacer')?.getAttribute('style')).toContain(
      'height: 120px',
    )
  })

  test('ignores IME composition keydown before any navigation', async () => {
    const onSelect = vi.fn<(item: number, index: number) => void>()
    await act(async () =>
      root.render(
        <DsVirtualListbox
          label="候选道具"
          items={[0, 1, 2]}
          itemHeight={40}
          height={120}
          getKey={(item) => item}
          selectedKey={0}
          onSelect={onSelect}
          renderItem={(item) => <>项目 {item}</>}
        />,
      ),
    )
    const listboxRoot = host.querySelector<HTMLElement>('[role="listbox"]')!
    listboxRoot.focus()
    const composing = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    })
    Object.defineProperty(composing, 'keyCode', { value: 229 })
    await act(async () => listboxRoot.dispatchEvent(composing))
    expect(composing.defaultPrevented).toBe(false)
    expect(
      host.querySelector('[role="option"][data-active="true"]')?.getAttribute('aria-posinset'),
    ).toBe('1')
    expect(onSelect).not.toHaveBeenCalled()
  })
})
