// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  PanelResizeHandle,
  useStoredPanelBoolean,
  useStoredPanelNumber,
} from './PanelResizeHandle.js'
import { clampPanelSize } from './panel-layout.js'

const limits = { min: 192, max: 288 }
const fallbackSize = 240
const layouts = [
  { id: 'outliner', orientation: 'vertical', className: 'app-outliner-resizer', sign: 1 },
  { id: 'inspector', orientation: 'vertical', className: 'app-inspector-resizer', sign: -1 },
  { id: 'drawer', orientation: 'horizontal', className: 'script-height-resizer', sign: -1 },
] as const
type Layout = (typeof layouts)[number]

/** Use the current hosts' signed delta + shared clamp contract, with the real storage hooks. */
function PanelHarness(props: {
  layout: Layout
  storageKey: string
  disabled?: boolean
  onResize: (delta: number) => void
}) {
  const [size, setSize] = useStoredPanelNumber(
    props.storageKey,
    fallbackSize,
    props.layout.id === 'drawer' ? undefined : limits,
  )
  const [collapsed, setCollapsed] = useStoredPanelBoolean(`${props.storageKey}:collapsed`, false)
  return (
    <>
      <PanelResizeHandle
        orientation={props.layout.orientation}
        className={props.layout.className}
        value={clampPanelSize(size, limits.min, limits.max)}
        min={limits.min}
        max={limits.max}
        resizeLabel={props.layout.id}
        disabled={props.disabled}
        onReset={() => setSize(fallbackSize)}
        onResize={(delta) => {
          props.onResize(delta)
          setSize((current) =>
            clampPanelSize(current + props.layout.sign * delta, limits.min, limits.max),
          )
        }}
      />
      <output data-collapsed>{String(collapsed)}</output>
      <button type="button" onClick={() => setCollapsed((value) => !value)}>
        切换面板可见性
      </button>
    </>
  )
}

function pointerEvent(
  type: string,
  options: { id?: number; x?: number; y?: number; button?: number } = {},
): Event {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: options.button ?? 0,
    clientX: options.x ?? 100,
    clientY: options.y ?? 100,
  })
  Object.defineProperty(event, 'pointerId', { value: options.id ?? 7 })
  return event
}

describe('current panel resize interactions', () => {
  let host: HTMLDivElement
  let root: Root
  let captures: WeakMap<HTMLElement, Set<number>>
  let captureDescriptors: Array<[string, PropertyDescriptor | undefined]>
  let actDescriptor: PropertyDescriptor | undefined

  beforeEach(() => {
    actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    window.localStorage.clear()
    captures = new WeakMap()
    captureDescriptors = ['setPointerCapture', 'hasPointerCapture', 'releasePointerCapture'].map(
      (name) => [name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)],
    )
    Object.defineProperties(HTMLElement.prototype, {
      setPointerCapture: {
        configurable: true,
        value(this: HTMLElement, id: number) {
          const owned = captures.get(this) ?? new Set<number>()
          owned.add(id)
          captures.set(this, owned)
        },
      },
      hasPointerCapture: {
        configurable: true,
        value(this: HTMLElement, id: number) {
          return captures.get(this)?.has(id) ?? false
        },
      },
      releasePointerCapture: {
        configurable: true,
        value(this: HTMLElement, id: number) {
          captures.get(this)?.delete(id)
        },
      },
    })
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    for (const [name, descriptor] of captureDescriptors) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor)
      else Reflect.deleteProperty(HTMLElement.prototype, name)
    }
    vi.restoreAllMocks()
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor)
    else Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
    document.documentElement.removeAttribute('data-panel-resize')
  })

  const size = (separator: HTMLElement) => Number(separator.getAttribute('aria-valuenow'))
  const key = async (separator: HTMLElement, value: string) => {
    const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })
    await act(async () => separator.dispatchEvent(event))
    return event
  }

  test.each(
    layouts,
  )('$id keyboard resizing uses its host direction, clamps and resets', async (layout) => {
    const resize = vi.fn()
    await act(async () =>
      root.render(<PanelHarness layout={layout} storageKey={layout.id} onResize={resize} />),
    )
    const separator = host.querySelector<HTMLElement>('hr')!
    expect(separator.getAttribute('aria-orientation')).toBe(layout.orientation)
    expect(separator.getAttribute('aria-valuemin')).toBe(String(limits.min))
    expect(separator.getAttribute('aria-valuemax')).toBe(String(limits.max))
    expect(separator.parentElement?.classList.contains(layout.className)).toBe(true)
    const negative = layout.orientation === 'vertical' ? 'ArrowLeft' : 'ArrowUp'
    const positive = layout.orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown'
    expect((await key(separator, negative)).defaultPrevented).toBe(true)
    expect(size(separator)).toBe(fallbackSize - layout.sign * 16)
    expect(resize).toHaveBeenLastCalledWith(-16)
    await key(separator, positive)
    expect(size(separator)).toBe(fallbackSize)
    expect(resize).toHaveBeenLastCalledWith(16)
    for (let index = 0; index < 6; index += 1) await key(separator, positive)
    expect(size(separator)).toBe(layout.sign === 1 ? limits.max : limits.min)
    expect(window.localStorage.getItem(layout.id)).toBe(String(size(separator)))
    await key(separator, 'Home')
    expect(size(separator)).toBe(fallbackSize)
    for (let index = 0; index < 6; index += 1) await key(separator, negative)
    expect(size(separator)).toBe(layout.sign === 1 ? limits.min : limits.max)
    await act(async () => separator.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
    expect(size(separator)).toBe(fallbackSize)
    resize.mockClear()
    for (const ignored of [
      layout.orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft',
      'Enter',
      ' ',
    ])
      expect((await key(separator, ignored)).defaultPrevented).toBe(false)
    expect(resize).not.toHaveBeenCalled()
    expect(host.querySelector('.panel-resizer-toggle')).toBeNull()
  })

  test.each([
    'pointerup',
    'pointercancel',
    'lostpointercapture',
  ] as const)('%s ends a captured drag, clears the global marker and prevents further resizing', async (ending) => {
    for (const layout of [layouts[0], layouts[2]]) {
      const resize = vi.fn()
      await act(async () =>
        root.render(
          <PanelHarness key={layout.id} layout={layout} storageKey={layout.id} onResize={resize} />,
        ),
      )
      const separator = host.querySelector<HTMLElement>('hr')!
      await act(async () => separator.dispatchEvent(pointerEvent('pointerdown', { button: 2 })))
      expect(separator.hasPointerCapture(7)).toBe(false)
      expect(document.documentElement.hasAttribute('data-panel-resize')).toBe(false)
      await act(async () => separator.dispatchEvent(pointerEvent('pointerdown')))
      expect(separator.hasPointerCapture(7)).toBe(true)
      expect(document.documentElement.getAttribute('data-panel-resize')).toBe(layout.orientation)
      await act(async () => separator.dispatchEvent(pointerEvent('pointermove')))
      await act(async () =>
        separator.dispatchEvent(pointerEvent('pointermove', { id: 8, x: 125, y: 125 })),
      )
      await act(async () => separator.dispatchEvent(pointerEvent('pointerup', { id: 8 })))
      expect(resize).not.toHaveBeenCalled()
      expect(separator.hasPointerCapture(7)).toBe(true)
      await act(async () =>
        separator.dispatchEvent(pointerEvent('pointermove', { x: 112, y: 125 })),
      )
      expect(resize).toHaveBeenLastCalledWith(layout.orientation === 'vertical' ? 12 : 25)
      await act(async () =>
        separator.dispatchEvent(pointerEvent('pointermove', { x: 119, y: 130 })),
      )
      expect(resize).toHaveBeenLastCalledWith(layout.orientation === 'vertical' ? 7 : 5)
      expect(size(separator)).toBe(
        fallbackSize + layout.sign * (layout.orientation === 'vertical' ? 19 : 30),
      )
      if (ending === 'lostpointercapture') separator.releasePointerCapture(7)
      await act(async () => separator.dispatchEvent(pointerEvent(ending)))
      expect(separator.hasPointerCapture(7)).toBe(false)
      expect.soft(document.documentElement.hasAttribute('data-panel-resize')).toBe(false)
      resize.mockClear()
      await act(async () =>
        separator.dispatchEvent(pointerEvent('pointermove', { x: 180, y: 190 })),
      )
      expect.soft(resize).not.toHaveBeenCalled()
    }
  })

  test('disabled handles reject resize events and unmount releases the global drag state', async () => {
    const resize = vi.fn()
    await act(async () =>
      root.render(
        <PanelHarness layout={layouts[1]} storageKey="disabled" disabled onResize={resize} />,
      ),
    )
    let separator = host.querySelector<HTMLElement>('hr')!
    expect((await key(separator, 'ArrowLeft')).defaultPrevented).toBe(false)
    await act(async () => separator.dispatchEvent(pointerEvent('pointerdown')))
    await act(async () => separator.dispatchEvent(pointerEvent('pointermove', { x: 130 })))
    expect(resize).not.toHaveBeenCalled()
    expect(separator.hasPointerCapture(7)).toBe(false)
    expect(size(separator)).toBe(fallbackSize)
    await act(async () =>
      root.render(<PanelHarness layout={layouts[1]} storageKey="disabled" onResize={resize} />),
    )
    separator = host.querySelector<HTMLElement>('hr')!
    await act(async () => separator.dispatchEvent(pointerEvent('pointerdown')))
    expect(document.documentElement.getAttribute('data-panel-resize')).toBe('vertical')
    await act(async () => root.render(null))
    expect(document.documentElement.hasAttribute('data-panel-resize')).toBe(false)
  })

  test('stored size and visibility recover, normalize bad values and persist later edits', async () => {
    const cases = [
      { raw: '219.6', flag: 'true', expected: 220, collapsed: true },
      { raw: '999', flag: 'false', expected: limits.max, collapsed: false },
      { raw: 'not-a-number', flag: 'broken', expected: fallbackSize, collapsed: false },
    ]
    for (const entry of cases) {
      window.localStorage.setItem('restore', entry.raw)
      window.localStorage.setItem('restore:collapsed', entry.flag)
      await act(async () =>
        root.render(
          <PanelHarness
            key={entry.raw}
            layout={layouts[0]}
            storageKey="restore"
            onResize={() => {}}
          />,
        ),
      )
      const separator = host.querySelector<HTMLElement>('hr')!
      expect(size(separator)).toBe(entry.expected)
      expect(host.querySelector('[data-collapsed]')?.textContent).toBe(String(entry.collapsed))
      expect(window.localStorage.getItem('restore')).toBe(String(entry.expected))
      await key(separator, 'Home')
      await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
      expect(window.localStorage.getItem('restore')).toBe(String(fallbackSize))
      expect(window.localStorage.getItem('restore:collapsed')).toBe(String(!entry.collapsed))
      await act(async () => root.render(null))
      await act(async () =>
        root.render(<PanelHarness layout={layouts[0]} storageKey="restore" onResize={() => {}} />),
      )
      expect(size(host.querySelector<HTMLElement>('hr')!)).toBe(fallbackSize)
      expect(host.querySelector('[data-collapsed]')?.textContent).toBe(String(!entry.collapsed))
    }
  })

  test('privacy-mode storage failures preserve usable session resize and visibility controls', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError')
    })
    const resize = vi.fn()
    await act(async () =>
      root.render(<PanelHarness layout={layouts[0]} storageKey="private" onResize={resize} />),
    )
    const separator = host.querySelector<HTMLElement>('hr')!
    expect(size(separator)).toBe(fallbackSize)
    await key(separator, 'ArrowRight')
    expect(size(separator)).toBe(fallbackSize + 16)
    await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
    expect(host.querySelector('[data-collapsed]')?.textContent).toBe('true')
    expect(resize).toHaveBeenCalledOnce()
  })
})
