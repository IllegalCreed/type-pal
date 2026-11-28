// @vitest-environment jsdom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { dispatchDragEvent, MemoryDataTransfer } from '../__tests__/canvas-test-ports.js'
import { animationId, frameEditor, framePixels } from './__tests__/frame-editor-fixture.js'

const reorderType = 'application/x-type-pal-frame-animation-frame'

describe('帧动画时间轴重排', () => {
  test('整张帧卡 native drag 只写一条草稿历史，稳定帧选择跟随 undo/redo', async () => {
    const f = await frameEditor()
    await f.ready()
    const cards = f.cards()
    const initial = [0, 1, 2].map((index) => `${animationId}\0${index}`)
    const keys = () => f.cards().map((card) => card.dataset.frameId)
    expect(keys()).toEqual(initial)
    expect(cards.map((card) => card.style.left)).toEqual(['0px', '78px', '156px'])
    expect(cards.every((card) => card.draggable)).toBe(true)
    expect(f.host.querySelector('[data-ds-reorder-handle]')).toBeNull()

    await f.select(2, { shiftKey: true })
    const transfer = new MemoryDataTransfer()
    await act(async () => dispatchDragEvent(cards[0]!, 'dragstart', transfer))
    expect(JSON.parse(transfer.getData(reorderType))).toEqual({
      asset: animationId,
      frameId: initial[0],
    })
    await act(async () => {
      dispatchDragEvent(cards[2]!, 'dragover', transfer)
      dispatchDragEvent(cards[2]!, 'drop', transfer)
      dispatchDragEvent(cards[0]!, 'dragend', transfer)
    })
    await f.ready()
    expect(transfer.effectAllowed).toBe('move')
    expect(transfer.dropEffect).toBe('move')
    const moved = [initial[1], initial[2], initial[0]]
    expect(keys()).toEqual(moved)
    expect(f.snapshot().selected).toEqual(moved)
    expect(f.cards()[2]?.getAttribute('aria-current')).toBe('true')
    expect(f.latest()?.durationMs).toBe(150)
    expect([...f.pixels.get(f.canvas())!]).toEqual([...framePixels[0]!])

    await f.click('撤销帧编辑')
    expect(keys()).toEqual(initial)
    expect(f.cards()[0]?.getAttribute('aria-current')).toBe('true')
    expect(f.button('撤销帧编辑').disabled).toBe(true)
    await f.click('重做帧编辑')
    expect(keys()).toEqual(moved)
    expect(f.cards()[2]?.getAttribute('aria-current')).toBe('true')
    expect(f.button('重做帧编辑').disabled).toBe(true)
    f.draftOnly()
  })

  test('same-slot, externally supplied, invalid and canceled drags leave the real draft unchanged', async () => {
    const f = await frameEditor()
    await f.ready()
    const cards = f.cards()
    const original = f.snapshot()
    const keys = () => f.cards().map((card) => card.dataset.frameId)
    const order = keys()
    const valid = JSON.stringify({ asset: animationId, frameId: order[0] })
    const drop = async (
      payload: string,
      options: { start?: boolean; canceled?: boolean; target?: number } = {},
    ) => {
      const transfer = new MemoryDataTransfer()
      await act(async () => {
        if (options.start) dispatchDragEvent(cards[0]!, 'dragstart', transfer)
        if (options.canceled) dispatchDragEvent(cards[0]!, 'dragend', transfer)
        transfer.setData(reorderType, payload)
        transfer.setData('text/plain', payload)
        dispatchDragEvent(cards[options.target ?? 1]!, 'drop', transfer)
      })
      expect(keys()).toEqual(order)
      expect(f.snapshot()).toEqual(original)
      expect(f.button('撤销帧编辑').disabled).toBe(true)
    }

    await drop(valid)
    await drop(valid, { start: true, target: 0 })
    await drop(valid, { start: true, canceled: true })
    for (const payload of [
      '{broken',
      JSON.stringify({ asset: 'frame-animation.other', frameId: order[0] }),
      JSON.stringify({ asset: animationId, frameId: 'missing-frame' }),
      '',
    ])
      await drop(payload, { start: true })
    f.draftOnly()
  })

  test('a drag from outside the current selection adopts only its real frame identity', async () => {
    const f = await frameEditor()
    await f.ready()
    await f.select(1)
    await f.select(2, { shiftKey: true })
    const cards = f.cards()
    const first = cards[0]?.dataset.frameId
    const transfer = new MemoryDataTransfer()
    await act(async () => dispatchDragEvent(cards[0]!, 'dragstart', transfer))
    await act(async () => dispatchDragEvent(cards[2]!, 'drop', transfer))
    expect(f.snapshot().selected).toEqual([first])
    expect(f.cards()[2]?.getAttribute('aria-current')).toBe('true')
    expect(f.cards()[2]?.dataset.frameId).toBe(first)
    f.draftOnly()
  })

  test('410 帧只挂载可见窗口，并在非对齐横滚后回收旧卡', async () => {
    const frames = Array.from({ length: 410 }, (_, i) =>
      Uint8Array.of(i % 256, 20, 42, 255, 20, 42, i % 256, 255),
    )
    const f = await frameEditor({ frameCount: frames.length, frames })
    await f.ready()
    expect(f.latest()?.frameCount).toBe(410)
    const timeline = f.host.querySelector<HTMLElement>('.fa-timeline')
    if (!timeline) throw new Error('Frame timeline is missing')
    const labels = () => f.cards().map((card) => card.getAttribute('aria-label'))
    expect(labels()).toEqual(Array.from({ length: 11 }, (_, index) => `第 ${index + 1} 帧`))

    timeline.scrollLeft = 78 * 10 + 39
    await act(async () => timeline.dispatchEvent(new Event('scroll', { bubbles: true })))
    await f.ready()
    expect(labels()).toEqual(Array.from({ length: 15 }, (_, index) => `第 ${index + 8} 帧`))
    expect([...f.pixels.get(f.cards()[0]!.querySelector('canvas')!)!]).toEqual([...frames[7]!])
    expect(f.draws.length).toBeLessThan(40)
    expect(f.reads.filter((path) => path === f.catalog.assets[animationId]?.path)).toHaveLength(1)
    f.draftOnly()
  })
})
