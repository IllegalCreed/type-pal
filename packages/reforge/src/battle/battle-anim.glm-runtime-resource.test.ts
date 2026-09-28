/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R15（reforge/battle/battle-anim.ts，窄入口）。
 * 去重账：battle-anim.test 与四个 residual 已覆盖大流程 builder 与挥击帧单次结算。
 * 本文件只做未占用合同（AnimPlayer 剩余简单边界）：播完后 tick 立即 true 不再派发、
 * 流末 onOverlay(null) 收尾、单帧多副作用一次性派发（damageNums tone / screenShake /
 * waveAdd / banner / summonPhase 缺省 null）。
 */
import { describe, expect, test, vi } from 'vitest'
import { type AnimFrame, AnimPlayer } from './battle-anim.js'

function fx() {
  return {
    onFighter: vi.fn(),
    onOverlay: vi.fn(),
    onSound: vi.fn(),
    onDamage: vi.fn(),
    onScreenShake: vi.fn(),
    onWaveAdd: vi.fn(),
    onAppearanceTransition: vi.fn(),
    onBurnBg: vi.fn(),
    onBanner: vi.fn(),
    onSummonPhase: vi.fn(),
  }
}

const frame = (over: Partial<AnimFrame>): AnimFrame => ({ durationMs: 40, ...over })

describe('R15 AnimPlayer 剩余简单边界', () => {
  test('首 tick 立即进入帧 0；时长未满返回 false；满时进入下一帧', () => {
    const f = fx()
    const p = new AnimPlayer([frame({}), frame({})], f)
    expect(p.tick(10)).toBe(false) // 进入帧 0（idx -1 → 0 不消耗时长）
    expect(p.tick(10)).toBe(false) // 累计 20 < 40
    expect(p.tick(20)).toBe(false) // 累计 40 → 进入帧 1，重新计时
    expect(p.tick(40)).toBe(true) // 帧 1 满 → 流末
  })

  test('播完后 tick 立即 true，不再派发任何副作用', () => {
    const f = fx()
    const p = new AnimPlayer([frame({})], f)
    expect(p.tick(40)).toBe(true)
    const callsBefore = f.onOverlay.mock.calls.length
    expect(p.tick(1000)).toBe(true)
    expect(f.onOverlay.mock.calls.length).toBe(callsBefore)
  })

  test('流末 onOverlay(null) 收尾恰一次', () => {
    const f = fx()
    const p = new AnimPlayer([frame({ overlays: [] })], f)
    p.tick(40)
    expect(f.onOverlay).toHaveBeenLastCalledWith(null)
  })

  test('单帧多副作用一次性派发：damageNums tone / screenShake+level / waveAdd / banner / summonPhase 缺省 null', () => {
    const f = fx()
    const p = new AnimPlayer(
      [
        frame({
          damageNums: [
            { target: { side: 'enemy', idx: 1 }, value: 12 },
            { target: { side: 'enemy', idx: 2 }, value: 34, tone: 'yellow' },
          ],
          screenShake: true,
          screenShakeLevel: 2,
          waveAdd: 3,
          banner: { text: '合击', durationMs: 500 },
        }),
      ],
      f,
    )
    p.tick(40)
    expect(f.onDamage).toHaveBeenNthCalledWith(1, { side: 'enemy', idx: 1 }, 12, undefined)
    expect(f.onDamage).toHaveBeenNthCalledWith(2, { side: 'enemy', idx: 2 }, 34, 'yellow')
    expect(f.onScreenShake).toHaveBeenNthCalledWith(1, 40, 2) // 真实合同：时长=帧 durationMs、强度=screenShakeLevel
    expect(f.onScreenShake).toHaveBeenCalledTimes(1)
    expect(f.onWaveAdd).toHaveBeenCalledWith(3)
    expect(f.onBanner).toHaveBeenCalledTimes(1)
    expect(f.onSummonPhase).toHaveBeenLastCalledWith(null)
  })
})
