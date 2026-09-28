// @vitest-environment jsdom
import { act } from 'react'
import { describe, expect, test } from 'vitest'
import {
  animationId,
  deferred,
  frameEditor,
  framePixels,
  otherId,
} from './__tests__/frame-editor-fixture.js'

describe('Frame editor real container loading', () => {
  test('formal TPFS produces exact metadata and main plus thumbnail RGBA without editing the project', async () => {
    const f = await frameEditor()
    await f.ready()
    expect(f.latest()).toEqual({
      width: 2,
      height: 1,
      frameCount: 3,
      durationMs: 150,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
    })
    expect([...f.pixels.get(f.canvas())!]).toEqual([...framePixels[0]!])
    expect(f.cards().map((c) => [...f.pixels.get(c.querySelector('canvas')!)!])).toEqual(
      framePixels.map((p) => [...p]),
    )
    expect(f.counter()).toBe('1 / 3')
    expect(f.button('保存动画').disabled).toBe(true)
    expect(f.dirty.mock.lastCall).toEqual([false])
    f.draftOnly()
  })
  test('source rejection is visible with the actual revision and permits switching to a valid asset', async () => {
    const f = await frameEditor({ initialFailure: new Error('frame disk denied') })
    await f.wait(() => expect(f.host.textContent).toContain('frame disk denied'))
    expect(f.host.textContent).toContain(f.catalog.assets[animationId]!.sha256.slice(0, 8))
    expect(f.host.querySelector('.fa-toolbar')).toBeNull()
    f.io.failure = undefined
    await f.render(otherId)
    await f.ready()
    expect(f.latest()?.frameCount).toBe(2)
    expect(f.host.textContent).not.toContain('frame disk denied')
    f.draftOnly()
  })
  test('late old load cannot replace the already rendered newer asset', async () => {
    const gate = deferred<void>()
    const f = await frameEditor({ deferInitial: gate.promise })
    try {
      expect(f.reads).toContain(f.catalog.assets[animationId]!.path)
      expect(f.host.textContent).toContain('正在读取帧动画')
      await f.render(otherId)
      await f.ready()
      const stable = f.snapshot()
      await act(async () => {
        gate.resolve()
        await gate.promise
      })
      await f.ready()
      expect(f.snapshot()).toEqual(stable)
      expect(f.cards().map((c) => c.dataset.frameId)).toEqual([
        `${otherId}\0${0}`,
        `${otherId}\0${1}`,
      ])
      f.draftOnly()
    } finally {
      gate.resolve()
      await act(async () => {
        await gate.promise
      })
    }
  })
  test('unmount during a source read has no late metadata or pixel publication', async () => {
    const gate = deferred<void>()
    const f = await frameEditor({ deferInitial: gate.promise })
    try {
      expect(f.reads).toContain(f.catalog.assets[animationId]!.path)
      await f.unmount()
      const calls = f.metadata.mock.calls.length
      await act(async () => {
        gate.resolve()
        await gate.promise
      })
      expect(f.metadata.mock.calls).toHaveLength(calls)
      expect(f.draws).toHaveLength(0)
      f.draftOnly()
    } finally {
      gate.resolve()
      await act(async () => {
        await gate.promise
      })
    }
  })
  test('switching asset discards only the local frame draft and resets dirty state', async () => {
    const f = await frameEditor()
    await f.ready()
    await f.click('复制选中帧')
    expect(f.latest()?.frameCount).toBe(4)
    expect(f.dirty.mock.lastCall).toEqual([true])
    await f.render(otherId)
    await f.ready()
    expect(f.latest()?.frameCount).toBe(2)
    expect(f.counter()).toBe('1 / 2')
    expect(f.button('撤销帧编辑').disabled).toBe(true)
    expect(f.dirty.mock.lastCall).toEqual([false])
    f.draftOnly()
  })
})
