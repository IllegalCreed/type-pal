// @vitest-environment jsdom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { dispatchDragEvent, MemoryDataTransfer } from '../__tests__/canvas-test-ports.js'
import { waitForReact } from '../__tests__/react-io-wait.js'
import { installCutsceneTestHost } from './__tests__/cutscene-test-host.js'
import { buttonByLabel, deferred, loadFilesIntoInput } from './__tests__/glm-ui-wave-kit.js'
import { pngFileOf, pngRgba, solidRgba } from './__tests__/kimi-editor-workflows/kit.js'

const { host, mountTab } = installCutsceneTestHost()
const frames = [
  solidRgba(2, 1, [220, 40, 0, 255]),
  solidRgba(2, 1, [20, 180, 20, 255]),
  solidRgba(2, 1, [70, 80, 220, 255]),
]
const cyan = [20, 180, 220, 255] as const
const magenta = [220, 100, 195, 255] as const
const frameId = 'frame-animation.logo'

function cards() {
  return [...host.querySelectorAll<HTMLButtonElement>('.fa-frame')]
}
function pixels(card: HTMLButtonElement) {
  const canvas = card.querySelector('canvas')
  if (!canvas) throw new Error('Missing frame canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No frame canvas context')
  return [...context.getImageData(0, 0, 2, 1).data]
}
function imagesFileInput() {
  const field = host.querySelector<HTMLInputElement>('.fa-editor input[type="file"][multiple]')
  if (!field) throw new Error('Missing frame import field')
  return field
}
async function openAnimation() {
  const clientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')?.get
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
    return this.classList.contains('fa-timeline') ? 624 : (clientWidth?.call(this) ?? 0)
  })
  const mounted = await mountTab({
    focus: frameId,
    animations: [
      {
        id: frameId,
        label: '徽标',
        width: 2,
        height: 1,
        defaultFrameMs: 40,
        frames,
      },
    ],
  })
  await waitForReact(() => {
    expect(cards()).toHaveLength(3)
    expect(pixels(cards()[2]!)).toEqual([...frames[2]!])
  })
  return mounted
}

describe('帧动画草稿插入 PNG', () => {
  test.each([
    { index: 0, input: [cyan, magenta] },
    { index: 2, input: [cyan] },
  ])('inserts decoded pixels after frame $index while retaining other IDs and duration through undo/redo', async ({
    index,
    input,
  }) => {
    const { session } = await openAnimation()
    const original = cards().map((card) => card.dataset.frameId)
    const draftPixels = input.map((color) => solidRgba(2, 1, color))
    await act(async () => cards()[index]!.click())
    const pngs = draftPixels.map((rgba, i) => pngFileOf(`frame-${i}.png`, pngRgba(2, 1, rgba)))
    await loadFilesIntoInput(imagesFileInput(), pngs)
    const expected = [
      ...frames.slice(0, index + 1),
      ...draftPixels,
      ...frames.slice(index + 1),
    ].map((rgba) => [...rgba])
    await waitForReact(() => expect(cards().map(pixels)).toEqual(expected))
    const ids = cards().map((card) => card.dataset.frameId)
    expect(ids.filter((id) => original.includes(id))).toEqual(original)
    expect(ids[index + 1]).not.toBe(original[index])
    expect(cards()[index + 1]?.getAttribute('aria-current')).toBe('true')
    expect(host.querySelector('.fa-timeline-head')?.textContent).toContain(
      input.length === 2 ? '0.20 秒' : '0.16 秒',
    )

    await act(async () => buttonByLabel(host, '撤销帧编辑').click())
    await waitForReact(() => expect(cards().map(pixels)).toEqual(frames.map((rgba) => [...rgba])))
    expect(cards().map((card) => card.dataset.frameId)).toEqual(original)
    await act(async () => buttonByLabel(host, '重做帧编辑').click())
    await waitForReact(() => expect(cards().map(pixels)).toEqual(expected))
    expect(cards().map((card) => card.dataset.frameId)).toEqual(ids)
    expect(session.getHistoryVersion()).toBe(0)
  })

  test('cannot reorder while an actual PNG decode owns the draft', async () => {
    const { session } = await openAnimation()
    const initial = cards().map((card) => card.dataset.frameId)
    const decode = globalThis.createImageBitmap
    const gate = deferred<void>()
    vi.spyOn(globalThis, 'createImageBitmap').mockImplementation(async (blob) => {
      await gate.promise
      return decode(blob)
    })
    const rgba = solidRgba(2, 1, cyan)
    try {
      await loadFilesIntoInput(imagesFileInput(), [pngFileOf('hold.png', pngRgba(2, 1, rgba))])
      await waitForReact(() =>
        expect(host.querySelector('.fa-status')?.textContent).toBe('正在读取完整帧…'),
      )
      const transfer = new MemoryDataTransfer()
      await act(async () => {
        dispatchDragEvent(cards()[0]!, 'dragstart', transfer)
        dispatchDragEvent(cards()[2]!, 'dragover', transfer)
        dispatchDragEvent(cards()[2]!, 'drop', transfer)
      })
      expect(cards().map((card) => card.dataset.frameId)).toEqual(initial)
      expect(cards().every((card) => !card.draggable)).toBe(true)
      expect(transfer.dropEffect).toBe('none')
      expect(buttonByLabel(host, '撤销帧编辑').disabled).toBe(true)
    } finally {
      await act(async () => gate.resolve())
    }
    await waitForReact(() =>
      expect(cards().map(pixels)).toEqual(
        [frames[0]!, rgba, ...frames.slice(1)].map((value) => [...value]),
      ),
    )
    expect(session.getHistoryVersion()).toBe(0)
  })
})
