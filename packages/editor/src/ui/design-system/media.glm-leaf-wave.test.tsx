// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DsMediaViewport, DsZoomToolbar } from './media.js'

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

async function click(label: string): Promise<void> {
  const button = host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
  expect(button).not.toBeNull()
  await act(async () => button?.click())
}

async function clickButton(text: string): Promise<void> {
  const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent === text,
  )
  expect(button).not.toBeNull()
  await act(async () => button?.click())
}

async function setRange(value: string): Promise<void> {
  const range = host.querySelector<HTMLInputElement>('input[type="range"]')!
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setValue.call(range, value)
    range.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('DsMediaViewport 剩余合同', () => {
  test('wires the zoom toolbar, clamps scale changes and reports every callback', async () => {
    const onScaleChange = vi.fn()
    function Harness(): React.ReactNode {
      const [scale, setScale] = useState(2)
      return (
        <DsMediaViewport
          label="精灵预览"
          summary="精灵工作台预览"
          initialScale={scale}
          onScaleChange={(next) => {
            onScaleChange(next)
            setScale(next)
          }}
        >
          <div data-workspace>工作区</div>
        </DsMediaViewport>
      )
    }
    await act(async () => root.render(<Harness />))
    const section = host.querySelector('section.ds-media-viewport')!
    expect(section.getAttribute('aria-label')).toBe('精灵预览')
    expect(section.className).toContain('ds-media-viewport--plain-dark')
    expect(host.querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBe(
      '精灵预览查看缩放',
    )
    expect(host.querySelector('output')?.textContent).toBe('200%')
    const summary = host.querySelector('#精灵预览-summary')!
    expect(summary.textContent).toContain('精灵工作台预览')
    expect(summary.textContent).toContain('当前缩放 适应窗口')

    await setRange('300')
    expect(onScaleChange).toHaveBeenLastCalledWith(3)
    expect(host.querySelector('output')?.textContent).toBe('300%')
    expect(summary.textContent).toContain('当前缩放 300%')

    await clickButton('适合')
    expect(summary.textContent).toContain('当前缩放 适应窗口')
    expect(onScaleChange).toHaveBeenCalledTimes(1)

    await clickButton('1:1')
    expect(onScaleChange).toHaveBeenLastCalledWith(1)
    expect(host.querySelector('output')?.textContent).toBe('100%')

    await click('缩小')
    expect(onScaleChange).toHaveBeenLastCalledWith(0.5)
    expect(host.querySelector('output')?.textContent).toBe('50%')

    await click('放大')
    expect(onScaleChange).toHaveBeenLastCalledWith(1)

    await setRange('0')
    expect(onScaleChange).toHaveBeenLastCalledWith(0.05)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="缩小"]')?.disabled).toBe(true)

    await setRange('3200')
    expect(onScaleChange).toHaveBeenLastCalledWith(32)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="放大"]')?.disabled).toBe(true)
  })
})

describe('DsZoomToolbar 剩余合同', () => {
  test('rounds the percentage, reports the value ratio and honors custom step bounds', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <DsZoomToolbar
          label="图像预览缩放"
          value={0.125}
          fitted={false}
          min={0.1}
          max={4}
          step={25}
          onChange={onChange}
          onStep={() => undefined}
          onFit={() => undefined}
          onActualSize={() => undefined}
        />,
      ),
    )
    expect(host.querySelector('output')?.textContent).toBe('13%')
    const range = host.querySelector<HTMLInputElement>('input[type="range"]')!
    expect(range.getAttribute('step')).toBe('25')
    expect(range.getAttribute('min')).toBe('10')
    expect(range.getAttribute('max')).toBe('400')
    expect(range.value).toBe('13')

    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setValue.call(range, '175')
      range.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onChange).toHaveBeenCalledWith(1.75)

    await act(async () =>
      root.render(
        <DsZoomToolbar
          label="图像预览缩放"
          value={4}
          fitted={false}
          min={0.1}
          max={4}
          onChange={onChange}
          onStep={() => undefined}
          onFit={() => undefined}
          onActualSize={() => undefined}
        />,
      ),
    )
    expect(host.querySelector<HTMLButtonElement>('[aria-label="放大"]')?.disabled).toBe(true)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="缩小"]')?.disabled).toBe(false)
  })

  test('keeps both step buttons usable while fitted regardless of the scale value', async () => {
    await act(async () =>
      root.render(
        <DsZoomToolbar
          label="适应缩放"
          value={0.05}
          fitted
          min={0.05}
          max={8}
          onChange={() => undefined}
          onStep={() => undefined}
          onFit={() => undefined}
          onActualSize={() => undefined}
        />,
      ),
    )
    expect(host.querySelector<HTMLButtonElement>('[aria-label="缩小"]')?.disabled).toBe(false)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="放大"]')?.disabled).toBe(false)
    expect(host.querySelector('output')?.textContent).toBe('5%')
  })
})
