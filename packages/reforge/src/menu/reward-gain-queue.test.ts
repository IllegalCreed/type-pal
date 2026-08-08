import { afterEach, describe, expect, test, vi } from 'vitest'
import { handleRewardGainInput, RewardGainQueue } from './reward-gain-queue.js'

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
})
