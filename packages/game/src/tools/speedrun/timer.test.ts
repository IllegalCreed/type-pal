// timer.test.ts
import { describe, expect, it } from 'vitest'
import type { BananaConfig, Checkpoint } from './checkpoints.js'
import { enterScene } from './detectors.js'
import type { ProgressSnapshot } from './snapshot.js'
import { SpeedrunTimer } from './timer.js'

const snap = (o: Partial<ProgressSnapshot>): ProgressSnapshot => ({
  scene: 0, partyX: 0, partyY: 0, music: 0, inventory: new Set(), battle: null, ...o,
})
const CPS: Checkpoint[] = [
  { id: 'a', name: 'A', defaultBestMs: 1000, detector: enterScene(2) },
  { id: 'b', name: 'B', defaultBestMs: 2000, detector: enterScene(3) },
]
const BAN: BananaConfig = { scene: 177, cells: [[10, 10]], tolX: 0, tolY: 0, itemId: 291 }
const mk = (bests = { a: 1000, b: 2000 }): SpeedrunTimer => new SpeedrunTimer(CPS, BAN, { ...bests })

describe('SpeedrunTimer 起表与打点', () => {
  it('scene>0 才起表,之后按 wall-clock 累加', () => {
    const t = mk()
    t.tick(snap({ scene: 0 }), 1000, { bananaEnabled: false })
    expect(t.getRun().phase).toBe('idle')
    t.tick(snap({ scene: 1 }), 2000, { bananaEnabled: false })
    expect(t.getRun().phase).toBe('running')
    t.tick(snap({ scene: 1 }), 2500, { bananaEnabled: false })
    expect(t.getRun().elapsedMs).toBe(500) // 2500-2000
  })
  it('依序打点,一帧至多推进一个节点', () => {
    const t = mk()
    t.tick(snap({ scene: 1 }), 0, { bananaEnabled: false }) // 起表 t=0
    t.tick(snap({ scene: 2 }), 1000, { bananaEnabled: false }) // 命中 A
    expect(t.getRun().stepIndex).toBe(1)
    expect(t.getRun().splits[0]).toBe(1000)
    t.tick(snap({ scene: 3 }), 2000, { bananaEnabled: false }) // 命中 B → finished
    expect(t.getRun().stepIndex).toBe(2)
    expect(t.getRun().phase).toBe('finished')
  })
})

describe('SpeedrunTimer PB 更新', () => {
  it('通关破纪录 → 整条覆盖 bests', () => {
    const t = mk({ a: 5000, b: 9000 }) // 旧 PB 总 9000
    t.tick(snap({ scene: 1 }), 0, { bananaEnabled: false })
    t.tick(snap({ scene: 2 }), 1000, { bananaEnabled: false })
    t.tick(snap({ scene: 3 }), 2000, { bananaEnabled: false }) // 本局总 2000 < 9000
    expect(t.getBests()).toEqual({ a: 1000, b: 2000 })
    expect(t.consumeBestsDirty()).toBe(true)
  })
  it('未破纪录 → 不动 bests', () => {
    const t = mk({ a: 100, b: 200 })
    t.tick(snap({ scene: 1 }), 0, { bananaEnabled: false })
    t.tick(snap({ scene: 2 }), 1000, { bananaEnabled: false })
    t.tick(snap({ scene: 3 }), 2000, { bananaEnabled: false }) // 本局 2000 > 200
    expect(t.getBests()).toEqual({ a: 100, b: 200 })
  })
})

describe('SpeedrunTimer 香蕉暂停 + 3 秒倒计时', () => {
  it('站到香蕉格暂停;拿香蕉起 3 秒倒计时;到点恢复', () => {
    const t = mk()
    t.tick(snap({ scene: 1 }), 0, { bananaEnabled: true }) // 起表
    t.tick(snap({ scene: 177, partyX: 10, partyY: 10 }), 1000, { bananaEnabled: true }) // 站香蕉格 → 暂停
    expect(t.getRun().bananaPaused).toBe(true)
    const before = t.getRun().elapsedMs
    t.tick(snap({ scene: 177, partyX: 10, partyY: 10 }), 2000, { bananaEnabled: true }) // 暂停期不走时
    expect(t.getRun().elapsedMs).toBe(before)
    t.tick(snap({ scene: 177, partyX: 10, partyY: 10, inventory: new Set([291]) }), 2000, { bananaEnabled: true }) // 拿香蕉
    expect(t.getCountdownRemainingSec()).toBe(3)
    t.tick(snap({ scene: 177, partyX: 0, partyY: 0 }), 4000, { bananaEnabled: true }) // 倒计时中(剩 1s)
    expect(t.getRun().bananaPaused).toBe(true)
    expect(t.getCountdownRemainingSec()).toBe(1)
    t.tick(snap({ scene: 50 }), 5000, { bananaEnabled: true }) // 到点恢复
    expect(t.getRun().bananaPaused).toBe(false)
    expect(t.getCountdownRemainingSec()).toBeNull()
    expect(t.consumeJustResumed()).toBe(true)
  })
})

describe('SpeedrunTimer 手动操作', () => {
  it('reset 清空本局', () => {
    const t = mk()
    t.tick(snap({ scene: 1 }), 0, { bananaEnabled: false })
    t.tick(snap({ scene: 2 }), 1000, { bananaEnabled: false })
    t.reset()
    expect(t.getRun().phase).toBe('idle')
    expect(t.getRun().splits).toEqual([null, null])
  })
  it('setBestsFromCurrentRun / clearBests / setBest', () => {
    const t = mk({ a: 9000, b: 9000 })
    t.tick(snap({ scene: 1 }), 0, { bananaEnabled: false })
    t.tick(snap({ scene: 2 }), 1500, { bananaEnabled: false }) // split a=1500
    t.setBestsFromCurrentRun()
    expect(t.getBests().a).toBe(1500)
    t.setBest('b', 4242)
    expect(t.getBests().b).toBe(4242)
    t.clearBests()
    expect(t.getBests()).toEqual({ a: null, b: null })
  })
})
