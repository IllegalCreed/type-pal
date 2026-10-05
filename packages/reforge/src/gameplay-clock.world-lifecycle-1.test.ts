import { describe, expect, test } from 'vitest'
import { GameplayClock } from './gameplay-clock.js'

/**
 * TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 补充合同：既有 gameplay-clock.test.ts 已证明
 * 冻结/恢复不补算与单步精确推进；未证明 realNow 回退的钳位与 gameplayNow 单调性。
 * 消费方：runtime-frame-session.ts 的 wait deadline 与 advanceFade 都以 gameplayNow 为基，
 * 时钟倒扣会推迟已到期等待、回退淡入进度。产品真值（实测核对 gameplay-clock.ts:19-31）：
 * 回退帧 dt 钳为 0 且 lastReal 重锚到回退值，故恢复帧 dt 自旧锚点起算、受 100ms 上限约束。
 */
describe('GameplayClock regression guard (world-lifecycle-1)', () => {
  test('realNow 回退被钳为 0 dt，gameplayNow 单调不回退，恢复帧从重锚点起算', () => {
    const clock = new GameplayClock()
    expect(clock.advance(2_000, false)).toEqual({
      realDt: 0,
      gameplayDt: 0,
      gameplayNow: 2_000,
    })
    expect(clock.advance(2_016, false)).toEqual({
      realDt: 16,
      gameplayDt: 16,
      gameplayNow: 2_016,
    })
    // 时间源回退：dt 钳为 0，gameplay 时间不倒扣；lastReal 重锚到回退值。
    expect(clock.advance(1_000, false)).toEqual({
      realDt: 0,
      gameplayDt: 0,
      gameplayNow: 2_016,
    })
    // 恢复正向：dt = 2_032 - 1_000，受 100ms 帧上限钳制，gameplayNow 只前进。
    expect(clock.advance(2_032, false)).toEqual({
      realDt: 100,
      gameplayDt: 100,
      gameplayNow: 2_116,
    })
  })
})
