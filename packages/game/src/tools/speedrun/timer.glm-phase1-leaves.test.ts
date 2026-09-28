/**
 * TEST-GLM-PHASE1-LEAVES-3 L20（timer.ts）— 去重表：
 *  - timer.test + timer.boundaries.test（起表门/依序打点/PB/香蕉暂停/3 秒倒计时/finished/
 *    双 tick 不累计/恢复精确边界/setStep/检测器边界）→ 不重复
 *  - 新差异：getCountdownRemainingSec 的 null 双来源（无倒计时 / 无主时钟）与 ceil 语义、
 *    consumeBestsDirty 一次性读（setBest/clearBests/setBestsFromCurrentRun 置位）、
 *    reset 保留 bests 只清本局。
 */
import { describe, expect, it } from 'vitest'
import type { BananaConfig, Checkpoint } from './checkpoints.js'
import { enterScene } from './detectors.js'
import type { ProgressSnapshot } from './snapshot.js'
import { SpeedrunTimer } from './timer.js'

function snap(): ProgressSnapshot {
  return {
    scene: 1,
    canMove: true,
    partyX: 9999,
    partyY: 9999,
    music: 0,
    inventory: new Set<number>(),
    battle: null,
  }
}

function mkCheckpoint(id: string): Checkpoint {
  return { id, name: `节点${id}`, defaultBestMs: 60_000, detector: enterScene(1) }
}

const BANANA: BananaConfig = { scene: 1, cells: [[0, 0]], tolX: 1, tolY: 1, itemId: 999 }

function mkTimer(): SpeedrunTimer {
  return new SpeedrunTimer([mkCheckpoint('a'), mkCheckpoint('b')], BANANA, { a: 1000, b: null })
}

describe('L20 SpeedrunTimer 剩余合同', () => {
  it('getCountdownRemainingSec：无倒计时/无主时钟 → null；有 → ceil 剩余秒，到点 0', () => {
    const t = mkTimer()
    expect(t.getCountdownRemainingSec()).toBeNull() // 无倒计时
    expect(t.getCountdownRemainingSec()).toBeNull() // 无主时钟（从未 tick）
    // setStep 进入 running；两段式手动暂停：一按停表、再按起 3 秒倒计时（恢复窗口）
    t.setStep(0)
    t.tick(snap(), 10_000, { bananaEnabled: true })
    t.toggleManualPause(10_000)
    expect(t.getRun().manualPaused).toBe(true)
    expect(t.getRun().countdownEndMs).toBeNull() // 一按只停表
    t.toggleManualPause(10_000)
    expect(t.getRun().countdownEndMs).toBe(13_000)
    t.tick(snap(), 10_500, { bananaEnabled: true })
    expect(t.getCountdownRemainingSec()).toBe(3) // ceil(2500/1000)
    t.tick(snap(), 13_000, { bananaEnabled: true }) // ≥ endMs → 恢复并清倒计时
    expect(t.getRun().countdownEndMs).toBeNull()
    expect(t.getRun().manualPaused).toBe(false)
    expect(t.getCountdownRemainingSec()).toBeNull()
  })

  it('consumeBestsDirty 一次性读；reset 保留 bests 只清本局', () => {
    const t = mkTimer()
    expect(t.consumeBestsDirty()).toBe(false)
    t.setBest('a', 500)
    expect(t.consumeBestsDirty()).toBe(true)
    expect(t.consumeBestsDirty()).toBe(false) // 一次性
    t.clearBests()
    expect(t.getBests()).toEqual({ a: null, b: null })
    expect(t.consumeBestsDirty()).toBe(true)
    // reset：本局清零（phase/splits），bests 保留
    t.setStep(0)
    t.tick(snap(), 1000, { bananaEnabled: true })
    t.reset()
    expect(t.getRun().phase).toBe('idle')
    expect(t.getRun().splits).toEqual([null, null])
    expect(Object.keys(t.getBests())).toEqual(['a', 'b'])
  })
})
