// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-P-1 P02（IsometricEditorToolbar.glm-p）：工具栏横向选项托盘键盘合同。
 * 去重：MapMode.test 已证笔刷面积托盘点选与 2×2 写入；本文件只补暗区键盘臂：
 * 触发键 ArrowDown/Enter 开盘、托盘内 Home/End/ArrowLeft/Right 移焦、Escape 关盘回焦、
 * 选项点击提交、disabled 时按键不开盘。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ISOMETRIC_BRUSH_SIZES } from '../core/isometric-brush.js'
import { type IsometricEditorTool, IsometricEditorToolbar } from './IsometricEditorToolbar.js'

let host: HTMLDivElement
let root: Root

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

type Props = Parameters<typeof IsometricEditorToolbar>[0]

function renderToolbar(overrides: Partial<Props> = {}): void {
  const props: Props = {
    activeTool: 'brush',
    onToolChange: () => undefined,
    brushSize: 1,
    onBrushSizeChange: () => undefined,
    paintHeight: 0,
    maxPaintHeight: 3,
    onPaintHeightChange: () => undefined,
    collisionPaint: 'set',
    onCollisionPaintChange: () => undefined,
    showGrid: false,
    onShowGridChange: () => undefined,
    showCollision: false,
    onShowCollisionChange: () => undefined,
    ...overrides,
  }
  act(() => root.render(<IsometricEditorToolbar {...props} />))
}

function brushTrigger(): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>('[aria-label="笔刷面积"]')
  expect(found, '笔刷面积 trigger').not.toBeNull()
  return found!
}

function tray(): HTMLElement {
  // DsFloatingLayer 经 portal 渲染，不在 host 子树内。
  const found = document.querySelector<HTMLElement>('[role="listbox"][aria-label="笔刷面积选项"]')
  expect(found, '笔刷面积 tray').not.toBeNull()
  return found!
}

const key = (element: Element, key: string): Promise<void> =>
  act(async () => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  })

describe('P02-G03 工具选项托盘键盘合同', () => {
  test('触发器 ArrowDown/Enter 开盘；点击选项提交 brush 尺寸（空格键未在本例断言，不主张）', async () => {
    const onBrushSizeChange = vi.fn()
    renderToolbar({ onBrushSizeChange })
    const trigger = brushTrigger()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    await key(trigger, 'ArrowDown')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const options = [...tray().querySelectorAll<HTMLButtonElement>('button')]
    expect(options.length).toBeGreaterThan(1)
    // 选项按钮是纯图标：文案在 aria-label（optionLabel）上。
    const target = options.find((option) => option.getAttribute('aria-label') === '2 × 2')!
    await act(async () => target.click())
    expect(onBrushSizeChange).toHaveBeenCalledWith(2)

    renderToolbar({ onBrushSizeChange })
    const trigger2 = brushTrigger()
    await key(trigger2, 'Enter')
    expect(trigger2.getAttribute('aria-expanded')).toBe('true')
  })

  test('托盘内 Escape 关盘并把焦点还给触发器', async () => {
    renderToolbar()
    const trigger = brushTrigger()
    await act(async () => trigger.click())
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    await key(tray(), 'Escape')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
  })

  test('托盘内 Home/End 分别聚焦首/尾选项；ArrowRight/Left 在选项间移动', async () => {
    renderToolbar()
    const trigger = brushTrigger()
    await act(async () => trigger.click())
    // 产品 focusOption 经 requestAnimationFrame 落焦；portal 选项按钮分批挂载。
    // 等待可观察收敛：焦点落进托盘且全部选项挂载完成，不手工抢焦、不用空 act 代替帧。
    await vi.waitFor(
      () => {
        expect(tray().contains(document.activeElement)).toBe(true)
        expect(tray().querySelectorAll<HTMLButtonElement>('button')).toHaveLength(
          ISOMETRIC_BRUSH_SIZES.length,
        )
      },
      { interval: 16, timeout: 2000 },
    )
    const options = [...tray().querySelectorAll<HTMLButtonElement>('button')]
    // 收敛后焦点停在当前值(1)选项=首项；后续移动全部由产品键盘处理器驱动。
    expect(document.activeElement).toBe(options[0])
    await key(tray(), 'End')
    expect(document.activeElement).toBe(options.at(-1))
    await key(tray(), 'ArrowLeft')
    expect(document.activeElement).toBe(options.at(-2))
    await key(tray(), 'Home')
    expect(document.activeElement).toBe(options[0])
    await key(tray(), 'ArrowRight')
    expect(document.activeElement).toBe(options[1])
  })

  test('绘制高度托盘 disabled 时按键不开盘', async () => {
    renderToolbar({ paintHeightDisabled: true, activeTool: 'brush' as IsometricEditorTool })
    const heightTrigger = host.querySelector<HTMLButtonElement>('[aria-label="绘制高度"]')!
    expect(heightTrigger.disabled).toBe(true)
    await key(heightTrigger, 'ArrowDown')
    expect(heightTrigger.getAttribute('aria-expanded')).toBe('false')
  })

  test('绘制高度托盘选项按 maxPaintHeight 枚举并提交所选高度', async () => {
    const onPaintHeightChange = vi.fn()
    renderToolbar({ onPaintHeightChange, maxPaintHeight: 2 })
    const heightTrigger = host.querySelector<HTMLButtonElement>('[aria-label="绘制高度"]')!
    await act(async () => heightTrigger.click())
    const heightTray = document.querySelector<HTMLElement>(
      '[role="listbox"][aria-label="绘制高度选项"]',
    )!
    expect(heightTray, '绘制高度 tray').not.toBeNull()
    const options = [...heightTray.querySelectorAll<HTMLButtonElement>('button')]
    expect(options.map((option) => option.getAttribute('aria-label'))).toEqual(['H0', 'H1', 'H2'])
    await act(async () => options[2]!.click())
    expect(onPaintHeightChange).toHaveBeenCalledWith(2)
  })
})
