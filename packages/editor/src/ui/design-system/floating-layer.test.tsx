// @vitest-environment jsdom
import { act, type ReactNode, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DsFloatingLayer } from './floating-layer.js'

let host: HTMLDivElement
let root: Root

function Harness(props: {
  children?: ReactNode
  maxHeight?: number
  width?: 'anchor' | 'content'
  align?: 'start' | 'center' | 'end'
  dismissOnPointerDown?: boolean
  onDismiss?: () => void
}) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  return (
    <>
      <button ref={anchorRef} type="button" aria-label="锚点">
        锚点
      </button>
      <DsFloatingLayer
        open
        anchorRef={anchorRef}
        layerRef={layerRef}
        className="test-floating-layer"
        maxHeight={props.maxHeight}
        width={props.width}
        align={props.align}
        dismissOnPointerDown={props.dismissOnPointerDown}
        onDismiss={props.onDismiss ?? (() => undefined)}
      >
        {props.children ?? <button type="button">浮层内部</button>}
      </DsFloatingLayer>
    </>
  )
}

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

describe('DsFloatingLayer', () => {
  test('portals into the nearest native dialog so the layer stays in its top-layer context', async () => {
    await act(async () =>
      root.render(
        <dialog open aria-label="测试弹窗">
          <Harness />
        </dialog>,
      ),
    )

    const dialog = host.querySelector<HTMLDialogElement>('dialog')!
    const layer = dialog.querySelector<HTMLDivElement>('.test-floating-layer')
    expect(layer).not.toBeNull()
    expect(layer?.parentElement).toBe(dialog)
  })

  test('matches the anchor width and respects a max height smaller than 80px', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.getAttribute('aria-label') === '锚点')
        return {
          x: 120,
          y: 100,
          width: 240,
          height: 36,
          top: 100,
          right: 360,
          bottom: 136,
          left: 120,
          toJSON: () => ({}),
        }
      return new DOMRect()
    })

    await act(async () => root.render(<Harness maxHeight={40} />))
    const layer = document.querySelector<HTMLDivElement>('.test-floating-layer')!
    expect(layer.dataset.placement).toBe('bottom')
    expect(layer.style.left).toBe('120px')
    expect(layer.style.width).toBe('240px')
    expect(layer.style.top).toBe('140px')
    expect(layer.style.maxHeight).toBe('40px')
  })

  test('flips above and never invents unavailable viewport height', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(320)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(70)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.getAttribute('aria-label') === '锚点')
        return {
          x: 4,
          y: 20,
          width: 400,
          height: 36,
          top: 20,
          right: 404,
          bottom: 56,
          left: 4,
          toJSON: () => ({}),
        }
      return new DOMRect()
    })

    await act(async () => root.render(<Harness />))
    const layer = document.querySelector<HTMLDivElement>('.test-floating-layer')!
    expect(layer.dataset.placement).toBe('top')
    expect(layer.style.left).toBe('8px')
    expect(layer.style.width).toBe('304px')
    expect(layer.style.maxHeight).toBe('8px')
  })

  test('centers content-sized layers in fixed viewport coordinates', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.getAttribute('aria-label') === '锚点')
        return {
          x: 100,
          y: 100,
          width: 40,
          height: 36,
          top: 100,
          right: 140,
          bottom: 136,
          left: 100,
          toJSON: () => ({}),
        }
      if (this.classList.contains('test-floating-layer'))
        return {
          x: 0,
          y: 0,
          width: 80,
          height: 24,
          top: 0,
          right: 80,
          bottom: 24,
          left: 0,
          toJSON: () => ({}),
        }
      return new DOMRect()
    })

    await act(async () => root.render(<Harness width="content" align="center" />))
    const layer = document.querySelector<HTMLDivElement>('.test-floating-layer')!
    expect(layer.parentElement).toBe(document.body)
    expect(layer.dataset.placement).toBe('bottom')
    expect(layer.style.left).toBe('80px')
    expect(layer.style.width).toBe('')
    expect(layer.style.maxWidth).toBe('784px')
    expect(layer.style.top).toBe('140px')
  })

  test('light-dismiss ignores the anchor and layer but closes from outside', async () => {
    const onDismiss = vi.fn()
    await act(async () => root.render(<Harness onDismiss={onDismiss} />))
    const anchor = host.querySelector<HTMLButtonElement>('[aria-label="锚点"]')!
    const inside = document.querySelector<HTMLButtonElement>('.test-floating-layer button')!

    await act(async () => anchor.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })))
    await act(async () => inside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })))
    expect(onDismiss).not.toHaveBeenCalled()

    await act(async () =>
      document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })),
    )
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  test('can keep passive tooltip layers open during outside pointer input', async () => {
    const onDismiss = vi.fn()
    await act(async () =>
      root.render(<Harness dismissOnPointerDown={false} onDismiss={onDismiss} />),
    )

    await act(async () =>
      document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })),
    )
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
