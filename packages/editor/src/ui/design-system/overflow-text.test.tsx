// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DsOverflowText } from './controls.js'

interface TextMetrics {
  clientWidth: number
  scrollWidth: number
}

class TestResizeObserver {
  static instances: TestResizeObserver[] = []

  readonly observed = new Set<Element>()
  disconnected = false

  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this)
  }

  observe(target: Element): void {
    this.observed.add(target)
  }

  unobserve(target: Element): void {
    this.observed.delete(target)
  }

  disconnect(): void {
    this.disconnected = true
    this.observed.clear()
  }

  emit(): void {
    this.callback([], this as unknown as ResizeObserver)
  }
}

let host: HTMLDivElement
let root: Root
let defaultMetrics: TextMetrics
let metrics: WeakMap<Element, TextMetrics>
let clientWidthReads: number
let scrollWidthReads: number
let documentFontsDescriptor: PropertyDescriptor | undefined

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  defaultMetrics = { clientWidth: 100, scrollWidth: 100 }
  metrics = new WeakMap()
  clientWidthReads = 0
  scrollWidthReads = 0
  documentFontsDescriptor = Object.getOwnPropertyDescriptor(document, 'fonts')
  TestResizeObserver.instances = []
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
    clientWidthReads += 1
    return (metrics.get(this) ?? defaultMetrics).clientWidth
  })
  vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
    scrollWidthReads += 1
    return (metrics.get(this) ?? defaultMetrics).scrollWidth
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  if (documentFontsDescriptor) Object.defineProperty(document, 'fonts', documentFontsDescriptor)
  else Reflect.deleteProperty(document, 'fonts')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function renderOverflowText(value = 'assets/migrated/sprites/001.rle'): Promise<HTMLElement> {
  await act(async () =>
    root.render(
      <DsOverflowText as="code" className="ds-inspector-readonly" translate="no">
        {value}
      </DsOverflowText>,
    ),
  )
  return host.querySelector<HTMLElement>('.ds-overflow-text')!
}

async function emitResize(observer = TestResizeObserver.instances[0]!): Promise<void> {
  await act(async () => observer.emit())
}

describe('DsOverflowText', () => {
  test('uses a zero-width guard and one-pixel tolerance before adding a Tab stop', async () => {
    const source = await renderOverflowText()
    const observer = TestResizeObserver.instances[0]!
    expect(observer.observed.has(source)).toBe(true)
    expect(source.getAttribute('tabindex')).toBeNull()

    metrics.set(source, { clientWidth: 100, scrollWidth: 101 })
    await emitResize(observer)
    expect(source.getAttribute('tabindex')).toBeNull()

    metrics.set(source, { clientWidth: 100, scrollWidth: 102 })
    await emitResize(observer)
    expect(source.getAttribute('tabindex')).toBe('0')
    expect(source.getAttribute('aria-describedby')).toBeTruthy()

    metrics.set(source, { clientWidth: 0, scrollWidth: 999 })
    await emitResize(observer)
    expect(source.getAttribute('tabindex')).toBeNull()
    expect(source.getAttribute('aria-describedby')).toBeNull()
  })

  test('remeasures changed text without rebuilding its observer and disconnects on unmount', async () => {
    const source = await renderOverflowText('short')
    const observer = TestResizeObserver.instances[0]!
    metrics.set(source, { clientWidth: 100, scrollWidth: 140 })

    await act(async () =>
      root.render(
        <DsOverflowText as="code" className="ds-inspector-readonly">
          a-much-longer-value
        </DsOverflowText>,
      ),
    )

    expect(TestResizeObserver.instances).toHaveLength(1)
    expect(source.getAttribute('tabindex')).toBe('0')
    await act(async () => root.render(null))
    expect(observer.disconnected).toBe(true)
  })

  test('reveals the same selectable DOM value on hover or focus and Escape keeps focus', async () => {
    const value = 'assets/migrated/sprites/001.rle'
    defaultMetrics = { clientWidth: 100, scrollWidth: 180 }
    const source = await renderOverflowText(value)

    expect(source.textContent).toBe(value)
    expect(source.classList).toContain('ds-overflow-text')
    await act(async () => source.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
    const hoverBubble = document.querySelector<HTMLElement>('.ds-overflow-text__bubble')!
    expect(hoverBubble.textContent).toBe(value)
    expect(hoverBubble.parentElement).toBe(document.body)

    await act(async () => source.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })))
    expect(document.querySelector('.ds-overflow-text__bubble')).toBeNull()
    await act(async () => source.focus())
    expect(document.querySelector('.ds-overflow-text__bubble')?.textContent).toBe(value)
    await act(async () =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    )
    expect(document.querySelector('.ds-overflow-text__bubble')).toBeNull()
    expect(document.activeElement).toBe(source)

    for (const event of [
      new Event('pointerdown', { bubbles: true, cancelable: true }),
      new Event('copy', { bubbles: true, cancelable: true }),
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    ]) {
      await act(async () => source.dispatchEvent(event))
      expect(event.defaultPrevented).toBe(false)
    }
  })

  test('portals a clipped value tooltip into its nearest open dialog', async () => {
    defaultMetrics = { clientWidth: 60, scrollWidth: 160 }
    await act(async () =>
      root.render(
        <dialog open>
          <DsOverflowText>inside-dialog-with-a-long-value</DsOverflowText>
        </dialog>,
      ),
    )
    const source = host.querySelector<HTMLElement>('.ds-overflow-text')!
    await act(async () => source.focus())
    const bubble = host.querySelector<HTMLElement>('.ds-overflow-text__bubble')!
    expect(bubble.parentElement).toBe(source.closest('dialog'))
  })

  test('remeasures after fonts change and removes the font listener on unmount', async () => {
    let resolveFonts: (() => void) | undefined
    const ready = new Promise<void>((resolve) => {
      resolveFonts = resolve
    })
    const listeners = new Set<EventListener>()
    const fonts = {
      ready,
      addEventListener: vi.fn((_type: string, listener: EventListener) => listeners.add(listener)),
      removeEventListener: vi.fn((_type: string, listener: EventListener) =>
        listeners.delete(listener),
      ),
    }
    Object.defineProperty(document, 'fonts', { configurable: true, value: fonts })
    const source = await renderOverflowText('font-sensitive-value')
    metrics.set(source, { clientWidth: 100, scrollWidth: 150 })

    await act(async () => {
      listeners.forEach((listener) => {
        listener(new Event('loadingdone'))
      })
    })
    expect(source.getAttribute('tabindex')).toBe('0')
    metrics.set(source, { clientWidth: 100, scrollWidth: 100 })
    await act(async () => {
      resolveFonts?.()
      await ready
    })
    expect(source.getAttribute('tabindex')).toBeNull()

    await act(async () => root.render(null))
    expect(fonts.removeEventListener).toHaveBeenCalledWith('loadingdone', expect.any(Function))
    expect(listeners).toHaveLength(0)
  })

  test('does not read layout while rendering on the server', () => {
    clientWidthReads = 0
    scrollWidthReads = 0
    const html = renderToString(<DsOverflowText>server-value</DsOverflowText>)
    expect(html).toContain('server-value')
    expect(clientWidthReads).toBe(0)
    expect(scrollWidthReads).toBe(0)
  })
})
