// @vitest-environment jsdom
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { IsometricEditorToolbar } from './IsometricEditorToolbar.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
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

function renderToolbar(overrides: Partial<ComponentProps<typeof IsometricEditorToolbar>> = {}) {
  const props: ComponentProps<typeof IsometricEditorToolbar> = {
    activeTool: 'brush',
    onToolChange: vi.fn(),
    brushSize: 1,
    onBrushSizeChange: vi.fn(),
    paintHeight: 0,
    maxPaintHeight: 14,
    onPaintHeightChange: vi.fn(),
    collisionPaint: 'set',
    onCollisionPaintChange: vi.fn(),
    showGrid: true,
    onShowGridChange: vi.fn(),
    showCollision: false,
    onShowCollisionChange: vi.fn(),
    ...overrides,
  }
  return act(async () => root.render(<IsometricEditorToolbar {...props} />)).then(() => props)
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

async function keyDown(element: HTMLElement, key: string): Promise<void> {
  await act(async () =>
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })),
  )
}

describe('IsometricEditorToolbar floating option trays', () => {
  test('portals the listbox to the top surface and keeps horizontal keyboard selection single-shot', async () => {
    const onBrushSizeChange = vi.fn()
    await renderToolbar({ onBrushSizeChange })
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="笔刷面积"]')!

    await click(trigger)
    const listbox = document.querySelector<HTMLElement>(
      '[role="listbox"][aria-label="笔刷面积选项"]',
    )!
    const layer = listbox.closest<HTMLElement>('.map-tool-option-layer')!
    expect(layer.parentElement).toBe(document.body)
    expect(host.contains(listbox)).toBe(false)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    const options = [...listbox.querySelectorAll<HTMLButtonElement>('[role="option"]')]
    expect(document.activeElement).toBe(options[0])
    await keyDown(options[0]!, 'End')
    expect(document.activeElement).toBe(options.at(-1))
    await keyDown(options.at(-1)!, 'Home')
    expect(document.activeElement).toBe(options[0])
    await keyDown(options[0]!, 'ArrowRight')
    expect(document.activeElement).toBe(options[1])
    await keyDown(options[1]!, 'ArrowLeft')
    expect(document.activeElement).toBe(options[0])

    await click(options[1]!)
    expect(onBrushSizeChange).toHaveBeenCalledOnce()
    expect(onBrushSizeChange).toHaveBeenCalledWith(2)
    expect(document.querySelector('[aria-label="笔刷面积选项"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  test('Escape and light-dismiss close once and return focus to the trigger', async () => {
    await renderToolbar()
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="绘制高度"]')!

    await click(trigger)
    const listbox = document.querySelector<HTMLElement>(
      '[role="listbox"][aria-label="绘制高度选项"]',
    )!
    await keyDown(listbox, 'Escape')
    expect(document.querySelector('[aria-label="绘制高度选项"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)

    await click(trigger)
    await act(async () =>
      document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })),
    )
    expect(document.querySelector('[aria-label="绘制高度选项"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  test('disabling a live tray closes it without changing the selected value', async () => {
    const onPaintHeightChange = vi.fn()
    await renderToolbar({ onPaintHeightChange })
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="绘制高度"]')!
    await click(trigger)
    expect(document.querySelector('[aria-label="绘制高度选项"]')).not.toBeNull()

    await renderToolbar({ paintHeightDisabled: true, onPaintHeightChange })
    expect(document.querySelector('[aria-label="绘制高度选项"]')).toBeNull()
    expect(onPaintHeightChange).not.toHaveBeenCalled()
  })
})
