/** Wall-clock rendering of an active summon loop; logic still owns frame completion. */
import { describe, expect, it } from 'vitest'
import { makeBattleFixture } from '../../../__tests__/battle-fixture.js'
import { startBattleAnim } from '../battle-anim-driver.js'
import type { SummonFrameState } from '../battle-state.js'
import { stepSummonLoopRender } from '../battle-system.js'

describe('召唤 loop wall-clock 渲染细分(stepSummonLoopRender)', () => {
  function makeSummonState(loop: SummonFrameState['loop']) {
    const { state, bus } = makeBattleFixture()
    state.phase = 'performAction'
    startBattleAnim(
      state,
      [
        {
          durationMs: 250,
          summon: {
            spriteKey: 'player-30',
            frame: 0,
            pos: { x: 240, y: 160 },
            bgColorShift: 0,
            ...(loop ? { loop } : {}),
          },
        },
      ],
      bus,
    )
    return state
  }

  it('loop 帧:startMs 惰性记 + frame=floor((now-start)/frameTimeMs)(wall-clock 精确 50ms/帧)', () => {
    const s = makeSummonState({ count: 5, frameTimeMs: 50 })
    stepSummonLoopRender(s, 1000) // 首调:startMs=1000, frame=0
    expect(s.battleAnim!.summonLoopStartMs).toBe(1000)
    expect(s.battleAnim!.summon!.frame).toBe(0)
    stepSummonLoopRender(s, 1050) // 50/50=1
    expect(s.battleAnim!.summon!.frame).toBe(1)
    stepSummonLoopRender(s, 1175) // 175/50=3.5→3
    expect(s.battleAnim!.summon!.frame).toBe(3)
  })

  it('cap 在 count-1(末帧),不越界', () => {
    const s = makeSummonState({ count: 5, frameTimeMs: 50 })
    stepSummonLoopRender(s, 1000)
    stepSummonLoopRender(s, 9999) // 远超 → cap count-1=4
    expect(s.battleAnim!.summon!.frame).toBe(4)
  })

  it('max 不回退:nowMs 倒退(rAF 抖动)不让 iSummonFrame 倒退', () => {
    const s = makeSummonState({ count: 5, frameTimeMs: 50 })
    stepSummonLoopRender(s, 1000)
    stepSummonLoopRender(s, 1150) // frame=3
    expect(s.battleAnim!.summon!.frame).toBe(3)
    stepSummonLoopRender(s, 1050) // 倒退 → 保持 3
    expect(s.battleAnim!.summon!.frame).toBe(3)
  })

  it('非 loop 帧(summon.loop 缺):清 summonLoopStartMs,不动 frame', () => {
    const s = makeSummonState(undefined)
    s.battleAnim!.summonLoopStartMs = 1234
    s.battleAnim!.summon!.frame = 2
    stepSummonLoopRender(s, 5000)
    expect(s.battleAnim!.summonLoopStartMs).toBeUndefined()
    expect(s.battleAnim!.summon!.frame).toBe(2)
  })
})
