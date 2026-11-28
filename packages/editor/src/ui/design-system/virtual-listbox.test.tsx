// @vitest-environment jsdom
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { installReactActEnvironment } from '../../__tests__/react-io-wait.js'
import { DsVirtualListbox } from './index.js'

let host: HTMLDivElement
let root: Root
let restoreAct: () => void

beforeEach(() => {
  restoreAct = installReactActEnvironment()
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
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
  restoreAct()
})

describe('DsVirtualListbox semantic contract', () => {
  test('keeps navigation on an external search focus owner without copying the state machine', async () => {
    const onSelect = vi.fn<(item: number) => void>()
    function Harness() {
      const searchRef = useRef<HTMLInputElement>(null)
      return (
        <>
          <input ref={searchRef} type="search" aria-label="搜索候选" />
          <DsVirtualListbox
            label="候选道具"
            items={[0, 1, 2]}
            itemHeight={40}
            height={120}
            keyboardOwnerRef={searchRef}
            getKey={(item) => item}
            getDisabled={(item) => item === 1}
            selectedKey={null}
            onSelect={onSelect}
            renderItem={(item) => <>项目 {item}</>}
          />
        </>
      )
    }
    await act(async () => root.render(<Harness />))
    const search = host.querySelector<HTMLInputElement>('input')!
    const listbox = host.querySelector<HTMLElement>('[role="listbox"]')!
    search.focus()
    await act(async () =>
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
    )
    expect(document.activeElement).toBe(search)
    expect(
      document.getElementById(search.getAttribute('aria-activedescendant')!)?.textContent,
    ).toContain('项目 2')
    expect(listbox.tabIndex).toBe(-1)
    expect(onSelect).not.toHaveBeenCalled()
    await act(async () =>
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    expect(onSelect).toHaveBeenCalledWith(2, 2)
  })

  test('does not steal editable Space, Home or End keys from an external search owner', async () => {
    const onSelect = vi.fn<(item: number) => void>()
    function Harness() {
      const searchRef = useRef<HTMLInputElement>(null)
      return (
        <>
          <input ref={searchRef} type="search" aria-label="搜索候选" />
          <DsVirtualListbox
            label="候选道具"
            items={[0, 1, 2]}
            itemHeight={40}
            height={120}
            keyboardOwnerRef={searchRef}
            getKey={(item) => item}
            selectedKey={null}
            onSelect={onSelect}
            renderItem={(item) => <>项目 {item}</>}
          />
        </>
      )
    }
    await act(async () => root.render(<Harness />))
    const search = host.querySelector<HTMLInputElement>('input')!
    for (const key of [' ', 'Home', 'End']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      await act(async () => search.dispatchEvent(event))
      expect(event.defaultPrevented, key).toBe(false)
    }
    expect(onSelect).not.toHaveBeenCalled()
  })

  test('owns listbox/option semantics, skips disabled rows and only selects on Enter', async () => {
    const onSelect = vi.fn<(item: number) => void>()
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

    const listbox = host.querySelector<HTMLElement>('[role="listbox"]')!
    listbox.focus()
    await act(async () =>
      listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
    )
    const activeId = listbox.getAttribute('aria-activedescendant')!
    expect(document.getElementById(activeId)?.textContent).toContain('项目 2')
    expect(onSelect).not.toHaveBeenCalled()
    await act(async () =>
      listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith(2, 2)
    expect(host.querySelector('[role="option"][aria-disabled="true"]')?.textContent).toContain(
      '项目 1',
    )
  })

  test('keeps the active descendant mounted after virtual scrolling', async () => {
    await act(async () =>
      root.render(
        <DsVirtualListbox
          label="大型候选"
          items={Array.from({ length: 234 }, (_, index) => index)}
          itemHeight={40}
          height={320}
          virtualizeAbove={80}
          getKey={(item) => item}
          selectedKey={null}
          onSelect={() => undefined}
          renderItem={(item) => <>项目 {item}</>}
        />,
      ),
    )
    const listbox = host.querySelector<HTMLElement>('[role="listbox"]')!
    await act(async () => listbox.scrollTo({ top: 200 * 40 }))
    const activeId = listbox.getAttribute('aria-activedescendant')!
    expect(document.getElementById(activeId)).not.toBeNull()
    expect(host.querySelectorAll('[role="option"]').length).toBeLessThanOrEqual(16)
  })

  test('keeps a far keyboard target active through programmatic scrolling and selects it', async () => {
    const onSelect = vi.fn<(item: number) => void>()
    await act(async () =>
      root.render(
        <DsVirtualListbox
          label="大型候选"
          items={Array.from({ length: 234 }, (_, index) => index)}
          itemHeight={40}
          height={320}
          virtualizeAbove={80}
          getKey={(item) => item}
          selectedKey={null}
          onSelect={onSelect}
          renderItem={(item) => <>项目 {item}</>}
        />,
      ),
    )
    const listbox = host.querySelector<HTMLElement>('[role="listbox"]')!
    listbox.focus()
    await act(async () =>
      listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })),
    )
    const activeId = listbox.getAttribute('aria-activedescendant')!
    expect(document.getElementById(activeId)?.textContent).toContain('项目 233')
    await act(async () =>
      listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    expect(onSelect).toHaveBeenCalledWith(233, 233)
  })

  test('keeps the same active key mounted when live candidates move it outside the window', async () => {
    const view = (items: readonly number[]) => (
      <DsVirtualListbox
        label="重排候选"
        items={items}
        itemHeight={40}
        height={320}
        virtualizeAbove={80}
        getKey={(item) => item}
        selectedKey={null}
        onSelect={() => undefined}
        renderItem={(item) => <>项目 {item}</>}
      />
    )
    const original = Array.from({ length: 234 }, (_, index) => index)
    await act(async () => root.render(view(original)))
    const listbox = host.querySelector<HTMLElement>('[role="listbox"]')!
    listbox.focus()
    await act(async () =>
      listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
    )
    expect(
      document.getElementById(listbox.getAttribute('aria-activedescendant')!)?.textContent,
    ).toContain('项目 1')

    const moved = [original[0]!, ...original.slice(2), original[1]!]
    await act(async () => root.render(view(moved)))
    const activeId = listbox.getAttribute('aria-activedescendant')!
    expect(document.getElementById(activeId)?.textContent).toContain('项目 1')
    expect(listbox.scrollTop).toBeGreaterThan(0)
  })

  test('moves active focus independently until the caller updates the controlled selection', async () => {
    const onSelect = vi.fn()
    const view = (selectedKey: number) => (
      <DsVirtualListbox
        label="选择动作"
        items={[10, 20, 30]}
        itemHeight={40}
        height={120}
        getKey={(item) => item}
        selectedKey={selectedKey}
        onSelect={onSelect}
        renderItem={(item) => <>动作 {item}</>}
      />
    )
    await act(async () => root.render(view(10)))
    const listbox = host.querySelector<HTMLElement>('[role="listbox"]')!
    const activeLabel = () =>
      document.getElementById(listbox.getAttribute('aria-activedescendant') ?? '')?.textContent
    listbox.focus()
    expect(activeLabel()).toBe('动作 10')

    await act(async () =>
      listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
    )
    expect(activeLabel()).toBe('动作 20')
    expect(listbox.querySelector('[aria-selected="true"]')?.textContent).toBe('动作 10')
    await act(async () => root.render(view(10)))
    expect(activeLabel()).toBe('动作 20')

    await act(async () => root.render(view(30)))
    expect(activeLabel()).toBe('动作 30')
    expect(listbox.querySelector('[aria-selected="true"]')?.textContent).toBe('动作 30')
    expect(document.activeElement).toBe(listbox)
    expect(onSelect).not.toHaveBeenCalled()
  })

  test('removes an invalid active descendant when a manually scrolled viewport is all disabled', async () => {
    await act(async () =>
      root.render(
        <DsVirtualListbox
          label="带禁用区的大型候选"
          items={Array.from({ length: 234 }, (_, index) => index)}
          itemHeight={40}
          height={320}
          virtualizeAbove={80}
          getKey={(item) => item}
          getDisabled={(item) => item >= 100 && item <= 108}
          selectedKey={null}
          onSelect={() => undefined}
          renderItem={(item) => <>项目 {item}</>}
        />,
      ),
    )
    const listbox = host.querySelector<HTMLElement>('[role="listbox"]')!
    await act(async () => listbox.scrollTo({ top: 100 * 40 }))
    expect(host.querySelectorAll('[role="option"][aria-disabled="true"]').length).toBeGreaterThan(0)
    expect(listbox.getAttribute('aria-activedescendant')).toBeNull()
  })
})

describe('listbox pointer, threshold and IME boundaries', () => {
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
