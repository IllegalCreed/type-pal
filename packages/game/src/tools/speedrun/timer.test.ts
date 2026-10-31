import { describe, expect, it } from 'vitest'
import type { BananaConfig, Checkpoint } from './checkpoints.js'
import { caiyiDetector, enterScene } from './detectors.js'
import type { ProgressSnapshot } from './snapshot.js'
import { SpeedrunTimer } from './timer.js'

const progressSnapshot = (overrides: Partial<ProgressSnapshot>): ProgressSnapshot => ({
  scene: 0,
  canMove: true,
  partyX: 0,
  partyY: 0,
  music: 0,
  inventory: new Set(),
  battle: null,
  ...overrides,
})

const ROUTE_CHECKPOINTS: Checkpoint[] = [
  { id: 'a', name: 'A', defaultBestMs: 1000, detector: enterScene(2) },
  { id: 'b', name: 'B', defaultBestMs: 2000, detector: enterScene(3) },
]

const BANANA_TREE: BananaConfig = { scene: 177, cells: [[10, 10]], tolX: 0, tolY: 0, itemId: 291 }

const createRouteTimer = (bests = { a: 1000, b: 2000 }): SpeedrunTimer =>
  new SpeedrunTimer(ROUTE_CHECKPOINTS, BANANA_TREE, { ...bests })

const REMOTE_BANANA_TREE: BananaConfig = {
  scene: 9,
  cells: [[0, 0]],
  tolX: 8,
  tolY: 8,
  itemId: 77,
}

function movingSnapshot(overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
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

const checkpoint = (id: string, detector: Checkpoint['detector']) => ({
  id,
  name: id,
  defaultBestMs: 60_000,
  detector,
})

function awayFromBananaSnapshot(): ProgressSnapshot {
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

function checkpointInFirstScene(id: string): Checkpoint {
  return { id, name: `节点${id}`, defaultBestMs: 60_000, detector: enterScene(1) }
}

const NEARBY_BANANA_TREE: BananaConfig = {
  scene: 1,
  cells: [[0, 0]],
  tolX: 1,
  tolY: 1,
  itemId: 999,
}

function createShortRouteTimer(): SpeedrunTimer {
  return new SpeedrunTimer(
    [checkpointInFirstScene('a'), checkpointInFirstScene('b')],
    NEARBY_BANANA_TREE,
    { a: 1000, b: null },
  )
}

describe('SpeedrunTimer 起表与打点', () => {
  it('scene>0 且可移动才起表,之后按 wall-clock 累加', () => {
    const timer = createRouteTimer()
    timer.tick(progressSnapshot({ scene: 0 }), 1000, { bananaEnabled: false })
    expect(timer.getRun().phase).toBe('idle')
    timer.tick(progressSnapshot({ scene: 1 }), 2000, { bananaEnabled: false })
    expect(timer.getRun().phase).toBe('running')
    timer.tick(progressSnapshot({ scene: 1 }), 2500, { bananaEnabled: false })
    expect(timer.getRun().elapsedMs).toBe(500) // 2500-2000
  })
  it('scene>0 但李逍遥不可移动(标题/开场演出/加载/淡入)→ 不起表', () => {
    const timer = createRouteTimer()
    // 场景已预载(scene>0)但 canMove=false:对齐 PalTimer「第一次能控制李逍遥」才起表。
    timer.tick(progressSnapshot({ scene: 1, canMove: false }), 1000, { bananaEnabled: false })
    expect(timer.getRun().phase).toBe('idle')
    timer.tick(progressSnapshot({ scene: 1, canMove: false }), 5000, { bananaEnabled: false })
    expect(timer.getRun().phase).toBe('idle')
    expect(timer.getRun().elapsedMs).toBe(0) // 演出期不计时
    // 李逍遥可移动那一帧才起表
    timer.tick(progressSnapshot({ scene: 1, canMove: true }), 6000, { bananaEnabled: false })
    expect(timer.getRun().phase).toBe('running')
    timer.tick(progressSnapshot({ scene: 1, canMove: true }), 6500, { bananaEnabled: false })
    expect(timer.getRun().elapsedMs).toBe(500)
  })
  it('依序打点,一帧至多推进一个节点', () => {
    const timer = createRouteTimer()
    timer.tick(progressSnapshot({ scene: 1 }), 0, { bananaEnabled: false }) // 起表 nowMs=0
    timer.tick(progressSnapshot({ scene: 2 }), 1000, { bananaEnabled: false }) // 命中 A
    expect(timer.getRun().stepIndex).toBe(1)
    expect(timer.getRun().splits[0]).toBe(1000)
    timer.tick(progressSnapshot({ scene: 3 }), 2000, { bananaEnabled: false }) // 命中 B → finished
    expect(timer.getRun().stepIndex).toBe(2)
    expect(timer.getRun().phase).toBe('finished')
  })
})

describe('SpeedrunTimer setStep(手动跳节点,测试用)', () => {
  it('跳过前面节点,从第 N 个起依序检测', () => {
    const timer = createRouteTimer()
    timer.tick(progressSnapshot({ scene: 1 }), 0, { bananaEnabled: false }) // 起表,stepIndex 0(等 A=enterScene2)
    timer.setStep(1) // 跳到 B(index 1),跳过 A
    expect(timer.getRun().stepIndex).toBe(1)
    expect(timer.getRun().phase).toBe('running')
    expect(timer.getRun().splits[0]).toBeNull() // 跳过的 A 未达成
    timer.tick(progressSnapshot({ scene: 3 }), 1000, { bananaEnabled: false }) // 命中 B → finished
    expect(timer.getRun().stepIndex).toBe(2)
    expect(timer.getRun().splits[1]).toBe(1000)
    expect(timer.getRun().phase).toBe('finished')
  })
  it('已处于目标条件时(prevSnap 重置)下一帧立即命中 = 认"读档已到此"', () => {
    const timer = createRouteTimer()
    timer.tick(progressSnapshot({ scene: 2 }), 0, { bananaEnabled: false }) // 起表 + A 立即命中(enterScene2,prev=null)
    timer.tick(progressSnapshot({ scene: 2 }), 100, { bananaEnabled: false }) // 仍 scene2 → prevSnap 现为 scene2
    timer.setStep(0) // 重新盯 A,prevSnap 重置为 null
    timer.tick(progressSnapshot({ scene: 2 }), 200, { bananaEnabled: false }) // 仍 scene2 但 prev=null → A 再次命中(若不重置 prev 则不会)
    expect(timer.getRun().stepIndex).toBe(1)
  })
  it('finished 后 setStep 回到 running', () => {
    const timer = createRouteTimer()
    timer.tick(progressSnapshot({ scene: 1 }), 0, { bananaEnabled: false })
    timer.tick(progressSnapshot({ scene: 2 }), 1000, { bananaEnabled: false })
    timer.tick(progressSnapshot({ scene: 3 }), 2000, { bananaEnabled: false }) // finished
    expect(timer.getRun().phase).toBe('finished')
    timer.setStep(1)
    expect(timer.getRun().phase).toBe('running')
    expect(timer.getRun().stepIndex).toBe(1)
    expect(timer.getRun().manualPaused).toBe(false)
  })
})

describe('SpeedrunTimer PB 更新', () => {
  it('通关破纪录 → 整条覆盖 bests', () => {
    const timer = createRouteTimer({ a: 5000, b: 9000 }) // 旧 PB 总 9000
    timer.tick(progressSnapshot({ scene: 1 }), 0, { bananaEnabled: false })
    timer.tick(progressSnapshot({ scene: 2 }), 1000, { bananaEnabled: false })
    timer.tick(progressSnapshot({ scene: 3 }), 2000, { bananaEnabled: false }) // 本局总 2000 < 9000
    expect(timer.getBests()).toEqual({ a: 1000, b: 2000 })
    expect(timer.consumeBestsDirty()).toBe(true)
  })
  it('未破纪录 → 不动 bests', () => {
    const timer = createRouteTimer({ a: 100, b: 200 })
    timer.tick(progressSnapshot({ scene: 1 }), 0, { bananaEnabled: false })
    timer.tick(progressSnapshot({ scene: 2 }), 1000, { bananaEnabled: false })
    timer.tick(progressSnapshot({ scene: 3 }), 2000, { bananaEnabled: false }) // 本局 2000 > 200
    expect(timer.getBests()).toEqual({ a: 100, b: 200 })
  })
})

describe('SpeedrunTimer 香蕉暂停 + 拿到直接恢复(无倒计时)', () => {
  it('站到香蕉格暂停;拿香蕉直接恢复,不起倒计时', () => {
    const timer = createRouteTimer()
    timer.tick(progressSnapshot({ scene: 1 }), 0, { bananaEnabled: true }) // 起表
    timer.tick(progressSnapshot({ scene: 177, partyX: 10, partyY: 10 }), 1000, {
      bananaEnabled: true,
    }) // 站香蕉格 → 暂停
    expect(timer.getRun().bananaPaused).toBe(true)
    const before = timer.getRun().elapsedMs
    timer.tick(progressSnapshot({ scene: 177, partyX: 10, partyY: 10 }), 2000, {
      bananaEnabled: true,
    }) // 暂停期不走时
    expect(timer.getRun().elapsedMs).toBe(before)
    timer.tick(
      progressSnapshot({ scene: 177, partyX: 10, partyY: 10, inventory: new Set([291]) }),
      3000,
      {
        bananaEnabled: true,
      },
    ) // 拿香蕉 → 直接恢复
    expect(timer.getRun().bananaPaused).toBe(false)
    expect(timer.getCountdownRemainingSec()).toBeNull() // 香蕉无倒计时
    expect(timer.consumeJustResumed()).toBe(true)
    timer.tick(progressSnapshot({ scene: 50 }), 4000, { bananaEnabled: true }) // 恢复后继续累加(暂停期不计)
    expect(timer.getRun().elapsedMs).toBe(before + 1000) // 仅 3000→4000 的 1000ms
  })
})

describe('SpeedrunTimer 手动操作', () => {
  it('reset 清空本局，保留已有最佳成绩', () => {
    const timer = createRouteTimer()
    timer.tick(progressSnapshot({ scene: 1 }), 0, { bananaEnabled: false })
    timer.tick(progressSnapshot({ scene: 2 }), 1000, { bananaEnabled: false })
    timer.reset()
    expect(timer.getRun().phase).toBe('idle')
    expect(timer.getRun().splits).toEqual([null, null])
    expect(timer.getBests()).toEqual({ a: 1000, b: 2000 })
  })
  it('setBestsFromCurrentRun / clearBests / setBest', () => {
    const timer = createRouteTimer({ a: 9000, b: 9000 })
    timer.tick(progressSnapshot({ scene: 1 }), 0, { bananaEnabled: false })
    timer.tick(progressSnapshot({ scene: 2 }), 1500, { bananaEnabled: false }) // split a=1500
    timer.setBestsFromCurrentRun()
    expect(timer.getBests().a).toBe(1500)
    timer.setBest('b', 4242)
    expect(timer.getBests().b).toBe(4242)
    timer.clearBests()
    expect(timer.getBests()).toEqual({ a: null, b: null })
  })
})

describe('SpeedrunTimer 手动暂停/恢复', () => {
  it('暂停停表;恢复起 3 秒倒计时;到点恢复后继续累加(不计暂停期)', () => {
    const timer = createRouteTimer()
    timer.tick(progressSnapshot({ scene: 1 }), 0, { bananaEnabled: false }) // 起表
    timer.tick(progressSnapshot({ scene: 1 }), 1000, { bananaEnabled: false }) // 累计 1000
    expect(timer.getRun().elapsedMs).toBe(1000)
    timer.toggleManualPause(1000) // 暂停
    expect(timer.getRun().manualPaused).toBe(true)
    timer.tick(progressSnapshot({ scene: 1 }), 3000, { bananaEnabled: false }) // 暂停期不走时
    expect(timer.getRun().elapsedMs).toBe(1000)
    timer.toggleManualPause(3000) // 恢复 → 起 3 秒倒计时
    expect(timer.getCountdownRemainingSec()).toBe(3)
    timer.tick(progressSnapshot({ scene: 1 }), 5000, { bananaEnabled: false }) // 倒计时中,仍停表
    expect(timer.getRun().manualPaused).toBe(true)
    expect(timer.getRun().elapsedMs).toBe(1000)
    timer.tick(progressSnapshot({ scene: 1 }), 6000, { bananaEnabled: false }) // 到点恢复(本帧 dt 归零)
    expect(timer.getRun().manualPaused).toBe(false)
    expect(timer.consumeJustResumed()).toBe(true)
    expect(timer.getRun().elapsedMs).toBe(1000) // 恢复帧不计暂停跨度
    timer.tick(progressSnapshot({ scene: 1 }), 7000, { bananaEnabled: false }) // 恢复后继续
    expect(timer.getRun().elapsedMs).toBe(2000)
  })
  it('倒计时恢复中再切 → 取消恢复,留在暂停', () => {
    const timer = createRouteTimer()
    timer.tick(progressSnapshot({ scene: 1 }), 0, { bananaEnabled: false })
    timer.toggleManualPause(1000) // 暂停
    timer.toggleManualPause(2000) // 起倒计时
    expect(timer.getRun().countdownEndMs).not.toBeNull()
    timer.toggleManualPause(2500) // 取消恢复
    expect(timer.getRun().countdownEndMs).toBeNull()
    expect(timer.getRun().manualPaused).toBe(true)
  })
  it('非 running 态 toggle 无效', () => {
    const timer = createRouteTimer() // idle
    timer.toggleManualPause(1000)
    expect(timer.getRun().manualPaused).toBe(false)
  })
})

describe('Clock boundaries and detector isolation', () => {
  it('running 同 now 双 tick 不累计，finished 后不再累计', () => {
    const timer = new SpeedrunTimer([checkpoint('end', enterScene(5))], REMOTE_BANANA_TREE, {})
    timer.tick(movingSnapshot(), 1000, { bananaEnabled: false }) // idle→running（scene1 canMove）
    timer.tick(movingSnapshot(), 1000, { bananaEnabled: false })
    expect(timer.getRun().elapsedMs).toBe(0)
    timer.tick(movingSnapshot({ scene: 5 }), 2000, { bananaEnabled: false }) // 命中 → finished @1000ms
    expect(timer.getRun().phase).toBe('finished')
    expect(timer.getRun().elapsedMs).toBe(1000)
    timer.tick(movingSnapshot({ scene: 5 }), 2000, { bananaEnabled: false }) // 同 now
    expect(timer.getRun().elapsedMs).toBe(1000)
    timer.tick(movingSnapshot({ scene: 5 }), 9999, { bananaEnabled: false }) // finished 后不累计
    expect(timer.getRun().elapsedMs).toBe(1000)
  })
  it('手动暂停 3 秒倒计时精确边界：2999 未恢复、3000 恢复且恢复帧不计时；justResumed 一次', () => {
    const timer = new SpeedrunTimer([checkpoint('end', enterScene(5))], REMOTE_BANANA_TREE, {})
    timer.tick(movingSnapshot(), 0, { bananaEnabled: false })
    timer.tick(movingSnapshot(), 1000, { bananaEnabled: false }) // running，elapsed 1000
    timer.toggleManualPause(1000)
    timer.tick(movingSnapshot(), 2000, { bananaEnabled: false }) // 暂停中不累计
    timer.toggleManualPause(2000) // 起倒计时 end=5000
    timer.tick(movingSnapshot(), 4999, { bananaEnabled: false }) // 还差 1ms
    expect(timer.getRun().manualPaused).toBe(true)
    expect(timer.getRun().elapsedMs).toBe(1000)
    expect(timer.getCountdownRemainingSec()).toBe(1)
    timer.tick(movingSnapshot(), 5000, { bananaEnabled: false }) // 到点：恢复 + dt 归零
    expect(timer.getRun().manualPaused).toBe(false)
    expect(timer.getRun().elapsedMs).toBe(1000)
    expect(timer.consumeJustResumed()).toBe(true)
    expect(timer.consumeJustResumed()).toBe(false)
    timer.tick(movingSnapshot(), 6000, { bananaEnabled: false })
    expect(timer.getRun().elapsedMs).toBe(2000)
  })
  it('setStep 清手动暂停、倒计时和检测记忆，实例状态不串', () => {
    const timer = new SpeedrunTimer([checkpoint('a', caiyiDetector(71))], REMOTE_BANANA_TREE, {
      a: 1,
    })
    timer.tick(movingSnapshot({ battle: { enemyIds: new Set([71]), totalEnemyHp: 100 } }), 0, {
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
    timer.tick(movingSnapshot({ battle: null }), 100, { bananaEnabled: false })
    expect(timer.getRun().phase).toBe('running')
    expect(timer.getRun().stepIndex).toBe(0)
    const other = new SpeedrunTimer([checkpoint('a', enterScene(99))], REMOTE_BANANA_TREE, { a: 2 })
    other.tick(movingSnapshot({ scene: 99 }), 0, { bananaEnabled: false })
    expect(other.getRun().phase).toBe('finished')
    expect(timer.getRun().phase).toBe('running')
    expect(timer.getBests()).toEqual({ a: 1 })
    expect(other.getBests()).toEqual({ a: 0 })
  })
})

describe('Countdown queries and best-time notifications', () => {
  it('getCountdownRemainingSec：无倒计时或无主时钟返回 null，剩余秒向上取整，到点清除', () => {
    const timer = createShortRouteTimer()
    expect(timer.getCountdownRemainingSec()).toBeNull() // 无倒计时
    const unclocked = createShortRouteTimer()
    unclocked.setStep(0)
    unclocked.toggleManualPause(10_000)
    unclocked.toggleManualPause(10_000)
    expect(unclocked.getRun().countdownEndMs).toBe(13_000)
    expect(unclocked.getCountdownRemainingSec()).toBeNull() // 有倒计时但从未 tick
    // setStep 进入 running；两段式手动暂停：一按停表、再按起 3 秒倒计时（恢复窗口）
    timer.setStep(0)
    timer.tick(awayFromBananaSnapshot(), 10_000, { bananaEnabled: true })
    timer.toggleManualPause(10_000)
    expect(timer.getRun().manualPaused).toBe(true)
    expect(timer.getRun().countdownEndMs).toBeNull() // 一按只停表
    timer.toggleManualPause(10_000)
    expect(timer.getRun().countdownEndMs).toBe(13_000)
    timer.tick(awayFromBananaSnapshot(), 10_500, { bananaEnabled: true })
    expect(timer.getCountdownRemainingSec()).toBe(3) // ceil(2500/1000)
    timer.tick(awayFromBananaSnapshot(), 13_000, { bananaEnabled: true }) // ≥ endMs → 恢复并清倒计时
    expect(timer.getRun().countdownEndMs).toBeNull()
    expect(timer.getRun().manualPaused).toBe(false)
    expect(timer.getCountdownRemainingSec()).toBeNull()
  })
  it('consumeBestsDirty：成绩变更只消费一次', () => {
    const timer = createShortRouteTimer()
    expect(timer.consumeBestsDirty()).toBe(false)
    timer.setBest('a', 500)
    expect(timer.consumeBestsDirty()).toBe(true)
    expect(timer.consumeBestsDirty()).toBe(false) // 一次性
    timer.clearBests()
    expect(timer.getBests()).toEqual({ a: null, b: null })
    expect(timer.consumeBestsDirty()).toBe(true)
  })
})
