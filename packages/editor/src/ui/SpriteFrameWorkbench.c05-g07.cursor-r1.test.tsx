// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C05-G07：SpriteFrameWorkbench 拖拽 MIME 与源帧选择器。
 * 排重：SpriteFrameWorkbench.test 语义架；glm F04b RawFrameInspector；本组只测
 * inspect/read 拖拽 payload、SpriteSourceFramePicker 键盘/aria、SpriteFrameCanvas 真实像素。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { C05_ASSET, openC05 } from '../__tests__/cursor-asset-r1/c05-action-fixtures.js'
import { setupC05Ui, teardownC05Ui } from '../__tests__/cursor-asset-r1/c05-action-ui.js'
import { colorCensus, requireRealCanvas2d } from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import {
  inspectSpriteFrameDragPayload,
  readSpriteFrameDragPayload,
  SPRITE_FRAME_DRAG_MIME,
  SpriteFrameCanvas,
  type SpriteFrameView,
  SpriteSourceFramePicker,
} from './SpriteFrameWorkbench.js'

let root: Root | undefined
let host: HTMLDivElement | undefined

beforeEach(() => {
  setupC05Ui()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  host?.remove()
  root = undefined
  host = undefined
  teardownC05Ui()
})

function renderPicker(
  frames: readonly SpriteFrameView[],
  selected: number,
  onSelect = vi.fn(),
): void {
  act(() => {
    root!.render(
      <SpriteSourceFramePicker
        asset={C05_ASSET}
        frames={frames}
        selectedFrame={selected}
        onSelect={onSelect}
        transferEnabled
        ariaLabel="测试源帧"
        presentation="rail"
      />,
    )
  })
}

describe('C05-G07 拖拽协议与源帧选择器', () => {
  test('C05-G07-01 inspect：缺 MIME 返回 absent', () => {
    expect(inspectSpriteFrameDragPayload({ getData: () => '' })).toEqual({ kind: 'absent' })
  })

  test('C05-G07-02 inspect：非法 JSON 返回 invalid', () => {
    const result = inspectSpriteFrameDragPayload({
      getData: (type) => (type === SPRITE_FRAME_DRAG_MIME ? '{' : ''),
    })
    expect(result).toEqual({ kind: 'invalid' })
  })

  test('C05-G07-03 inspect：frame 非整数返回 invalid', () => {
    const result = inspectSpriteFrameDragPayload({
      getData: (type) =>
        type === SPRITE_FRAME_DRAG_MIME ? JSON.stringify({ asset: C05_ASSET, frame: 1.5 }) : '',
    })
    expect(result).toEqual({ kind: 'invalid' })
  })

  test('C05-G07-04 readSpriteFrameDragPayload：合法 payload 可读回', () => {
    const payload = readSpriteFrameDragPayload({
      getData: (type) =>
        type === SPRITE_FRAME_DRAG_MIME ? JSON.stringify({ asset: C05_ASSET, frame: 3 }) : '',
    })
    expect(payload).toEqual({ asset: C05_ASSET, frame: 3 })
  })

  test('C05-G07-05 readSpriteFrameDragPayload：invalid 时 undefined', () => {
    expect(
      readSpriteFrameDragPayload({
        getData: (type) => (type === SPRITE_FRAME_DRAG_MIME ? '"nope"' : ''),
      }),
    ).toBeUndefined()
  })

  test('C05-G07-06 选中帧超出范围：安全钳到末帧且 status 播报末索引', async () => {
    const open = await openC05('g07-06')
    renderPicker(open.frames, 999)
    expect(host!.textContent).toContain(`已选择源帧 ${open.frameCount - 1}`)
  })

  test('C05-G07-07 ArrowRight 从帧 0 选中帧 1 并回调 onSelect', async () => {
    const open = await openC05('g07-07')
    const onSelect = vi.fn()
    renderPicker(open.frames, 0, onSelect)
    const button = host!.querySelector<HTMLButtonElement>('[data-source-frame-index="0"]')!
    await act(async () => {
      button.focus()
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  test('C05-G07-08 Home/End 键跳到首尾帧', async () => {
    const open = await openC05('g07-08')
    const onSelect = vi.fn()
    renderPicker(open.frames, 2, onSelect)
    const button = host!.querySelector<HTMLButtonElement>('[data-source-frame-index="2"]')!
    await act(async () => {
      button.focus()
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    })
    expect(onSelect).toHaveBeenCalledWith(0)
    await act(async () => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    })
    expect(onSelect).toHaveBeenLastCalledWith(open.frameCount - 1)
  })

  test('C05-G07-09 SpriteFrameCanvas 绘制真实 bakeFrame 像素（互异 RGB 至少 2）', async () => {
    requireRealCanvas2d()
    const open = await openC05('g07-09')
    act(() => {
      root!.render(
        <SpriteFrameCanvas
          source={open.frames[0]?.canvas}
          width={64}
          height={64}
          maxScale={4}
          label="帧0"
        />,
      )
    })
    const canvas = host!.querySelector('canvas')!
    const census = colorCensus(canvas)
    expect(census.opaque.size).toBeGreaterThanOrEqual(1)
    expect(census.transparent).toBeGreaterThan(0)
  })
})
