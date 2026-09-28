// @vitest-environment jsdom
import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { minimalPng } from '../core/__tests__/glm-import-codec-fixtures.js'
import { UpdateAssetLabelCommand } from '../core/asset-label-command.js'
import {
  type FrameAnimationQuantizeRequest,
  quantizeFrameAnimationRequest,
} from '../core/frame-animation-codec.js'
import { animationId, deferred, frameEditor, otherId } from './__tests__/frame-editor-fixture.js'

function workerHost() {
  const workers: QuantizeWorker[] = []
  class QuantizeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: ErrorEvent) => void) | null = null
    message?: { id: number; kind: 'quantize'; request: FrameAnimationQuantizeRequest }
    terminate = vi.fn()
    settled = false
    constructor() {
      workers.push(this)
    }
    postMessage(message: NonNullable<QuantizeWorker['message']>, transfer: Transferable[]) {
      this.message = structuredClone(message, { transfer })
    }
    async reply(error?: string) {
      if (this.settled || !this.message) return
      this.settled = true
      const { id, kind, request } = this.message
      expect(kind).toBe('quantize')
      const data = error ? { id, error } : { id, frames: quantizeFrameAnimationRequest(request) }
      await act(async () => this.onmessage?.(new MessageEvent('message', { data })))
    }
  }
  vi.stubGlobal('Worker', QuantizeWorker)
  return workers
}

function holdSaveHash() {
  const gate = deferred<void>()
  const original = crypto.subtle.digest.bind(crypto.subtle)
  const pending: Promise<ArrayBuffer>[] = []
  let entered = false
  vi.spyOn(crypto.subtle, 'digest').mockImplementation((algorithm, data) => {
    const result = (async () => {
      const hash = await original(algorithm, data)
      entered = true
      await gate.promise
      return hash
    })()
    pending.push(result)
    return result
  })
  return {
    entered: () => entered,
    async release() {
      await act(async () => {
        gate.resolve()
        await Promise.all(pending)
      })
    },
  }
}

function imageHost(f: Awaited<ReturnType<typeof frameEditor>>) {
  const gate = deferred<void>()
  const close = vi.fn()
  const bitmap = { width: 2, height: 1, close } as ImageBitmap
  f.bitmapPixels.set(bitmap, new Uint8ClampedArray(8))
  let failure: Error | undefined
  const decode = vi.fn(async () => {
    await gate.promise
    if (failure) throw failure
    return bitmap
  })
  vi.stubGlobal('createImageBitmap', decode)
  return {
    decode,
    close,
    async start() {
      const input = f.host.querySelector<HTMLInputElement>('input[type="file"]')!
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [new File([minimalPng(2, 1)], 'frame.png', { type: 'image/png' })],
      })
      await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
    },
    async release(error?: Error) {
      failure = error
      await act(async () => {
        gate.resolve()
        await gate.promise
      })
    },
  }
}

describe('Frame editor asynchronous source ownership', () => {
  test('a label edit made during compression survives the asset save and its undo', async () => {
    const f = await frameEditor()
    await f.ready()
    vi.stubGlobal('Worker', undefined)
    await f.click('复制选中帧')
    const hash = holdSaveHash()
    try {
      await f.click('保存动画')
      await f.wait(() => expect(hash.entered()).toBe(true))
      await act(async () => {
        f.session.dispatch(new UpdateAssetLabelCommand(animationId, 'renamed during save'))
      })
      expect(f.session.getState().assetCatalog.assets[animationId]?.label).toBe(
        'renamed during save',
      )
      await hash.release()
      expect((await f.saved()).frames).toHaveLength(4)
      expect(f.session.getState().assetCatalog.assets[animationId]?.label).toBe(
        'renamed during save',
      )
      expect(f.session.getHistoryVersion()).toBe(2)
      await act(async () => {
        expect(f.session.undo()).toBe(true)
      })
      expect(f.session.getState().assetCatalog.assets[animationId]?.label).toBe(
        'renamed during save',
      )
      expect((await f.reopened()).frames).toHaveLength(3)
      f.unchanged()
    } finally {
      await hash.release()
    }
  })

  test('a current image import consumes real decoder output and releases its bitmap', async () => {
    const f = await frameEditor()
    await f.ready()
    const image = imageHost(f)
    try {
      await image.start()
      expect(image.decode).toHaveBeenCalledTimes(1)
      expect(f.button('插入图片').disabled).toBe(true)
      await image.release()
      await f.wait(() => expect(f.latest()?.frameCount).toBe(4))
      expect([...f.pixels.get(f.canvas())!]).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
      expect(image.close).toHaveBeenCalledTimes(1)
      expect(f.button('插入图片').disabled).toBe(false)
      f.draftOnly()
    } finally {
      await image.release()
    }
  })

  test.each([
    'success',
    'failure',
  ] as const)('a late image import %s cannot change the new source', async (outcome) => {
    const f = await frameEditor()
    await f.ready()
    const image = imageHost(f)
    try {
      await image.start()
      expect(image.decode).toHaveBeenCalledTimes(1)
      await f.render(otherId)
      await f.ready()
      const stable = f.snapshot()
      await image.release(outcome === 'failure' ? new Error('obsolete image decode') : undefined)
      expect(f.snapshot()).toEqual(stable)
      expect(f.host.textContent).not.toContain('obsolete image decode')
      expect(f.button('插入图片').disabled).toBe(false)
      expect(image.close).toHaveBeenCalledTimes(outcome === 'success' ? 1 : 0)
      f.draftOnly()
    } finally {
      await image.release()
    }
  })

  test('a late quantizer cannot replace the next asset draft after switching', async () => {
    const f = await frameEditor()
    await f.ready()
    const workers = workerHost()
    try {
      await f.click('全部贴合')
      await f.wait(() => expect(workers).toHaveLength(1))
      await f.render(otherId)
      await f.ready()
      const stable = f.snapshot()
      await workers[0]!.reply()
      expect(workers[0]!.terminate).toHaveBeenCalledTimes(1)
      expect(f.snapshot()).toEqual(stable)
      expect(f.dirty.mock.lastCall).toEqual([false])
      f.draftOnly()
    } finally {
      for (const worker of workers) await worker.reply()
    }
  })

  test('an obsolete failure cannot publish its error or clear the newer operation busy state', async () => {
    const f = await frameEditor()
    await f.ready()
    const workers = workerHost()
    try {
      await f.click('全部贴合')
      await f.wait(() => expect(workers).toHaveLength(1))
      await f.render(otherId)
      await f.ready()
      expect(f.button('全部贴合').disabled).toBe(false)
      await f.click('全部贴合')
      await f.wait(() => expect(workers).toHaveLength(2))
      await workers[0]!.reply('old quantizer failure')
      expect(f.host.textContent).not.toContain('old quantizer failure')
      expect(f.button('全部贴合').disabled).toBe(true)
      await workers[1]!.reply()
      expect(f.latest()).toMatchObject({ frameCount: 2, colorTreatment: 'project-standard' })
      expect(f.button('全部贴合').disabled).toBe(false)
      f.draftOnly()
    } finally {
      for (const worker of workers) await worker.reply()
    }
  })

  test.each([
    'switch',
    'unmount',
  ] as const)('a save finishing after %s cannot publish a discarded asset', async (leave) => {
    const f = await frameEditor()
    await f.ready()
    vi.stubGlobal('Worker', undefined)
    await f.click('复制选中帧')
    const hash = holdSaveHash()
    try {
      await f.click('保存动画')
      await f.wait(() => expect(hash.entered()).toBe(true))
      if (leave === 'switch') {
        await f.render(otherId)
        await f.ready()
      } else await f.unmount()
      await hash.release()
      expect(f.session.getHistoryVersion()).toBe(0)
      f.draftOnly()
      if (leave === 'switch') {
        expect(f.latest()?.frameCount).toBe(2)
        expect(f.dirty.mock.lastCall).toEqual([false])
      }
    } finally {
      await hash.release()
    }
  })

  test('pending save locks draft-changing controls so newer edits cannot be silently overwritten', async () => {
    const f = await frameEditor()
    await f.ready()
    vi.stubGlobal('Worker', undefined)
    await f.click('复制选中帧')
    const hash = holdSaveHash()
    try {
      await f.click('保存动画')
      await f.wait(() => expect(hash.entered()).toBe(true))
      for (const label of ['插入图片', '替换当前帧', '复制选中帧', '删除选中帧'])
        expect(f.button(label).disabled, label).toBe(true)
      expect(
        [...f.host.querySelectorAll<HTMLInputElement>('.fa-edit-bar input')].every(
          (input) => input.disabled,
        ),
      ).toBe(true)
      await f.click('复制选中帧')
      expect(f.latest()?.frameCount).toBe(4)
      await hash.release()
      expect((await f.saved()).frames).toHaveLength(4)
    } finally {
      await hash.release()
    }
  })
})
