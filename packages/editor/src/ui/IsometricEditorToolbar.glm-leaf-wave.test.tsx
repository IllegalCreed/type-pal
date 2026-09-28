// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { IsometricEditorToolbar } from './IsometricEditorToolbar.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
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

function toolbar(overrides: Partial<Parameters<typeof IsometricEditorToolbar>[0]> = {}) {
  const props: Parameters<typeof IsometricEditorToolbar>[0] = {
    activeTool: 'brush',
    onToolChange: () => undefined,
    brushSize: 2,
    onBrushSizeChange: () => undefined,
    paintHeight: 1,
    maxPaintHeight: 4,
    onPaintHeightChange: () => undefined,
    collisionPaint: 'set',
    onCollisionPaintChange: () => undefined,
    showGrid: true,
    onShowGridChange: () => undefined,
    showCollision: false,
    onShowCollisionChange: () => undefined,
    ...overrides,
  }
  act(() => root.render(<IsometricEditorToolbar {...props} />))
}

async function clickOption(triggerLabel: string, optionLabel: string): Promise<void> {
  const trigger = host.querySelector<HTMLButtonElement>(`[aria-label="${triggerLabel}"]`)!
  await act(async () => trigger.click())
  const option = [...document.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(
    (candidate) => candidate.getAttribute('aria-label') === optionLabel,
  )
  expect(option).not.toBeNull()
  await act(async () => option!.click())
}

function buttonByText(text: string): HTMLButtonElement {
  const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(button).not.toBeNull()
  return button!
}

describe('IsometricEditorToolbar 剩余合同', () => {
  test('commits tool changes with pressed state and per-tool disables', async () => {
    const onToolChange = vi.fn()
    toolbar({
      activeTool: 'select',
      onToolChange,
      disabledTools: { fill: true },
      selectionOptions: <div data-selection-option>选区</div>,
    })
    const brush = buttonByText('🖌 笔刷')
    await act(async () => brush.click())
    expect(onToolChange).toHaveBeenLastCalledWith('brush')

    const select = buttonByText('⛶ 选择')
    expect(select.getAttribute('aria-pressed')).toBe('true')
    expect(brush.getAttribute('aria-pressed')).toBe('false')
    expect(buttonByText('🪣 填充').disabled).toBe(true)

    const selection = host.querySelector('fieldset.map-inline-option')
    expect(selection).not.toBeNull()
    expect(selection?.querySelector('legend')?.textContent).toBe('选择工具选项')
  })

  test('passes brush size and paint height through their trays and honors height disable', async () => {
    const onBrushSizeChange = vi.fn()
    const onPaintHeightChange = vi.fn()
    toolbar({ onBrushSizeChange, onPaintHeightChange })
    await clickOption('笔刷面积', '4 × 4')
    expect(onBrushSizeChange).toHaveBeenLastCalledWith(4)

    await clickOption('绘制高度', 'H3')
    expect(onPaintHeightChange).toHaveBeenLastCalledWith(3)

    toolbar({ onBrushSizeChange, onPaintHeightChange, paintHeightDisabled: true })
    const heightTrigger = host.querySelector<HTMLButtonElement>('[aria-label="绘制高度"]')!
    expect(heightTrigger.disabled).toBe(true)

    toolbar({ activeTool: 'pan', onBrushSizeChange, onPaintHeightChange })
    expect(host.querySelector('[aria-label="笔刷面积"]')).toBeNull()
    expect(host.querySelector('[aria-label="绘制高度"]')).toBeNull()
  })

  test('switches collision paint mode and toggles canvas display flags from the view menu', async () => {
    const onCollisionPaintChange = vi.fn()
    const onShowGridChange = vi.fn()
    const onShowCollisionChange = vi.fn()
    toolbar({
      activeTool: 'collision',
      collisionPaint: 'set',
      onCollisionPaintChange,
      showGrid: true,
      onShowGridChange,
      showCollision: false,
      onShowCollisionChange,
    })
    const set = buttonByText('标记')
    const clear = buttonByText('清除')
    expect(set.getAttribute('aria-pressed')).toBe('true')
    expect(clear.getAttribute('aria-pressed')).toBe('false')
    await act(async () => clear.click())
    expect(onCollisionPaintChange).toHaveBeenLastCalledWith('clear')

    const viewTrigger = host.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!
    await act(async () => viewTrigger.click())
    const menuItems = () => [
      ...document.querySelectorAll<HTMLButtonElement>('[role="menuitemcheckbox"]'),
    ]
    expect(
      menuItems()
        .find((item) => item.textContent === '显示网格')
        ?.getAttribute('aria-checked'),
    ).toBe('true')
    expect(
      menuItems()
        .find((item) => item.textContent === '显示碰撞')
        ?.getAttribute('aria-checked'),
    ).toBe('false')
    await act(async () =>
      menuItems()
        .find((item) => item.textContent === '显示碰撞')!
        .click(),
    )
    expect(onShowCollisionChange).toHaveBeenLastCalledWith(true)

    await act(async () => viewTrigger.click())
    await act(async () =>
      menuItems()
        .find((item) => item.textContent === '显示网格')!
        .click(),
    )
    expect(onShowGridChange).toHaveBeenLastCalledWith(false)
  })
})
