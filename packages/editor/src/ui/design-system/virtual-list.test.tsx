// @vitest-environment jsdom
import { act, useRef } from 'react'
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

function list(
  items: readonly number[],
  selectedKey: number,
  onSelect: (item: number) => void,
  selectionFollowsFocus = true,
) {
  return (
    <DsVirtualList
      label="测试目录"
      items={items}
      itemHeight={20}
      height={60}
      overscan={2}
      getKey={(item) => item}
      selectedKey={selectedKey}
      selectionFollowsFocus={selectionFollowsFocus}
      onSelect={onSelect}
      renderItem={(item, _index, control) => (
        <button type="button" tabIndex={control.tabIndex} onFocus={control.onFocus}>
          项目 {item}
        </button>
      )}
    />
  )
}

describe('DsVirtualList selection contract', () => {
  test('marks fill mode so the shared CSS owns the only scroll surface', async () => {
    await act(async () =>
      root.render(
        <DsVirtualList
          label="填充目录"
          items={[0]}
          itemHeight={68}
          height={720}
          fill
          getKey={(item) => item}
          renderItem={(item) => <button type="button">项目 {item}</button>}
        />,
      ),
    )
    expect(host.querySelector('.ds-virtual-list')?.getAttribute('data-fill')).toBe('true')
  })

  test('virtualizes rows and supports roving Arrow/Home/End selection', async () => {
    const onSelect = vi.fn<(item: number) => void>()
    await act(async () =>
      root.render(
        list(
          Array.from({ length: 100 }, (_, index) => index),
          0,
          onSelect,
        ),
      ),
    )

    expect(host.querySelectorAll('.ds-virtual-list__item')).toHaveLength(7)
    const first = host.querySelector<HTMLButtonElement>('[data-virtual-index="0"] button')!
    await act(async () => {
      first.focus()
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    expect(onSelect).toHaveBeenLastCalledWith(1, 1)
    expect(document.activeElement?.textContent).toContain('项目 1')

    await act(async () =>
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
      ),
    )
    expect(onSelect).toHaveBeenLastCalledWith(99, 99)
    expect(host.querySelector('[data-virtual-index="99"]')?.textContent).toContain('项目 99')
  })

  test('clamps stale scroll after filtering to a shorter result set', async () => {
    const onSelect = vi.fn<(item: number) => void>()
    const items = Array.from({ length: 100 }, (_, index) => index)
    await act(async () => root.render(list(items, 99, onSelect)))
    const viewport = host.querySelector<HTMLElement>('.ds-virtual-list')!
    await act(async () => viewport.scrollTo({ top: 1900 }))
    expect(viewport.scrollTop).toBe(1900)

    await act(async () => root.render(list([0], 0, onSelect)))
    expect(viewport.scrollTop).toBe(0)
    expect(host.querySelector('[data-virtual-index="0"]')?.textContent).toContain('项目 0')
  })

  test('keeps roving focus independent until Enter selects in explicit-selection mode', async () => {
    const onSelect = vi.fn<(item: number) => void>()
    await act(async () => root.render(list([0, 1, 2, 3], 0, onSelect, false)))
    const first = host.querySelector<HTMLButtonElement>('[data-virtual-index="0"] button')!
    await act(async () => {
      first.focus()
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    await act(async () =>
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      ),
    )
    expect(onSelect).not.toHaveBeenCalled()
    expect(document.activeElement?.textContent).toContain('项目 2')

    await act(async () =>
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      ),
    )
    expect(onSelect).toHaveBeenLastCalledWith(2, 2)
  })
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
