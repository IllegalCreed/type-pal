// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { installReactActEnvironment } from '../../__tests__/react-io-wait.js'
import { DsMediaViewport, DsZoomToolbar } from './index.js'

let host: HTMLDivElement
let root: Root
let restoreAct: () => void

beforeEach(() => {
  restoreAct = installReactActEnvironment()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  restoreAct()
})

async function click(label: string): Promise<void> {
  const button = host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
  expect(button).not.toBeNull()
  await act(async () => button?.click())
}

describe('DsZoomToolbar', () => {
  test('owns the complete zoom action, range and active-state contract', async () => {
    const onChange = vi.fn()
    const onStep = vi.fn()
    const onFit = vi.fn()
    const onActualSize = vi.fn()
    await act(async () =>
      root.render(
        <DsZoomToolbar
          label="图像预览缩放"
          value={1}
          fitted
          min={0.25}
          max={8}
          onChange={onChange}
          onStep={onStep}
          onFit={onFit}
          onActualSize={onActualSize}
        />,
      ),
    )

    expect(host.querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBe('图像预览缩放')
    expect(host.querySelector('output')?.textContent).toBe('100%')
    expect(host.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.textContent).toBe('适合')
    expect(host.querySelectorAll('.ds-icon-button--secondary')).toHaveLength(2)

    await click('缩小')
    await click('放大')
    expect(onStep.mock.calls).toEqual([[-1], [1]])

    const range = host.querySelector<HTMLInputElement>('input[type="range"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(range, '175')
      range.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onChange).toHaveBeenCalledWith(1.75)

    const buttons = [...host.querySelectorAll<HTMLButtonElement>('.ds-button')]
    await act(async () => buttons.find((button) => button.textContent === '适合')?.click())
    await act(async () => buttons.find((button) => button.textContent === '1:1')?.click())
    expect(onFit).toHaveBeenCalledTimes(1)
    expect(onActualSize).toHaveBeenCalledTimes(1)
  })

  test('disables step controls at explicit non-fitted boundaries', async () => {
    await act(async () =>
      root.render(
        <DsZoomToolbar
          label="边界缩放"
          value={0.25}
          fitted={false}
          min={0.25}
          max={8}
          onChange={() => undefined}
          onStep={() => undefined}
          onFit={() => undefined}
          onActualSize={() => undefined}
        />,
      ),
    )
    expect(host.querySelector<HTMLButtonElement>('[aria-label="缩小"]')?.disabled).toBe(true)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="放大"]')?.disabled).toBe(false)
  })
})

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

describe('media viewport zoom ownership', () => {
  test('keeps fitted and explicit zoom separate and reports legal preview scale changes', async () => {
    const onScaleChange = vi.fn()
    await act(async () =>
      root.render(
        <DsMediaViewport
          label="精灵预览"
          summary="精灵工作台预览"
          initialScale={2}
          onScaleChange={onScaleChange}
        >
          <div data-workspace>工作区</div>
        </DsMediaViewport>,
      ),
    )
    const section = host.querySelector('section.ds-media-viewport')!
    expect(section.getAttribute('aria-label')).toBe('精灵预览')
    expect(section.className).toContain('ds-media-viewport--plain-dark')
    expect(host.querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBe(
      '精灵预览查看缩放',
    )
    expect(host.querySelector('output')?.textContent).toBe('200%')
    const summary = document.getElementById(section.getAttribute('aria-describedby') ?? '')!
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

    await setRange('5')
    expect(onScaleChange).toHaveBeenLastCalledWith(0.05)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="缩小"]')?.disabled).toBe(true)

    await setRange('3200')
    expect(onScaleChange).toHaveBeenLastCalledWith(32)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="放大"]')?.disabled).toBe(true)
  })
})

describe('zoom toolbar scale contract', () => {
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
      setValue.call(range, '185')
      range.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onChange).toHaveBeenCalledWith(1.85)

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
