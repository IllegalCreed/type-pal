// @vitest-environment jsdom
import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { frameEditor, framePixels } from './__tests__/frame-editor-fixture.js'

async function advance(ms: number) {
  await act(async () => vi.advanceTimersByTimeAsync(ms))
}

describe('Frame editor real playback clock', () => {
  test('playback waits each frame duration and loops to the first exact pixels', async () => {
    const f = await frameEditor()
    await f.ready()
    vi.useFakeTimers()
    try {
      await f.click('播放')
      await advance(39)
      expect(f.counter()).toBe('1 / 3')
      await advance(1)
      expect(f.counter()).toBe('2 / 3')
      expect([...f.pixels.get(f.canvas())!]).toEqual([...framePixels[1]!])
      await advance(69)
      expect(f.counter()).toBe('2 / 3')
      await advance(1)
      expect(f.counter()).toBe('3 / 3')
      await advance(40)
      expect(f.counter()).toBe('1 / 3')
      expect([...f.pixels.get(f.canvas())!]).toEqual([...framePixels[0]!])
      expect(f.button('暂停').getAttribute('aria-pressed')).toBe('true')
      f.draftOnly()
    } finally {
      await f.unmount()
      vi.useRealTimers()
    }
  })

  test('non-loop playback holds the last frame and clears its timer after the last duration', async () => {
    const f = await frameEditor()
    await f.ready()
    await f.checkbox('循环')
    await f.click('最后一帧')
    vi.useFakeTimers()
    try {
      await f.click('播放')
      await advance(39)
      expect(f.button('暂停').getAttribute('aria-pressed')).toBe('true')
      await advance(1)
      expect(f.button('播放').getAttribute('aria-pressed')).toBe('false')
      expect(f.counter()).toBe('3 / 3')
      expect(vi.getTimerCount()).toBe(0)
      await advance(1000)
      expect(f.counter()).toBe('3 / 3')
      f.draftOnly()
    } finally {
      await f.unmount()
      vi.useRealTimers()
    }
  })

  test('pause and unmount cancel the actual playback timer with no late frame drawing', async () => {
    const f = await frameEditor()
    await f.ready()
    vi.useFakeTimers()
    try {
      await f.click('播放')
      await advance(20)
      await f.click('暂停')
      expect(vi.getTimerCount()).toBe(0)
      await advance(200)
      expect(f.counter()).toBe('1 / 3')
      await f.click('播放')
      expect(vi.getTimerCount()).toBe(1)
      await f.unmount()
      const draws = f.draws.length
      expect(vi.getTimerCount()).toBe(0)
      await advance(1000)
      expect(f.draws).toHaveLength(draws)
      expect(f.disconnected).toHaveBeenCalled()
      f.draftOnly()
    } finally {
      await f.unmount()
      vi.useRealTimers()
    }
  })
})
