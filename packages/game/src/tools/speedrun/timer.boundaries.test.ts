/**
 * TEST-GAME-HOST-BOUNDARIES-1 H06/H07：timer 状态机与 detector 边界。
 * 既有 timer.test/detectors.test 已覆盖起停/跳转/PB/香蕉/暂停倒计时/检测种类——不重复。
 * 本文件：同 now 双 tick 不累计、finished 后不累计、justResumed/bestsDirty 二次消费 false、
 * 倒计时精确边界、setStep 合法 idx 清检测记忆、实例间 mem/bests 不串、detector 边界
 * （enterAny 集内转场不触发、tol 相等/+1、prev=null 差异、caiyi 独立 mem）。
 */
import { describe, expect, it } from 'vitest'
import type { ProgressSnapshot } from './snapshot.js'
import {
  atSpot,
  caiyiDetector,
  enterAnyScene,
  enterScene,
  leaveScene,
} from './detectors.js'
import { SpeedrunTimer } from './timer.js'

const BANANA = { scene: 9, cells: [[0, 0]] as ReadonlyArray<readonly [number, number]>, tolX: 8, tolY: 8, itemId: 77 }

function snap(overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return {
    scene: 1,
    canMove: true,
    partyX: 100,
    partyY: 100,
    music: 1,
    inventory: new Set<number>(),
    battle: null,
    ...overrides,
  }
}

const cp = (
  id: string,
  detector: ConstructorParameters<typeof SpeedrunTimer>[0][number]['detector'],
) => ({
  id,
  name: id,
  defaultBestMs: 60_000,
  detector,
})

describe('H06 SpeedrunTimer 边界', () => {
  it('同 now 双 tick 不累计；finished 后不累计；一次性 flag 二次消费 false', () => {
    const timer = new SpeedrunTimer(
      [cp('end', enterScene(5))],
      BANANA,
      {},
    )
    timer.tick(snap(), 1000, { bananaEnabled: false }) // idle→running（scene1 canMove）
    timer.tick(snap({ scene: 5 }), 2000, { bananaEnabled: false }) // 命中 → finished @1000ms
    expect(timer.getRun().phase).toBe('finished')
    expect(timer.getRun().elapsedMs).toBe(1000)
    timer.tick(snap({ scene: 5 }), 2000, { bananaEnabled: false }) // 同 now
    expect(timer.getRun().elapsedMs).toBe(1000)
    timer.tick(snap({ scene: 5 }), 9999, { bananaEnabled: false }) // finished 后不累计
    expect(timer.getRun().elapsedMs).toBe(1000)
    // bestsDirty 一次性
    timer.setBest('end', 500)
    expect(timer.consumeBestsDirty()).toBe(true)
    expect(timer.consumeBestsDirty()).toBe(false)
  })
  it('手动暂停 3 秒倒计时精确边界：2999 未恢复、3000 恢复且恢复帧不计时；justResumed 一次', () => {
    const timer = new SpeedrunTimer([cp('end', enterScene(5))], BANANA, {})
    timer.tick(snap(), 0, { bananaEnabled: false })
    timer.tick(snap(), 1000, { bananaEnabled: false }) // running，elapsed 1000
    timer.toggleManualPause(1000)
    timer.tick(snap(), 2000, { bananaEnabled: false }) // 暂停中不累计
    timer.toggleManualPause(2000) // 起倒计时 end=5000
    timer.tick(snap(), 4999, { bananaEnabled: false }) // 还差 1ms
    expect(timer.getRun().manualPaused).toBe(true)
    expect(timer.getRun().elapsedMs).toBe(1000)
    expect(timer.getCountdownRemainingSec()).toBe(1)
    timer.tick(snap(), 5000, { bananaEnabled: false }) // 到点：恢复 + dt 归零
    expect(timer.getRun().manualPaused).toBe(false)
    expect(timer.getRun().elapsedMs).toBe(1000)
    expect(timer.consumeJustResumed()).toBe(true)
    expect(timer.consumeJustResumed()).toBe(false)
    timer.tick(snap(), 6000, { bananaEnabled: false })
    expect(timer.getRun().elapsedMs).toBe(2000)
  })
  it('setStep 合法 idx 重置检测记忆与暂停；实例间 mem/bests 不串', () => {
    const timer = new SpeedrunTimer(
      [cp('a', enterScene(2)), cp('b', enterScene(3))],
      BANANA,
      { a: 1 },
    )
    timer.tick(snap({ scene: 2 }), 0, { bananaEnabled: false }) // 命中 a
    timer.tick(snap({ scene: 2 }), 100, { bananaEnabled: false })
    expect(timer.getRun().stepIndex).toBe(1)
    timer.setStep(0) // 跳回 0：清 prevSnap/mem → 下帧 prev=null 立即再命中 a
    expect(timer.getRun().stepIndex).toBe(0)
    timer.tick(snap({ scene: 2 }), 200, { bananaEnabled: false })
    expect(timer.getRun().stepIndex).toBe(1)
    // 实例隔离（other 的检测器不触发 → 不进 PB 更新，bests 保持构造值）
    const other = new SpeedrunTimer([cp('z', enterScene(99))], BANANA, { a: 2 })
    other.tick(snap({ scene: 2 }), 0, { bananaEnabled: false })
    expect(other.getRun().phase).toBe('running')
    expect(other.getRun().stepIndex).toBe(0)
    expect(timer.getRun().stepIndex).toBe(1)
    expect(other.getBests()).toEqual({ a: 2 })
    expect(timer.getBests()).toEqual({ a: 1 })
  })
})

describe('H07 detector 边界', () => {
  it('enterAny：集合内转场不触发；从集合外进入触发；prev=null 视为进入', () => {
    const det = enterAnyScene([3, 5])
    expect(det(snap({ scene: 5 }), snap({ scene: 3 }), {})).toBe(false) // 集内转场
    expect(det(snap({ scene: 5 }), snap({ scene: 4 }), {})).toBe(true)
    expect(det(snap({ scene: 3 }), null, {})).toBe(true)
    expect(det(snap({ scene: 4 }), null, {})).toBe(false)
  })
  it('atSpot：tol 相等命中、+1 越界；leaveScene prev=null 恒 false；enterScene prev=null 立即真', () => {
    const det = atSpot(7, 100, 100, 10, 10)
    expect(det(snap({ scene: 7, partyX: 110, partyY: 90 }), null, {})).toBe(true) // 恰等
    expect(det(snap({ scene: 7, partyX: 111, partyY: 90 }), null, {})).toBe(false) // +1
    expect(det(snap({ scene: 8, partyX: 100, partyY: 100 }), null, {})).toBe(false)
    expect(leaveScene(2)(snap({ scene: 3 }), null, {})).toBe(false)
    expect(enterScene(3)(snap({ scene: 3 }), null, {})).toBe(true)
  })
  it('caiyi：未见 boss 前不误报（含战斗结束态）；独立 mem 互不影响', () => {
    const det = caiyiDetector(71)
    const memA: Record<string, unknown> = {}
    const memB: Record<string, unknown> = {}
    const bossBattle = (hp: number) => ({
      enemyIds: new Set([71]),
      totalEnemyHp: hp,
    })
    // 未见过 boss：即便无战斗也不触发
    expect(det(snap({ battle: null }), null, memA)).toBe(false)
    expect(memA.seen).toBeUndefined()
    // 见到 boss（在场）→ 置位但本帧不触发
    expect(det(snap({ battle: bossBattle(500) }), null, memA)).toBe(false)
    expect(memA.seen).toBe(true)
    // 之后战斗消失 → 触发
    expect(det(snap({ battle: null }), null, memA)).toBe(true)
    // cleared 轴：已见后全场血 ≤0 也触发（战斗仍在）
    const memC: Record<string, unknown> = { seen: true }
    expect(det(snap({ battle: bossBattle(0) }), null, memC)).toBe(true)
    // memB 独立：未见过 → 不触发
    expect(det(snap({ battle: null }), null, memB)).toBe(false)
    expect(memB.seen).toBeUndefined()
  })
})
