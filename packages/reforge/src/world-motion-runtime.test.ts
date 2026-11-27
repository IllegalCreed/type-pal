import type { GridPos } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { WorldMotionRuntime } from './world-motion-runtime.js'

const pos = (col: number, row = 0): GridPos => ({ col, row, height: 0 })

describe('WorldMotionRuntime ownership', () => {
  test('owns the one-tick cadence, carry remainder and frozen-frame reset', () => {
    const motion = new WorldMotionRuntime(100)
    expect(motion.advanceCadence(60, false)).toBe(false)
    expect(motion.worldTick).toBe(0)
    expect(motion.advanceCadence(50, false)).toBe(true)
    expect(motion.worldTick).toBe(1)
    expect(motion.worldTicksThisFrame).toBe(1)
    expect(motion.advanceCadence(1000, true)).toBe(false)
    expect(motion.worldTicksThisFrame).toBe(0)
    expect(motion.advanceCadence(89, false)).toBe(false)
    expect(motion.advanceCadence(1, false)).toBe(true)
    expect(motion.worldTick).toBe(2)
    motion.resetCadence()
    expect(motion.advanceCadence(99, false)).toBe(false)
  })

  test('party move replacement wakes the old waiter while abort rejects only the current waiter', async () => {
    const motion = new WorldMotionRuntime(100)
    const firstSignal = new AbortController()
    const first = motion.schedulePartyMove(pos(3), 'slow', firstSignal.signal)
    const secondSignal = new AbortController()
    const second = motion.schedulePartyMove(pos(7), 'fast', secondSignal.signal)
    await first
    expect(motion.partyMove).toMatchObject({ to: pos(7), speed: 'fast' })

    secondSignal.abort()
    await expect(second).rejects.toMatchObject({ name: 'AbortError' })
    expect(motion.partyMove).toBeNull()
    firstSignal.abort()
  })

  test('party endpoint completion detaches the abort listener before waking its waiter', async () => {
    const motion = new WorldMotionRuntime(100)
    const controller = new AbortController()
    const detach = vi.spyOn(controller.signal, 'removeEventListener')
    const done = motion.schedulePartyMove(pos(2), 'normal', controller.signal)
    const slot = motion.partyMove
    expect(slot).not.toBeNull()
    motion.completePartyMove(slot!)
    await done
    expect(motion.partyMove).toBeNull()
    expect(detach).toHaveBeenCalledOnce()
    controller.abort()
  })

  test('a stalled frame drops backlog beyond one world tick', () => {
    const motion = new WorldMotionRuntime(100)
    // dt=250（≥2×stepMs 的停顿帧）：只走一拍，150 剩余被钳为 0
    expect(motion.advanceCadence(250, false)).toBe(true)
    expect(motion.worldTick).toBe(1)
    expect(motion.worldTicksThisFrame).toBe(1)
    // 余数已丢弃：紧接的 99ms 帧不得提前成拍
    expect(motion.advanceCadence(99, false)).toBe(false)
    expect(motion.worldTick).toBe(1)
    expect(motion.worldTicksThisFrame).toBe(0)
    // 重新积满整步才走下一拍
    expect(motion.advanceCadence(100, false)).toBe(true)
    expect(motion.worldTick).toBe(2)
  })

  test('a replaced party move cannot complete the current move', async () => {
    const motion = new WorldMotionRuntime(100)
    const firstSignal = new AbortController()
    const first = motion.schedulePartyMove(pos(3), 'slow', firstSignal.signal)
    const firstSlot = motion.partyMove
    expect(firstSlot).not.toBeNull()
    const secondSignal = new AbortController()
    const second = motion.schedulePartyMove(pos(7), 'fast', secondSignal.signal)
    await first // 替换即兑现旧等待者（existing-proof 臂的正控）
    const secondSlot = motion.partyMove
    expect(secondSlot).toMatchObject({ to: pos(7), speed: 'fast' })
    let secondSettled = false
    void second.then(() => {
      secondSettled = true
    })
    motion.completePartyMove(firstSlot!) // 陈旧槽：身份守卫必须挡下，不得兑现新等待者
    await Promise.resolve()
    expect(secondSettled).toBe(false)
    expect(motion.partyMove).toBe(secondSlot)
    motion.completePartyMove(secondSlot!) // 当前槽：兑现并清槽
    await second
    expect(secondSettled).toBe(true)
    expect(motion.partyMove).toBeNull()
    firstSignal.abort()
    secondSignal.abort()
  })

  test('stopping the script completes its party move before a late abort', async () => {
    const motion = new WorldMotionRuntime(100)
    const controller = new AbortController()
    const detached = vi.spyOn(controller.signal, 'removeEventListener')
    const moving = motion.schedulePartyMove(pos(5), 'normal', controller.signal)
    expect(motion.partyMove).not.toBeNull()
    motion.resolvePartyMove()
    controller.abort()
    await expect(moving).resolves.toBeUndefined()
    expect(detached).toHaveBeenCalledExactlyOnceWith('abort', expect.any(Function))
    expect(motion.partyMove).toBeNull()
  })
})
