// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DsZoomToolbar } from './media.js'

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
  await act(async () => button?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
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
