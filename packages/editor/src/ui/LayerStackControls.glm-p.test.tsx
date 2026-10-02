// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-P-1 P02（LayerStackControls.glm-p）：图层栈共用控件残余合同。
 * 去重：LayerStackControls 既有测试已证重排/选中/显隐锁定主干。本文件只补暗区：
 * LayerPaintContext 聚焦切换 aria-pressed/文案互斥、显示高度滑杆回调；
 * addDisabledReason 禁用与原因段、最小层规则 HelpTip、add/delete 同因共享单段。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { LayerPaintContext, LayerStackControls } from './LayerStackControls.js'

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

describe('P02-G02 LayerPaintContext 聚焦与显示高度', () => {
  function renderContext(overrides: Partial<Parameters<typeof LayerPaintContext>[0]> = {}): void {
    const props = {
      layerName: '物件',
      focusEnabled: false,
      viewHeight: 2,
      maxViewHeight: 6,
      onToggleFocus: () => undefined,
      onViewHeightChange: () => undefined,
      ...overrides,
    }
    act(() => root.render(<LayerPaintContext {...props} />))
  }

  test('默认「聚焦当前」；点击后 aria-pressed 翻转并显示「只看当前」', async () => {
    const onToggleFocus = vi.fn()
    renderContext({ onToggleFocus })
    const button = host.querySelector<HTMLButtonElement>('[aria-label="聚焦当前图层和高度"]')!
    expect(button.textContent).toBe('聚焦当前')
    expect(button.getAttribute('aria-pressed')).toBe('false')
    await act(async () => button.click())
    expect(onToggleFocus).toHaveBeenCalledTimes(1)

    renderContext({ onToggleFocus, focusEnabled: true })
    const active = host.querySelector<HTMLButtonElement>('[aria-label="关闭其他图层聚焦"]')!
    expect(active.textContent).toBe('只看当前')
    expect(active.getAttribute('aria-pressed')).toBe('true')
    expect(active.title).toBe('关闭聚焦，全部正常显示')
  })

  test('显示高度滑杆按整数步进回调，output 实时显示当前值', async () => {
    const onViewHeightChange = vi.fn()
    renderContext({ onViewHeightChange })
    const output = host.querySelector('output')!
    expect(output.textContent).toBe('2')
    const range = host.querySelector<HTMLInputElement>('input[type="range"]')!
    expect(range.getAttribute('max')).toBe('6')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(range, '5')
      range.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onViewHeightChange).toHaveBeenCalledWith(5)
  })
})

describe('P02-G02 LayerStackControls 禁用原因残余', () => {
  type Props = Parameters<typeof LayerStackControls>[0]

  function renderStack(overrides: Partial<Props> = {}): void {
    const props: Props = {
      items: [
        { id: 'floor', name: '地板' },
        { id: 'objects', name: '物件' },
      ],
      activeId: 'objects',
      onSelect: () => undefined,
      onAdd: () => undefined,
      onDelete: () => undefined,
      onToggleVisible: () => undefined,
      onToggleLocked: () => undefined,
      reorderScopeKey: 'p2',
      reorderRevision: 0,
      stackOrder: 'top-first',
      onReorder: () => undefined,
      ...overrides,
    }
    act(() => root.render(<LayerStackControls {...props} />))
  }

  function byLabel(label: string): HTMLButtonElement {
    const found = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
    expect(found, label).not.toBeNull()
    return found!
  }

  test('addDisabledReason：新增按钮禁用并渲染原因段', () => {
    renderStack({ addDisabledReason: '组合放置期间不能增层。' })
    expect(byLabel('新增图层').disabled).toBe(true)
    expect(host.querySelector('.layer-stack-disabled-reason')?.textContent).toBe(
      '组合放置期间不能增层。',
    )
    expect(byLabel('删除选中图层：物件').disabled).toBe(false)
  })

  test('最小层规则：删除按钮禁用并出现规则 HelpTip，但不渲染删除原因段', () => {
    renderStack({ deleteDisabledReason: '至少保留一个图层。' })
    expect(byLabel('删除选中图层：物件').disabled).toBe(true)
    expect(host.querySelector('.layer-stack-disabled-reason')).toBeNull()
    expect(host.textContent).toContain('至少保留一个图层。')
  })

  test('add/delete 同因 → 只渲染一段共享原因', () => {
    renderStack({
      addDisabledReason: '只读工程不能改图层结构。',
      deleteDisabledReason: '只读工程不能改图层结构。',
    })
    expect(host.querySelectorAll('.layer-stack-disabled-reason')).toHaveLength(1)
    expect(byLabel('新增图层').disabled).toBe(true)
    expect(byLabel('删除选中图层：物件').disabled).toBe(true)
  })
})
