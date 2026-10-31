// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { type SpriteFrameView, SpriteSourceFramePicker } from './SpriteFrameWorkbench.js'

// Selection uses frame metadata; loading and pixels have separate contracts.
const frames: readonly SpriteFrameView[] = Array.from({ length: 6 }, () => ({
  canvas: undefined,
  width: 8,
  height: 8,
}))
let root: Root
let host: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})
function renderPicker(selected: number, onSelect = vi.fn()): void {
  act(() =>
    root.render(
      <SpriteSourceFramePicker
        asset="sprite.test"
        frames={frames}
        selectedFrame={selected}
        onSelect={onSelect}
        transferEnabled
        ariaLabel="Test source frames"
        presentation="rail"
      />,
    ),
  )
}
describe('Sprite source frame selection', () => {
  test('选中帧超出范围：安全钳到末帧且 status 播报末索引', () => {
    renderPicker(999)
    expect(host.textContent).toContain('已选择源帧 5')
  })

  test('ArrowRight 从帧 0 选中帧 1 并回调 onSelect', async () => {
    const onSelect = vi.fn()
    renderPicker(0, onSelect)
    const button = host.querySelector<HTMLButtonElement>('[data-source-frame-index="0"]')!
    await act(async () => {
      button.focus()
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  test('Home/End 键跳到首尾帧', async () => {
    const onSelect = vi.fn()
    renderPicker(2, onSelect)
    const button = host.querySelector<HTMLButtonElement>('[data-source-frame-index="2"]')!
    await act(async () => {
      button.focus()
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    })
    expect(onSelect).toHaveBeenCalledWith(0)
    await act(async () => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    })
    expect(onSelect).toHaveBeenLastCalledWith(5)
  })
})
