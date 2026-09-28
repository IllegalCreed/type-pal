// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  PanelResizeHandle,
  parseStoredPanelNumber,
  useStoredPanelBoolean,
  useStoredPanelNumber,
} from './PanelResizeHandle.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  window.localStorage.clear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('parseStoredPanelNumber 剩余合同', () => {
  test('rounds into the requested window and rejects non-finite raw values', () => {
    expect(parseStoredPanelNumber('12.6', { min: 0, max: 20 })).toBe(13)
    expect(parseStoredPanelNumber('-5', { min: 10, max: 20 })).toBe(10)
    expect(parseStoredPanelNumber('999', { min: 10, max: 20 })).toBe(20)
    expect(parseStoredPanelNumber('7.2')).toBe(7.2)
    expect(parseStoredPanelNumber('abc')).toBeUndefined()
    expect(parseStoredPanelNumber('Infinity')).toBeUndefined()
    expect(parseStoredPanelNumber('', { min: 2, max: 8 })).toBe(2)
  })
})

describe('useStoredPanelNumber / useStoredPanelBoolean 剩余合同', () => {
  test('hydrates from localStorage, persists writes and falls back on malformed values', async () => {
    window.localStorage.setItem('leaf.panel.width', '260')
    window.localStorage.setItem('leaf.panel.open', 'true')
    window.localStorage.setItem('leaf.panel.bad', 'not-a-number')

    function Harness(): React.ReactNode {
      const [width, setWidth] = useStoredPanelNumber('leaf.panel.width', 200, {
        min: 100,
        max: 400,
      })
      const [open, setOpen] = useStoredPanelBoolean('leaf.panel.open', false)
      const [bad, setBad] = useStoredPanelNumber('leaf.panel.bad', 42, { min: 0, max: 100 })
      return (
        <>
          <output data-width>{width}</output>
          <output data-open>{String(open)}</output>
          <output data-bad>{bad}</output>
          <button type="button" onClick={() => setWidth(999)}>
            拉满
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            收起
          </button>
          <button type="button" onClick={() => setBad(7)}>
            坏键
          </button>
        </>
      )
    }
    await act(async () => root.render(<Harness />))
    expect(host.querySelector('[data-width]')?.textContent).toBe('260')
    expect(host.querySelector('[data-open]')?.textContent).toBe('true')
    expect(host.querySelector('[data-bad]')?.textContent).toBe('42')

    await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
    expect(host.querySelector('[data-width]')?.textContent).toBe('999')
    expect(window.localStorage.getItem('leaf.panel.width')).toBe('999')

    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent === '收起')!
        .click(),
    )
    expect(host.querySelector('[data-open]')?.textContent).toBe('false')
    expect(window.localStorage.getItem('leaf.panel.open')).toBe('false')

    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent === '坏键')!
        .click(),
    )
    expect(host.querySelector('[data-bad]')?.textContent).toBe('7')
  })
})

describe('PanelResizeHandle 剩余合同', () => {
  function handle(props: {
    orientation?: 'vertical' | 'horizontal'
    disabled?: boolean
    onResize: (delta: number) => void
    onReset: () => void
    onToggle?: () => void
  }) {
    return (
      <PanelResizeHandle
        orientation={props.orientation ?? 'vertical'}
        value={180}
        min={120}
        max={400}
        resizeLabel="调整侧栏"
        className="app-inspector-resizer"
        disabled={props.disabled}
        onResize={props.onResize}
        onReset={props.onReset}
        onToggle={props.onToggle}
        toggleDirection={props.onToggle ? 'left' : undefined}
        toggleLabel={props.onToggle ? '收起侧栏' : undefined}
      />
    )
  }

  async function key(element: Element, keyName: string): Promise<void> {
    await act(async () => {
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }),
      )
    })
  }

  test('reports clamped bounds and applies ±16 keyboard deltas per orientation', async () => {
    const onResize = vi.fn()
    const onReset = vi.fn()
    await act(async () => root.render(handle({ onResize, onReset })))
    const resizer = host.querySelector<HTMLInputElement>('.panel-resizer-hit')!
    expect(resizer.getAttribute('aria-label')).toBe('调整侧栏')
    expect(resizer.getAttribute('aria-valuemin')).toBe('120')
    expect(resizer.getAttribute('aria-valuemax')).toBe('400')
    expect(resizer.getAttribute('aria-valuenow')).toBe('180')

    resizer.focus()
    await key(resizer, 'ArrowLeft')
    expect(onResize).toHaveBeenLastCalledWith(-16)
    await key(resizer, 'ArrowRight')
    expect(onResize).toHaveBeenLastCalledWith(16)

    await act(async () => root.render(handle({ orientation: 'horizontal', onResize, onReset })))
    const horizontal = host.querySelector<HTMLInputElement>('.panel-resizer-hit')!
    expect(horizontal.getAttribute('aria-orientation')).toBe('horizontal')
    await key(horizontal, 'ArrowUp')
    expect(onResize).toHaveBeenLastCalledWith(-16)
    await key(horizontal, 'ArrowDown')
    expect(onResize).toHaveBeenLastCalledWith(16)
    await key(horizontal, 'ArrowLeft')
    expect(onResize).toHaveBeenCalledTimes(4)

    await key(horizontal, 'Home')
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  test('ignores keyboard deltas while disabled and wires toggle plus double-click reset', async () => {
    const onResize = vi.fn()
    const onReset = vi.fn()
    const onToggle = vi.fn()
    await act(async () => root.render(handle({ disabled: true, onResize, onReset, onToggle })))
    const resizer = host.querySelector<HTMLInputElement>('.panel-resizer-hit')!
    resizer.focus()
    await key(resizer, 'ArrowRight')
    expect(onResize).not.toHaveBeenCalled()

    await key(resizer, 'Home')
    expect(onReset).toHaveBeenCalledTimes(1)

    await act(async () => root.render(handle({ onResize, onReset, onToggle })))
    const toggle = host.querySelector<HTMLButtonElement>('[aria-label="收起侧栏"]')!
    expect(toggle).not.toBeNull()
    await act(async () => toggle.click())
    expect(onToggle).toHaveBeenCalledTimes(1)

    const enabled = host.querySelector<HTMLInputElement>('.panel-resizer-hit')!
    await act(async () => enabled.dispatchEvent(new Event('dblclick', { bubbles: true })))
    expect(onReset).toHaveBeenCalledTimes(2)
  })
})
