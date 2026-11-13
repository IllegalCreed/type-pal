// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest'
import { menuAssets } from '../__tests__/glm-runtime-resource/menu-draw-fixtures.js'
import { expectDefined } from '../defined.js'
import type { BoxTiles } from './menu-box.js'
import { drawRewardGainLine } from './reward-gain.js'
import { handleRewardGainInput, RewardGainQueue } from './reward-gain-queue.js'

function scrollTile(width: number, height: number): ImageBitmap {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#a29679'
  ctx.fillRect(0, 0, width, height)
  return Object.assign(canvas, { close() {} })
}

describe('D14-3 · reward-gain queue', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('无输入时每条固定展示 1400ms，并按原顺序自动推进', async () => {
    vi.useFakeTimers()
    const queue = new RewardGainQueue()
    const done = queue.present(['炼出 赤血蚕', '炼成 灵葫仙丹'], new AbortController().signal)

    expect(queue.current?.text).toBe('炼出 赤血蚕')
    await vi.advanceTimersByTimeAsync(1399)
    expect(queue.current?.text).toBe('炼出 赤血蚕')
    await vi.advanceTimersByTimeAsync(1)
    expect(queue.current?.text).toBe('炼成 灵葫仙丹')
    await vi.advanceTimersByTimeAsync(1400)

    await expect(done).resolves.toBeUndefined()
    expect(queue.active).toBe(false)
    expect(queue.current).toBeUndefined()
  })

  test('Enter / Space 每次只跳当前条，后续条继续且按键不会漏出模态分支', async () => {
    vi.useFakeTimers()
    const queue = new RewardGainQueue()
    const done = queue.present(['第一条', '第二条', '第三条'], new AbortController().signal)

    expect(handleRewardGainInput(queue, new Set(['Enter']))).toBe(true)
    await Promise.resolve()
    expect(queue.current?.text).toBe('第二条')

    expect(handleRewardGainInput(queue, new Set([' ']))).toBe(true)
    await Promise.resolve()
    expect(queue.current?.text).toBe('第三条')

    expect(handleRewardGainInput(queue, new Set(['Enter']))).toBe(true)
    await expect(done).resolves.toBeUndefined()
    expect(queue.active).toBe(false)
    expect(handleRewardGainInput(queue, new Set(['Enter']))).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  test('Esc 不跳过也不被模态层吞掉，保留给外层关闭 / 菜单语义', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const queue = new RewardGainQueue()
    const done = queue.present(['当前条'], controller.signal)

    expect(handleRewardGainInput(queue, new Set(['Escape']))).toBe(false)
    expect(queue.current?.text).toBe('当前条')

    controller.abort()
    await expect(done).rejects.toMatchObject({ name: 'AbortError' })
  })

  test('非跳过键仍由模态层消费，但不提前完成当前条', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const queue = new RewardGainQueue()
    const done = queue.present(['当前条'], controller.signal)

    expect(handleRewardGainInput(queue, new Set(['ArrowRight']))).toBe(true)
    expect(queue.current?.text).toBe('当前条')

    controller.abort()
    await expect(done).rejects.toMatchObject({ name: 'AbortError' })
  })

  test('AbortSignal 取消当前序列时清理 current、timer 与 resolver', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const queue = new RewardGainQueue()
    const done = queue.present(['第一条', '第二条'], controller.signal)

    controller.abort()

    await expect(done).rejects.toMatchObject({ name: 'AbortError' })
    expect(queue.active).toBe(false)
    expect(queue.current).toBeUndefined()
    expect(queue.advance()).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  test('正式拾取提示在浅底卷轴上绘制黑字，字形相邻像素没有阴影', async () => {
    const queue = new RewardGainQueue()
    const done = queue.present(['获得净衣符'], new AbortController().signal)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 200
      const ctx = canvas.getContext('2d')!
      const menu = menuAssets()
      const scroll: BoxTiles = {
        tiles: [4, 26, 4].flatMap((height) => [8, 16, 8].map((width) => scrollTile(width, height))),
      }
      const cp = 0x83b7 // 获
      const bitmap = new Uint8Array(32)
      bitmap[0] = 0x80
      const glyph = { width: 16, height: 16, bitmap }
      const glyphs = {
        has: (codepoint: number) => codepoint === cp,
        get: (codepoint: number) => (codepoint === cp ? glyph : undefined),
      }

      // main.ts 的世界绘制读取当前提示，在 96 处画卷轴。
      drawRewardGainLine(ctx, { ...menu, scroll }, glyphs, expectDefined(queue.current).text, 96)
      const rgb = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data]
      expect(rgb(128, 106)).toEqual([0, 0, 0, 255])
      expect([rgb(129, 106), rgb(128, 107), rgb(129, 107)]).toEqual(
        Array.from({ length: 3 }, () => [162, 150, 121, 255]),
      )
    } finally {
      queue.advance()
      await done
    }
  })
})
