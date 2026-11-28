// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { installReactActEnvironment } from '../../__tests__/react-io-wait.js'
import { DsVirtualList } from './index.js'

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

function list(
  items: readonly number[],
  selectedKey: number,
  onSelect: (item: number, index: number) => void,
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
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    const press = async (target: Element, key: string) => {
      await act(async () =>
        target.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        ),
      )
      const scheduledFrame = frames.shift()
      if (scheduledFrame) await act(async () => scheduledFrame(0))
    }
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
    await act(async () => first.focus())
    await press(first, 'ArrowDown')
    expect(onSelect).toHaveBeenLastCalledWith(1, 1)
    expect(document.activeElement?.textContent).toContain('项目 1')

    await press(document.activeElement!, 'End')
    expect(onSelect).toHaveBeenLastCalledWith(99, 99)
    expect(host.querySelector('[data-virtual-index="99"]')?.textContent).toContain('项目 99')
    expect(document.activeElement?.textContent).toBe('项目 99')
    await press(document.activeElement!, 'Home')
    expect(onSelect).toHaveBeenLastCalledWith(0, 0)
    expect(document.activeElement?.textContent).toBe('项目 0')
  })

  test('clamps stale scroll after filtering to a shorter result set', async () => {
    const onSelect = vi.fn<(item: number) => void>()
    const items = Array.from({ length: 100 }, (_, index) => index)
    await act(async () => root.render(list(items, 99, onSelect)))
    const viewport = host.querySelector<HTMLElement>('.ds-virtual-list')!
    expect(viewport.scrollTop).toBe(1940)
    await act(async () => viewport.scrollTo({ top: 1900 }))
    expect(viewport.scrollTop).toBe(1900)
    expect(
      host.querySelector<HTMLButtonElement>('[data-virtual-index="99"] button')?.tabIndex,
    ).toBe(0)

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

  test('clamps ArrowUp at the first row', async () => {
    const onSelect = vi.fn<(item: number, index: number) => void>()
    await act(async () =>
      root.render(
        list(
          Array.from({ length: 100 }, (_, index) => index),
          0,
          onSelect,
        ),
      ),
    )
    const viewport = host.querySelector<HTMLElement>('.ds-virtual-list')!
    const first = host.querySelector<HTMLButtonElement>('[data-virtual-index="0"] button')!
    await act(async () => {
      first.focus()
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    })
    expect(onSelect).toHaveBeenLastCalledWith(0, 0)
    expect(viewport.scrollTop).toBe(0)

    expect(document.activeElement?.textContent).toBe('项目 0')
  })

  test('hover moves the active row without selecting', async () => {
    const onSelect = vi.fn<(item: number, index: number) => void>()
    await act(async () =>
      root.render(
        list(
          Array.from({ length: 100 }, (_, index) => index),
          0,
          onSelect,
        ),
      ),
    )
    const row = host.querySelector<HTMLElement>('[data-virtual-index="3"]')!
    await act(async () => row.dispatchEvent(new Event('pointermove', { bubbles: true })))
    expect(host.querySelector('[data-virtual-index="3"]')?.getAttribute('data-active')).toBe('true')
    expect(host.querySelector('[data-virtual-index="0"]')?.hasAttribute('data-active')).toBe(false)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
