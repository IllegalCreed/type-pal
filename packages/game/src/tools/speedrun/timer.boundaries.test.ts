/**
 * H06 timer 的时钟、恢复边界与 setStep 状态隔离。
 * 原 H07 detector 合同归入 detectors.test.ts 的对应工厂用例；本文件只测真实 timer。
 * bestsDirty 二次消费归 timer.glm-phase1-leaves.test.ts，不重复 setBest 的相同断言。
 */
import { describe, expect, it } from 'vitest'
import { caiyiDetector, enterScene } from './detectors.js'
import type { ProgressSnapshot } from './snapshot.js'
import { SpeedrunTimer } from './timer.js'

const BANANA = {
  scene: 9,
  cells: [[0, 0]] as ReadonlyArray<readonly [number, number]>,
  tolX: 8,
  tolY: 8,
  itemId: 77,
}

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
  it('running 同 now 双 tick 不累计，finished 后不再累计', () => {
    const timer = new SpeedrunTimer([cp('end', enterScene(5))], BANANA, {})
    timer.tick(snap(), 1000, { bananaEnabled: false }) // idle→running（scene1 canMove）
    timer.tick(snap(), 1000, { bananaEnabled: false })
    expect(timer.getRun().elapsedMs).toBe(0)
    timer.tick(snap({ scene: 5 }), 2000, { bananaEnabled: false }) // 命中 → finished @1000ms
    expect(timer.getRun().phase).toBe('finished')
    expect(timer.getRun().elapsedMs).toBe(1000)
    timer.tick(snap({ scene: 5 }), 2000, { bananaEnabled: false }) // 同 now
    expect(timer.getRun().elapsedMs).toBe(1000)
    timer.tick(snap({ scene: 5 }), 9999, { bananaEnabled: false }) // finished 后不累计
    expect(timer.getRun().elapsedMs).toBe(1000)
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
  it('setStep 清手动暂停、倒计时和检测记忆，实例状态不串', () => {
    const timer = new SpeedrunTimer([cp('a', caiyiDetector(71))], BANANA, { a: 1 })
    timer.tick(snap({ battle: { enemyIds: new Set([71]), totalEnemyHp: 100 } }), 0, {
      bananaEnabled: false,
    })
    timer.toggleManualPause(0)
    timer.toggleManualPause(0)
    expect(timer.getRun().manualPaused).toBe(true)
    expect(timer.getRun().countdownEndMs).toBe(3000)
    timer.setStep(0)
    expect(timer.getRun().manualPaused).toBe(false)
    expect(timer.getRun().countdownEndMs).toBeNull()
    // 若未清 seen 记忆，boss 消失会在这里错误完成节点。
    timer.tick(snap({ battle: null }), 100, { bananaEnabled: false })
    expect(timer.getRun().phase).toBe('running')
    expect(timer.getRun().stepIndex).toBe(0)
    const other = new SpeedrunTimer([cp('a', enterScene(99))], BANANA, { a: 2 })
    other.tick(snap({ scene: 99 }), 0, { bananaEnabled: false })
    expect(other.getRun().phase).toBe('finished')
    expect(timer.getRun().phase).toBe('running')
    expect(timer.getBests()).toEqual({ a: 1 })
    expect(other.getBests()).toEqual({ a: 0 })
  })
})
