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

const frameFixture = vi.hoisted(() => ({
  count: 3,
  frameCalls: [] as number[],
  sequenceCalls: [] as string[],
  decodePromise: null as Promise<Array<{ width: number; height: number; rgba: Uint8Array }>> | null,
}))

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  class TestFrameSequenceReader {
    invalidate(): void {}

    async sequence(asset: string) {
      frameFixture.sequenceCalls.push(asset)
      const frameCount = asset === 'frame-animation.window' ? 410 : frameFixture.count
      return {
        index: {
          version: 1,
          codec: 'deflate-rgba8-xor-v1',
          pixelFormat: 'rgba8',
          width: 1,
          height: 1,
          defaultFrameMs: 40,
          blockFrames: 32,
          frames: Array.from({ length: frameCount }, () => ({})),
          blocks: [],
        },
        payload: new Uint8Array(),
      }
    }

    async frame(_asset: string, index: number) {
      frameFixture.frameCalls.push(index)
      return { width: 1, height: 1, rgba: new Uint8Array([0, 0, 0, 255]) }
    }
  }
  return { ...original, FrameSequenceReader: TestFrameSequenceReader }
})

vi.mock('../core/frame-animation-images.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../core/frame-animation-images.js')>()
  return {
    ...original,
    decodeFrameImages: (...args: Parameters<typeof original.decodeFrameImages>) =>
      frameFixture.decodePromise ?? original.decodeFrameImages(...args),
  }
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
  frameFixture.count = 3
  frameFixture.frameCalls = []
  frameFixture.sequenceCalls = []
  frameFixture.decodePromise = null
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

function dataTransfer() {
  const values = new Map<string, string>()
  return {
    effectAllowed: 'none',
    dropEffect: 'none',
    get types() {
      return [...values.keys()]
    },
    setData(type: string, value: string) {
      values.set(type, value)
    },
    getData(type: string) {
      return values.get(type) ?? ''
    },
    clearData(type?: string) {
      if (type) values.delete(type)
      else values.clear()
    },
  } as unknown as DataTransfer
}

function dragEvent(type: string, transfer: DataTransfer): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: transfer })
  return event
}

describe('FrameAnimationEditor reorder integration', () => {
  test('整张帧卡 native drag 只写一条草稿历史，稳定帧选择跟随 undo/redo', async () => {
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

    const cards = () => host.querySelectorAll<HTMLButtonElement>('button.fa-frame')
    const keys = () => [...cards()].map((card) => card.dataset.frameId)
    const initialKeys = keys()
    expect(initialKeys).toHaveLength(3)
    expect([...cards()].map((card) => card.style.left)).toEqual(['0px', '78px', '156px'])
    expect([...cards()].every((card) => card.draggable)).toBe(true)
    expect(host.querySelector('[data-ds-reorder-handle]')).toBeNull()
    expect(
      host.querySelector('[data-ds-reorder-adoption="asset/frame-animation-timeline"]'),
    ).toBeNull()
    expect(host.querySelector('.fa-frame-actions')).toBeNull()
    const undo = host.querySelector<HTMLButtonElement>('[aria-label="撤销帧编辑"]')!
    const redo = host.querySelector<HTMLButtonElement>('[aria-label="重做帧编辑"]')!

    const noopTransfer = dataTransfer()
    const noopStart = dragEvent('dragstart', noopTransfer)
    const noopOver = dragEvent('dragover', noopTransfer)
    const noopDrop = dragEvent('drop', noopTransfer)
    await act(async () => {
      cards()[0]!.dispatchEvent(noopStart)
      cards()[0]!.dispatchEvent(noopOver)
      cards()[0]!.dispatchEvent(noopDrop)
      cards()[0]!.dispatchEvent(dragEvent('dragend', noopTransfer))
    })
    expect(noopOver.defaultPrevented).toBe(true)
    expect(keys()).toEqual(initialKeys)
    expect(undo.disabled).toBe(true)
    expect(dispatch).not.toHaveBeenCalled()

    for (const payload of [
      '{broken',
      JSON.stringify({ asset: 'frame-animation.other', frameId: initialKeys[0] }),
      JSON.stringify({ asset: 'frame-animation.logo', frameId: 'missing-frame' }),
      '',
    ]) {
      const invalidTransfer = dataTransfer()
      await act(async () => {
        cards()[0]!.dispatchEvent(dragEvent('dragstart', invalidTransfer))
        invalidTransfer.setData('application/x-type-pal-frame-animation-frame', payload)
        invalidTransfer.setData('text/plain', payload)
        cards()[1]!.dispatchEvent(dragEvent('drop', invalidTransfer))
      })
      expect(keys()).toEqual(initialKeys)
      expect(undo.disabled).toBe(true)
    }

    const externalTransfer = dataTransfer()
    externalTransfer.setData(
      'application/x-type-pal-frame-animation-frame',
      JSON.stringify({ asset: 'frame-animation.logo', frameId: initialKeys[0] }),
    )
    const cancelledTransfer = dataTransfer()
    await act(async () => {
      cards()[1]!.dispatchEvent(dragEvent('drop', externalTransfer))
      cards()[0]!.dispatchEvent(dragEvent('dragstart', cancelledTransfer))
      cards()[0]!.dispatchEvent(dragEvent('dragend', cancelledTransfer))
      cards()[2]!.dispatchEvent(dragEvent('drop', cancelledTransfer))
    })
    expect(keys()).toEqual(initialKeys)
    expect(undo.disabled).toBe(true)

    await act(async () => {
      cards()[2]!.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }))
    })
    expect(host.querySelector('.fa-counter')?.textContent).toContain('3 / 3 · 已选 3')

    const transfer = dataTransfer()
    const start = dragEvent('dragstart', transfer)
    const over = dragEvent('dragover', transfer)
    const drop = dragEvent('drop', transfer)
    await act(async () => {
      cards()[0]!.dispatchEvent(start)
      cards()[2]!.dispatchEvent(over)
      cards()[2]!.dispatchEvent(drop)
      cards()[0]!.dispatchEvent(dragEvent('dragend', transfer))
    })
    expect(over.defaultPrevented).toBe(true)
    expect(transfer.effectAllowed).toBe('move')
    expect(transfer.dropEffect).toBe('move')
    expect(JSON.parse(transfer.getData('application/x-type-pal-frame-animation-frame'))).toEqual({
      asset: 'frame-animation.logo',
      frameId: initialKeys[0],
    })
    expect(keys()).toEqual([initialKeys[1], initialKeys[2], initialKeys[0]])
    expect(cards()[2]!.getAttribute('aria-current')).toBe('true')
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

  test('410 帧只挂载可见窗口，并在非对齐横滚后回收旧卡', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const record = catalogControlsAssetCatalog.assets['frame-animation.logo']!
    const onMetadata = vi.fn()
    await act(async () => {
      root.render(
        <FrameAnimationEditor
          asset={{ id: 'frame-animation.window', record }}
          reader={catalogControlsReader}
          assetBase={{} as never}
          session={session}
          onMetadata={onMetadata}
        />,
      )
      await Promise.resolve()
      await Promise.resolve()
    })

    const timeline = host.querySelector<HTMLElement>('.fa-timeline')!
    Object.defineProperty(timeline, 'clientWidth', { configurable: true, value: 600 })
    Object.defineProperty(timeline, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 0,
    })
    await act(async () => timeline.dispatchEvent(new Event('scroll', { bubbles: true })))
    const labels = () =>
      [...host.querySelectorAll<HTMLButtonElement>('button.fa-frame')].map((card) =>
        card.getAttribute('aria-label'),
      )
    expect(frameFixture.sequenceCalls).toEqual(['frame-animation.window'])
    expect(onMetadata).toHaveBeenLastCalledWith(expect.objectContaining({ frameCount: 410 }))
    expect(labels()).toEqual(Array.from({ length: 11 }, (_, index) => `第 ${index + 1} 帧`))
    expect(host.querySelectorAll('.fa-frame-placeholder')).toHaveLength(0)
    expect([...new Set(frameFixture.frameCalls)].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 11 }, (_, index) => index),
    )

    timeline.scrollLeft = 78 * 10 + 39
    await act(async () => {
      timeline.dispatchEvent(new Event('scroll', { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(labels()).toHaveLength(15)
    expect(labels()[0]).toBe('第 8 帧')
    expect(labels().at(-1)).toBe('第 22 帧')
    expect(labels()).not.toContain('第 1 帧')
    expect(labels().length).toBeLessThanOrEqual(Math.ceil(timeline.clientWidth / 78) + 7)
    expect([...new Set(frameFixture.frameCalls)].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 22 }, (_, index) => index),
    )
    expect(frameFixture.frameCalls.length).toBeLessThan(410)
  })

  test('后台操作期间帧卡不可拖拽，dragover 与 drop 都保持零历史', async () => {
    let resolveDecode!: (frames: Array<{ width: number; height: number; rgba: Uint8Array }>) => void
    frameFixture.decodePromise = new Promise((resolve) => {
      resolveDecode = resolve
    })
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

    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File([new Uint8Array([1])], 'frame.png', { type: 'image/png' })],
    })
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))

    const cards = host.querySelectorAll<HTMLButtonElement>('button.fa-frame')
    expect([...cards].every((card) => card.getAttribute('draggable') === 'false')).toBe(true)
    const transfer = dataTransfer()
    const start = dragEvent('dragstart', transfer)
    const over = dragEvent('dragover', transfer)
    await act(async () => {
      cards[0]!.dispatchEvent(start)
      cards[1]!.dispatchEvent(over)
      cards[1]!.dispatchEvent(dragEvent('drop', transfer))
    })
    expect(start.defaultPrevented).toBe(true)
    expect(over.defaultPrevented).toBe(false)
    expect(transfer.dropEffect).toBe('none')
    expect(transfer.getData('application/x-type-pal-frame-animation-frame')).toBe('')
    expect(host.querySelector<HTMLButtonElement>('[aria-label="撤销帧编辑"]')!.disabled).toBe(true)
    expect(dispatch).not.toHaveBeenCalled()
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => {
      frameFixture.decodePromise = null
      resolveDecode([{ width: 1, height: 1, rgba: new Uint8Array([0, 0, 0, 255]) }])
      await Promise.resolve()
      await Promise.resolve()
    })
  })
})
