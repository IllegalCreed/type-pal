// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import {
  catalogControlsAssetCatalog,
  catalogControlsEditorState,
  catalogControlsReader,
} from './catalog-controls-test-utils.js'
import { FrameAnimationEditor } from './FrameAnimationEditor.js'

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  class TestFrameSequenceReader {
    invalidate(): void {}

    async sequence() {
      return {
        index: {
          version: 1,
          codec: 'deflate-rgba8-xor-v1',
          pixelFormat: 'rgba8',
          width: 1,
          height: 1,
          defaultFrameMs: 40,
          blockFrames: 32,
          frames: [{}, {}, {}],
          blocks: [],
        },
        payload: new Uint8Array(),
      }
    }

    async frame() {
      return { width: 1, height: 1, rgba: new Uint8Array([0, 0, 0, 255]) }
    }
  }
  return { ...original, FrameSequenceReader: TestFrameSequenceReader }
})

let host: HTMLDivElement
let root: Root
let scrollToDescriptor: PropertyDescriptor | undefined
let canvasContextDescriptor: PropertyDescriptor | undefined

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  )
  scrollToDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo')
  canvasContextDescriptor = Object.getOwnPropertyDescriptor(
    HTMLCanvasElement.prototype,
    'getContext',
  )
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => null),
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  if (scrollToDescriptor)
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', scrollToDescriptor)
  else delete (HTMLElement.prototype as unknown as { scrollTo?: unknown }).scrollTo
  if (canvasContextDescriptor)
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', canvasContextDescriptor)
  else delete (HTMLCanvasElement.prototype as unknown as { getContext?: unknown }).getContext
  vi.restoreAllMocks()
})

describe('FrameAnimationEditor reorder integration', () => {
  test('[reorder-family:frame-animation] 横向 handle 只写一条草稿历史且选中帧跟随 undo/redo', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const dispatch = vi.spyOn(session, 'dispatch')
    const record = catalogControlsAssetCatalog.assets['frame-animation.logo']!
    await act(async () => {
      root.render(
        <FrameAnimationEditor
          asset={{ id: 'frame-animation.logo', record }}
          reader={catalogControlsReader}
          assetBase={{} as never}
          session={session}
          onMetadata={() => undefined}
        />,
      )
      await Promise.resolve()
      await Promise.resolve()
    })

    const collection = host.querySelector<HTMLElement>(
      '[data-ds-reorder-adoption="asset/frame-animation-timeline"]',
    )!
    const rows = () => collection.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')
    const keys = () => [...rows()].map((row) => row.dataset.itemKey)
    const initialKeys = keys()
    expect(initialKeys).toHaveLength(3)
    const source = rows()[0]!
    const handle = source.querySelector<HTMLButtonElement>('[data-ds-reorder-handle]')!
    const undo = host.querySelector<HTMLButtonElement>('[aria-label="撤销帧编辑"]')!
    const redo = host.querySelector<HTMLButtonElement>('[aria-label="重做帧编辑"]')!

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(keys()).toEqual(initialKeys)
    expect(undo.disabled).toBe(true)
    expect(dispatch).not.toHaveBeenCalled()

    await act(async () => {
      rows()[2]!
        .querySelector<HTMLButtonElement>('.fa-frame-select')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }))
    })
    expect(host.querySelector('.fa-counter')?.textContent).toContain('3 / 3 · 已选 3')

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(keys()).toEqual([initialKeys[1], initialKeys[2], initialKeys[0]])
    expect(rows()[2]!.querySelector('.fa-frame')?.classList.contains('current')).toBe(true)
    expect(host.querySelector('.fa-counter')?.textContent).toContain('3 / 3 · 已选 3')
    expect(undo.disabled).toBe(false)
    expect(dispatch).not.toHaveBeenCalled()
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => undo.click())
    expect(keys()).toEqual(initialKeys)
    expect(undo.disabled).toBe(true)
    expect(redo.disabled).toBe(false)

    await act(async () => redo.click())
    expect(keys()).toEqual([initialKeys[1], initialKeys[2], initialKeys[0]])
    expect(undo.disabled).toBe(false)
    expect(redo.disabled).toBe(true)
    expect(dispatch).not.toHaveBeenCalled()
  })
})
