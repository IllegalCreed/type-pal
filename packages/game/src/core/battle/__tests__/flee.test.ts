/** Direct flee contracts; controller scheduling and browser presentation are separate. */
import { describe, expect, it } from 'vitest'
import { performFlee } from '../actions/flee.js'
import { makeActionFixture } from './action.test-fixtures.js'

// ============================================================================
// performFlee
// ============================================================================
describe('performFlee', () => {
  it('fleeRate 远大于 rng 上限(roll 必小)→ 触发逃跑动画(fleeAnim)', () => {
    const { state, gs } = makeActionFixture({
      role: { fleeRate: 9999 },
      enemies: [{ level: 1, dexterity: 0 }],
      rolls: [0],
    })
    performFlee(state, gs, 0)
    // 成功 → 设 fleeAnim(逃跑动画放完才 phase='fleed';不再直接 fleed)
    expect(state.fleeAnim).toBeDefined()
  })
  it('fleeRate=0 + 多个高吉运敌人(roll 必大)→ phase 不变', () => {
    const { state, gs } = makeActionFixture({
      role: { fleeRate: 0 },
      enemies: [
        { level: 50, fleeRate: 100 },
        { level: 50, fleeRate: 100 },
      ],
    })
    const before = state.phase
    performFlee(state, gs, 0)
    expect(state.phase).toBe(before) // 不变
  })
  // 修复版(有意偏离原版,docs/phase1/game-mechanics.md「原始 bug:逃跑抵抗错用敌人身法」,
  // user 2026-06-13 选修复):原作 fight.c:4134 误用敌身法 wDexterity,敌吉运 wFleeRate
  // 全引擎死字段。修复后 def = Σ(敌吉运 + (level+6)*4),身法不再参与逃跑抵抗。
  it('修复版:逃跑抵抗 def 用敌吉运 fleeRate,身法 dexterity 不参与', () => {
    const { state, gs } = makeActionFixture({
      role: { fleeRate: 0 },
      enemies: [{ level: 1, fleeRate: 36, dexterity: 9999 }],
    })
    const calls: Array<[number, number]> = []
    state.rng = {
      ...state.rng,
      rangeInclusive: (a: number, b: number) => {
        calls.push([a, b])
        return 0
      },
    }
    performFlee(state, gs, 0)
    // def = 敌吉运 36 + (1+6)*4 = 64;dexterity 9999 不计入(原版 bug 行为是 9999+28)
    expect(calls).toEqual([[0, 64]])
  })
  it('isBoss=true → 无论 fleeRate 多高都不可逃', () => {
    const { state, gs } = makeActionFixture({
      role: { fleeRate: 99999 },
      enemies: [{ level: 1, dexterity: 0 }],
      isBoss: true,
      rolls: [0],
    })
    performFlee(state, gs, 0)
    expect(state.fleeAnim).toBeUndefined() // boss 不可逃 → 不触发逃跑动画
    expect(state.phase).not.toBe('fleed')
  })
  it('无 enemy 时 def=0 → roll∈[0,0]=0,fleeRate>=0 → 命中', () => {
    const { state, gs } = makeActionFixture({
      role: { fleeRate: 0 },
      enemies: [],
      rolls: [0],
    })
    performFlee(state, gs, 0)
    expect(state.fleeAnim).toBeDefined()
  })
  it('def 为 SHORT 负溢出 → clamp 0(sdlpal fight.c:4139)', () => {
    const { state, gs } = makeActionFixture({
      role: { fleeRate: 0 },
      // SHORT(累加结果) < 0 → def=0;rng(0,0)=0;str=0 >= 0 → 命中(修复版字段=敌吉运)
      enemies: [{ level: 1, fleeRate: 32836 }],
      rolls: [0],
    })
    performFlee(state, gs, 0)
    expect(state.fleeAnim).toBeDefined()
  })
  it('逃跑失败 → 起失败动画 battleAnim(sdlpal fight.c:4155-4168,3步右下挪+帧1)', () => {
    const { state, bus, gs } = makeActionFixture({
      role: { fleeRate: 0 },
      enemies: [{ level: 50, dexterity: 100 }],
    })
    state.players[0]!.posOriginal = { x: 100, y: 100 }
    performFlee(state, gs, 0, bus)
    expect(state.fleeAnim).toBeUndefined() // 未成功(无逃离动画)
    expect(state.battleAnim).toBeDefined() // 起了失败动画时间线(per-player 3步+帧1)
    expect(bus.drain().filter((c) => c.cmd.op === 'showBattleMessage')).toHaveLength(0) // 文字不早于失败动作
    expect(state.battleAnim?.frames.at(-1)?.battleMessage).toEqual({
      text: '逃跑失败',
      durationMs: 320,
    })
  })
  // ── D12(2026-06-01 W1):装备逃跑率加成生效(sdlpal global.c:1868-1897 PAL_GetPlayerFleeRate)──
  it('装备授逃跑率 → base+装备 决定成功(base 0 单凭装备 50 即可逃)', () => {
    const { state, gs } = makeActionFixture({
      role: { fleeRate: 0 }, // runtime base = 0
      equipFleeRate: 50, // 装备槽 0 授 +50
      enemies: [{ level: 1, fleeRate: 0, dexterity: 0 }],
      rolls: [28],
    })
    performFlee(state, gs, 0)
    // 装备感知:str = getPlayerFleeRate = 0+50 = 50 >= 28 → 成功(若仍用 raw base 0 则失败,fleeAnim undefined)
    expect(state.fleeAnim).toBeDefined()
  })
  // ── DM4:def 累加跳过 defeated 空槽(fight.c:4129 `if (wObjectID == 0) continue`)──
  it('defeated 敌(死敌清槽/0 占位)不计入 def,roll 上限只含活敌', () => {
    const { state, gs } = makeActionFixture({
      role: { fleeRate: 28 },
      enemies: [
        { level: 1, fleeRate: 0 }, // 活敌:def = 0 + (1+6)*4 = 28(修复版字段=敌吉运)
        { level: 50, fleeRate: 100 }, // 标 defeated:C 不计(原 bug:仍累加 → 成功率偏低)
      ],
    })
    state.enemies[1]!.defeated = true
    let capturedHi = -1
    state.rng.rangeInclusive = (_lo, hi) => {
      capturedHi = hi
      return 0
    }
    performFlee(state, gs, 0)
    expect(capturedHi).toBe(28) // 仅活敌 28;若含死敌应为 28+100+(50+6)*4=352
    expect(state.fleeAnim).toBeDefined() // str 28 >= roll 0
  })
  // ── DM5:boss 战仍请求范围掷骰并走失败演出(fight.c:4143 掷骰为 && 左操作数;4155-4170 失败分支)──
  it('isBoss 仍消费一次掷骰,走失败动画 + FleeExp.wCount+=2', () => {
    const { state, bus, gs } = makeActionFixture({
      role: { fleeRate: 9999 }, // str 必胜 roll,但 isBoss → 必失败
      enemies: [{ level: 1, dexterity: 0 }],
      isBoss: true,
    })
    state.players[0]!.posOriginal = { x: 100, y: 100 }
    let rolls = 0
    state.rng.rangeInclusive = () => {
      rolls++
      return 0
    }
    const before = gs.Exp.rgFleeExp[0]?.wCount ?? 0
    performFlee(state, gs, 0, bus)
    expect(rolls).toBe(1) // 非空区间确实发起一次范围请求(原顶部提前return会跳过)
    expect(state.fleeAnim).toBeUndefined() // 不成功
    expect(state.battleAnim).toBeDefined() // 失败演出(3 步右下挪 + 帧1)
    expect(gs.Exp.rgFleeExp[0]?.wCount ?? 0).toBe(before + 2)
  })
})
