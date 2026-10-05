import { describe, expect, test, vi } from 'vitest'
import { DeferredTouchTrigger } from './deferred-trigger.js'

interface Point {
  col: number
  row: number
}

const claim = (sceneSessionId = 's001:1') => ({
  sceneSessionId,
  entityId: 'door',
  landingTick: 12,
  landing: { col: 4, row: 7 },
})

/**
 * TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 补充合同：既有 deferred-trigger.test.ts 已证明
 * 单claim占用、stale scene drop、clearEntity 定向清除、disposition drop/hold 与冻结落点事实。
 * 本文件只补两条未证明的公开状态机语义：
 * - clear() 的原子复位（生产 caller：main.ts stopAutoRunners 场景 teardown）；
 * - drain 的 fire 失败收口（'dropped' 且不设 deliveryFence）。
 */
describe('deferred touch trigger (world-lifecycle-1)', () => {
  test('clear() 原子复位未决 claim 与 deliveryFence：teardown 后 auto safe-point 屏障立即解除', () => {
    const pending = new DeferredTouchTrigger<Point>()
    const fire = vi.fn(() => true)
    pending.enqueue(claim())

    // 窗口一：runner 占用时 claim 挂起，teardown 前未交付。
    expect(
      pending.drain({
        sceneSessionId: 's001:1',
        busy: true,
        disposition: () => 'ready',
        fire,
      }),
    ).toBe('held')
    expect(pending.pending).toBe(true)

    // 窗口二：交付已 started，claim 清空但一次性 deliveryFence 仍阻塞 auto safe-point。
    expect(
      pending.drain({
        sceneSessionId: 's001:1',
        busy: false,
        disposition: () => 'ready',
        fire,
      }),
    ).toBe('started')
    expect(fire).toHaveBeenCalledOnce()
    expect(pending.pending).toBe(false)
    expect(pending.blocksAutoSafePoint).toBe(true)

    // main.ts stopAutoRunners() 在切场景 teardown 时调用 clear()。
    pending.clear()
    expect(pending.pending).toBe(false)
    expect(pending.blocksAutoSafePoint).toBe(false)
    expect(
      pending.drain({
        sceneSessionId: 's001:1',
        busy: false,
        disposition: () => 'ready',
        fire,
      }),
    ).toBe('empty')
    expect(fire).toHaveBeenCalledOnce()
  })

  test('fire 失败的落点按 dropped 收口：不设 deliveryFence、不保留 claim、不重试', () => {
    const pending = new DeferredTouchTrigger<Point>()
    const firedTicks: number[] = []
    pending.enqueue(claim())
    expect(
      pending.drain({
        sceneSessionId: 's001:1',
        busy: false,
        disposition: () => 'ready',
        // main.ts 的 fire 重新查找实体并复检 runner；启动失败返回 false。
        fire: (saved) => {
          firedTicks.push(saved.landingTick)
          return false
        },
      }),
    ).toBe('dropped')
    expect(firedTicks).toEqual([12])
    expect(pending.pending).toBe(false)
    expect(pending.blocksAutoSafePoint).toBe(false)
    // 一次性语义：失败的交付不重新入队，下一次 drain 只报 empty。
    expect(
      pending.drain({
        sceneSessionId: 's001:1',
        busy: false,
        disposition: () => 'ready',
        fire: () => true,
      }),
    ).toBe('empty')
  })
})
