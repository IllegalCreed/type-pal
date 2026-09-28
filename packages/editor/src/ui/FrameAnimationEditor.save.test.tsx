// @vitest-environment jsdom
import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { animationId, digest, frameEditor, framePixels } from './__tests__/frame-editor-fixture.js'

const black = [0, 0, 0, 255]
const white = [255, 255, 255, 255]

describe('Frame editor real encoding and session save', () => {
  test('saving modified frames publishes one undoable asset with exact hash, durations and reopened pixels', async () => {
    const f = await frameEditor()
    await f.ready()
    vi.stubGlobal('Worker', undefined)
    await f.select(1)
    await f.click('复制选中帧')
    await f.number('当前帧时长（ms）', '95')
    await f.number('全局帧率', '20', true)
    expect(f.latest()?.durationMs).toBe(265)
    f.draftOnly()
    await f.click('保存动画')
    const reopened = await f.saved()
    expect(reopened.frames).toEqual([0, 1, 1, 2].map((index) => [...framePixels[index]!]))
    expect(reopened.index.frames).toEqual([{}, { durationMs: 70 }, { durationMs: 95 }, {}])
    expect(reopened.index.defaultFrameMs).toBe(50)
    expect(reopened.index.colorTreatment).toBe('preserve')
    expect(f.session.getHistoryVersion()).toBe(1)
    expect(f.session.isDirty()).toBe(true)
    expect(f.dirty.mock.lastCall).toEqual([false])
    expect(f.button('撤销帧编辑').disabled).toBe(true)
    const savedState = f.session.getState()
    const record = savedState.assetCatalog.assets[animationId]!
    const bytes = savedState.assetBlobs[record.path]!
    expect(record.path).toBe(`assets/authored/frame-animation/${record.sha256}.tpfs`)
    expect(record.bytes).toBe(bytes.byteLength)
    expect(record.sha256).toBe(await digest(bytes))
    expect(Object.keys(savedState.assetBlobs)).toEqual([record.path])
    await act(async () => {
      expect(f.session.undo()).toBe(true)
    })
    expect(f.session.getState().assetCatalog).toEqual(f.initialState.assetCatalog)
    expect((await f.reopened()).frames).toEqual(framePixels.map((rgba) => [...rgba]))
    await act(async () => {
      expect(f.session.redo()).toBe(true)
    })
    expect((await f.reopened()).frames).toEqual(reopened.frames)
    expect(f.session.getState().assetCatalog.assets[animationId]).toEqual(record)
    f.unchanged()
  })

  test('quantizing the selected frame changes only its saved pixels and marks project-standard color', async () => {
    const f = await frameEditor()
    await f.ready()
    vi.stubGlobal('Worker', undefined)
    await f.select(1)
    await f.click('当前帧贴合标准色彩')
    await f.wait(() => {
      expect(f.latest()?.colorTreatment).toBe('project-standard')
      expect([...f.pixels.get(f.canvas())!]).toEqual([...white, ...black])
    })
    f.draftOnly()
    await f.click('保存动画')
    const saved = await f.saved()
    expect(saved.frames).toEqual([[...framePixels[0]!], [...white, ...black], [...framePixels[2]!]])
    expect(saved.index.colorTreatment).toBe('project-standard')
    expect(saved.index.frames).toEqual([{}, { durationMs: 70 }, {}])
  })

  test('quantize-all publishes every frame through the codec while preserving alpha and per-frame durations', async () => {
    const translucent = new Uint8Array([90, 80, 70, 128, 60, 50, 40, 0])
    const f = await frameEditor({ frames: [framePixels[0]!, framePixels[1]!, translucent] })
    await f.ready()
    vi.stubGlobal('Worker', undefined)
    await f.click('全部贴合')
    await f.wait(() => expect(f.latest()?.colorTreatment).toBe('project-standard'))
    await f.click('保存动画')
    const saved = await f.saved()
    expect(saved.frames).toEqual([
      [...black, ...black],
      [...white, ...black],
      [0, 0, 0, 128, 60, 50, 40, 0],
    ])
    expect(saved.index.frames).toEqual([{}, { durationMs: 70 }, {}])
    expect(saved.index.defaultFrameMs).toBe(40)
  })

  test('the error-diffusion selector reaches the real quantizer instead of retaining nearest-color output', async () => {
    const f = await frameEditor()
    await f.ready()
    vi.stubGlobal('Worker', undefined)
    await f.click('颜色转换方式')
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (node) => node.textContent === '误差扩散',
    )
    expect(option).toBeDefined()
    await act(async () => option!.click())
    await f.click('当前帧贴合标准色彩')
    await f.wait(() => {
      expect(f.latest()?.colorTreatment).toBe('project-standard')
      expect([...f.pixels.get(f.canvas())!]).toEqual([...black, ...white])
    })
    await f.click('保存动画')
    const saved = await f.saved()
    expect(saved.frames[0]).toEqual([...black, ...white])
    expect(saved.frames.slice(1)).toEqual(framePixels.slice(1).map((rgba) => [...rgba]))
  })

  test('source read failure leaves the session and dirty draft intact and the same instance can retry', async () => {
    const f = await frameEditor()
    await f.ready()
    await f.click('复制选中帧')
    const draft = f.snapshot()
    f.io.failure = new Error('save source denied')
    await f.click('保存动画')
    await f.wait(() => expect(f.host.textContent).toContain('save source denied'))
    expect(f.snapshot()).toEqual(draft)
    expect(f.button('保存动画').disabled).toBe(false)
    expect(f.dirty.mock.lastCall).toEqual([true])
    f.draftOnly()
    f.io.failure = undefined
    await f.click('保存动画')
    const saved = await f.saved()
    expect(saved.frames).toEqual([0, 0, 1, 2].map((index) => [...framePixels[index]!]))
    expect(f.host.textContent).not.toContain('save source denied')
  })

  test('encoder failure publishes no asset or undo item; restoring the encoder allows an exact retry', async () => {
    const f = await frameEditor()
    await f.ready()
    vi.stubGlobal('Worker', undefined)
    await f.click('复制选中帧')
    const compression = globalThis.CompressionStream
    vi.stubGlobal(
      'CompressionStream',
      class {
        constructor() {
          throw new Error('frame compression denied')
        }
      },
    )
    await f.click('保存动画')
    await f.wait(() => expect(f.host.textContent).toContain('frame compression denied'))
    f.draftOnly()
    expect(f.dirty.mock.lastCall).toEqual([true])
    expect(f.button('保存动画').disabled).toBe(false)
    vi.stubGlobal('CompressionStream', compression)
    await f.click('保存动画')
    const saved = await f.saved()
    expect(saved.frames).toEqual([0, 0, 1, 2].map((index) => [...framePixels[index]!]))
    expect(f.session.getHistoryVersion()).toBe(1)
    expect(f.host.textContent).not.toContain('frame compression denied')
  })

  test('palette read failure keeps original colors and clears busy so quantization can recover', async () => {
    const f = await frameEditor()
    await f.ready()
    const before = f.snapshot()
    f.io.failure = new Error('palette denied')
    await f.click('全部贴合')
    await f.wait(() => expect(f.host.textContent).toContain('palette denied'))
    expect(f.snapshot()).toEqual(before)
    expect(f.button('全部贴合').disabled).toBe(false)
    f.draftOnly()
    f.io.failure = undefined
    await f.click('全部贴合')
    await f.wait(() => expect(f.latest()?.colorTreatment).toBe('project-standard'))
    await f.click('保存动画')
    expect((await f.saved()).frames).toEqual([
      [...black, ...black],
      [...white, ...black],
      [...black, ...black],
    ])
  })
})
