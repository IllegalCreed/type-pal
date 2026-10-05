/**
 * TEST-GLM-REFORGE-MOTION-TRANSITION-1：world-motion-runtime.ts 残余公开合同。
 *
 * 排重结论（逐轴账见 docs/ops/evidence/TEST-GLM-REFORGE-MOTION-TRANSITION-1/dedup-ledger.md）：
 * - cadence 主链（carry 余数、frozen 复位不 aging）由 world-motion-runtime.test.ts:8-22 证明；
 *   本文件只补「真积压钳」臂——旧测最大非冻结 dt 恰为 stepMs，钳行（余数 > stepMs 归零）
 *   从未触达。host 锚点：main.ts 走位循环注释「至多 1 拍/rAF，真积压丢弃(DM31 永不补帧)」。
 * - party 走位替换唤醒旧等待者、abort 只拒绝当前等待者、预中止信号立即拒绝：
 *   world-motion-runtime.test.ts:24-37 / runtime-session-1.test.ts:60-105 existing-proof；
 *   本文件补两条同族残余：被替换旧槽的迟到完成不误伤新等待者（身份守卫）、
 *   abortScript 强停收口（main.ts resolvePartyMove caller）以 fulfilled 兑现悬挂等待者。
 */
import { describe, expect, test } from 'vitest'
import { WorldMotionRuntime } from './world-motion-runtime.js'

const pos = (col: number, row = 0) => ({ col, row, height: 0 })

describe('TEST-GLM-REFORGE-MOTION-TRANSITION-1 world-motion-runtime 残余合同', () => {
  test('MT-CADENCE-CLAMP-1 真积压被钳掉：一帧至多一拍，丢弃的余数不得结转成下一帧的提前拍', () => {
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
    // 对照臂：dt < 2×stepMs 的普通 carry（60+50 → carry 10）仍结转——钳只针对真积压
    const steady = new WorldMotionRuntime(100)
    expect(steady.advanceCadence(60, false)).toBe(false)
    expect(steady.advanceCadence(50, false)).toBe(true)
    expect(steady.advanceCadence(89, false)).toBe(false)
    expect(steady.advanceCadence(1, false)).toBe(true)
    expect(steady.worldTick).toBe(2)
  })

  test('MT-PARTY-COMPLETE-STALE-1 被替换的旧槽迟到完成不得唤醒新等待者；当前槽完成照常兑现', async () => {
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

  test('MT-PARTY-RESOLVE-RELEASE-1 强停收口以 fulfilled 兑现当前在途走位并清槽；结算后迟到 abort 不再改变结果', async () => {
    const motion = new WorldMotionRuntime(100)
    const controller = new AbortController()
    let state: 'pending' | 'fulfilled' | 'rejected' = 'pending'
    void motion.schedulePartyMove(pos(5), 'normal', controller.signal).then(
      () => {
        state = 'fulfilled'
      },
      () => {
        state = 'rejected'
      },
    )
    const slot = motion.partyMove
    expect(slot).not.toBeNull()
    motion.resolvePartyMove() // abortScript（main.ts 强停/读档收口）的兑现路径
    await Promise.resolve()
    await Promise.resolve()
    expect(state).toBe('fulfilled')
    expect(motion.partyMove).toBeNull()
    controller.abort() // 迟到 abort：settled 守卫必须吞掉，不产生二次结算或悬挂拒绝
    await Promise.resolve()
    expect(state).toBe('fulfilled')
    expect(motion.partyMove).toBeNull()
  })
})
