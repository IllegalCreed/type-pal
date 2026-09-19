/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 F5-F6：奖励提示队列（menu/reward-gain-queue.ts）。
 * reward-gain-queue.test.ts:9-72 已覆盖固定时长推进/abort 清理——不重复；
 * 本文件补活动期间二次 present 拒绝、空列表/预 abort 零残留、advance/timeout/abort 单次兑现、
 * 旧 timer 不清下一条、current 不泄漏 signal、inactive 输入语义。fake timers 只控制时钟。
 */
import { describe, expect, test, vi } from 'vitest'
import {
  handleRewardGainInput,
  REWARD_GAIN_DURATION_MS,
  RewardGainQueue,
} from './reward-gain-queue.js'

/** 冲刷微任务链（settle→resolve→for 循环推进到下一条），fake timers 下不用 waitFor。 */
const flush = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('F5 活动期间二次 present 与零残留', () => {
  test('活动序列期间二次 present 拒绝；首序列仍可完成（advance 驱动，不用时钟）', async () => {
    const queue = new RewardGainQueue()
    const first = queue.present(['a', 'b'], new AbortController().signal)
    // 拒绝落成值断言（业务红可判别；坏实现下二次序列会真的启动）
    const second = await queue
      .present(['c'], new AbortController().signal)
      .then(
        () => undefined,
        (error: unknown) => error as Error,
      )
    expect(second).toBeInstanceOf(Error)
    expect(second?.message).toContain('reward-gain 已有活动序列')
    expect(queue.current?.text).toBe('a') // 首序列不受影响
    expect(queue.advance()).toBe(true) // 第一条提前完成
    await flush()
    expect(queue.advance()).toBe(true) // 第二条提前完成
    await expect(first).resolves.toBeUndefined()
  })
  test('空列表直接完成、预 abort 拒绝：均无 timer/active 残留', async () => {
    const queue = new RewardGainQueue()
    await expect(queue.present([], new AbortController().signal)).resolves.toBeUndefined()
    expect(queue.active).toBe(false)
    const aborted = new AbortController()
    aborted.abort()
    await expect(queue.present(['x'], aborted.signal)).rejects.toThrow('已取消')
    expect(queue.active).toBe(false)
  })
})

describe('F6 竞争单次兑现与输入语义', () => {
  test('advance 与 timeout 竞争：单次兑现、旧 timer 不清下一条；abort 同样单次', async () => {
    vi.useFakeTimers()
    try {
      const queue = new RewardGainQueue()
      const done = queue.present(['a', 'b'], new AbortController().signal)
      // 第一条：advance 后 timer 不再触发（不重复 settle、不影响第二条时长）
      expect(queue.advance()).toBe(true)
      expect(queue.advance()).toBe(false) // 已兑现：再 advance no-op
      // 第二条成为 current（微任务链后）；旧 timer 的迟到触发不得清掉它
      await flush()
      vi.advanceTimersByTime(REWARD_GAIN_DURATION_MS - 1)
      expect(queue.current?.text).toBe('b') // 旧 timer 迟到未清
      vi.advanceTimersByTime(1)
      await expect(done).resolves.toBeUndefined()
      expect(queue.active).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
  test('abort 与 timeout 竞争单次兑现；current 视图不泄漏内部 signal', async () => {
    vi.useFakeTimers()
    try {
      const queue = new RewardGainQueue()
      const controller = new AbortController()
      const done = queue.present(['only'], controller.signal)
      controller.abort()
      vi.advanceTimersByTime(REWARD_GAIN_DURATION_MS) // 迟到 timeout：不再二次 settle
      await expect(done).rejects.toThrow('已取消')
      expect(queue.active).toBe(false)
      // current 视图只含 text
      const queue2 = new RewardGainQueue()
      const controller2 = new AbortController()
      const pending = queue2.present(['v'], controller2.signal)
      const view = queue2.current
      expect(view).toEqual({ text: 'v' })
      expect(Object.keys(view ?? {})).toEqual(['text'])
      queue2.advance()
      await expect(pending).resolves.toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })
  test('输入语义：Enter/空格消费并推进；Escape 不吞交还外层；其它键消费不推进；inactive 不吞', () => {
    const queue = new RewardGainQueue()
    // inactive：不吞任何输入
    expect(handleRewardGainInput(queue, new Set(['Enter']))).toBe(false)
    const controller = new AbortController()
    const pending = queue.present(['x'], controller.signal)
    expect(handleRewardGainInput(queue, new Set(['Enter']))).toBe(true) // 消费 + 推进
    expect(queue.active).toBe(false)
    void expect(pending).resolves.toBeUndefined()
    // Escape：活动但不推进、不吞（返回 false）
    const controller2 = new AbortController()
    const pending2 = queue.present(['y'], controller2.signal)
    expect(handleRewardGainInput(queue, new Set(['Escape']))).toBe(false)
    expect(queue.current?.text).toBe('y')
    // 其它键：活动即消费（true）但不推进
    expect(handleRewardGainInput(queue, new Set(['ArrowUp']))).toBe(true)
    expect(queue.current?.text).toBe('y')
    controller2.abort()
    void pending2.catch(() => undefined)
  })
})
