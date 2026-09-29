// @vitest-environment jsdom
/**
 * TEST-GLM-NEW-F-1 F02b：FrameAnimationEditor 播放中的选择切换时钟重锚。
 * 去重：loading/editing/playback/reorder/async-ownership 六份旧测已证加载失败族、
 * 选择稳定性、复制/删除、纯播放时钟（每帧时长、循环、暂停清 timer）与拖拽重排；
 * 本文件只补其间空隙：播放进行中点击其它帧格——时钟从被点帧自身时长重锚、
 * 播放不中断、单选 echo 收敛到被点帧。
 */
import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { frameEditor, framePixels } from './__tests__/frame-editor-fixture.js'

async function advance(ms: number): Promise<void> {
  await act(async () => vi.advanceTimersByTimeAsync(ms))
}

describe('F02 FrameAnimationEditor 播放中选择切换', () => {
  test('播放中点击第 3 帧以该帧时长重锚时钟并保持播放，随后循环回第 1 帧', async () => {
    const f = await frameEditor()
    await f.ready()
    vi.useFakeTimers()
    try {
      // 先多选 1、2 帧（echo 含「已选 2」）；播放计时按当前选中帧自身的 70ms 时长走。
      await f.select(1, { shiftKey: true })
      expect(f.counter()).toBe('2 / 3 · 已选 2')
      await f.click('播放')
      await advance(69)
      expect(f.counter()).toBe('2 / 3 · 已选 2')
      await advance(1)
      expect(f.counter()).toBe('3 / 3')
      expect(f.button('暂停').getAttribute('aria-pressed')).toBe('true')
      // 播放中点击第 3 帧：时钟以该帧 40ms 时长重锚，播放不中断、单选收敛。
      await f.select(2)
      expect(f.counter()).toBe('3 / 3')
      const selected = f.cards().filter((card) => card.getAttribute('aria-pressed') === 'true')
      expect(selected).toHaveLength(1)
      expect(selected[0]?.getAttribute('aria-label')).toBe('第 3 帧')
      expect(f.button('暂停').getAttribute('aria-pressed')).toBe('true')
      await advance(39)
      expect(f.counter()).toBe('3 / 3')
      await advance(1)
      expect(f.counter()).toBe('1 / 3')
      expect([...f.pixels.get(f.canvas())!]).toEqual([...framePixels[0]!])
      // 暂停后计时器清零，不再推进。
      await f.click('暂停')
      expect(vi.getTimerCount()).toBe(0)
      await advance(200)
      expect(f.counter()).toBe('1 / 3')
      f.draftOnly()
    } finally {
      await f.unmount()
      vi.useRealTimers()
    }
  })
})
