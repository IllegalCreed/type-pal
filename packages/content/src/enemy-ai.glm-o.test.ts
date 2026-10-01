/** TEST-GLM-WAVE-O-1 O08：敌 AI 决策与战斗公式/状态残余合同。
 *  旧证：enemy-ai.test.ts / battle-formulas.test.ts 覆盖主干；本卡按 gap-map 直击
 *  未覆盖臂：decideByRules once/silenced/when 跳过序、pickAiTarget 四策略并列稳定序、
 *  dualMove 队列 dex2 上下相对位、tick/apply 状态语义、canAct/canCastMagic。
 */
import { describe, expect, test } from 'vitest'
import {
  applyPlayerStatus,
  type BattleStatus,
  buildActionQueue,
  emptyBattleStatus,
  tickBattleStatus,
} from './battle-formulas.js'
import type { AiBattleView, AiRule } from './enemy-ai.js'
import { decideByRules, evalAiCond, pickAiTarget } from './enemy-ai.js'

const view = (over: Partial<AiBattleView> = {}): AiBattleView => ({
  turn: 3,
  self: { hpPercent: 100, firstOfKind: true, silenced: false },
  players: [
    { index: 0, role: 'hero', hpPercent: 50, hp: 50, mp: 30, attack: 20 },
    { index: 1, role: 'linger', hpPercent: 90, hp: 90, mp: 10, attack: 15 },
  ],
  allyCount: 2,
  difficulty: 'normal',
  ...over,
})

describe('O08 decideByRules：act 首命中与跳过序', () => {
  test('once 已触发规则被跳过，后续首条命中', () => {
    const rules: AiRule[] = [
      { at: 'act', once: true, do: { kind: 'attack' } },
      { at: 'act', do: { kind: 'cast', skillId: '1' } },
    ]
    const fired = new Set([0])
    expect(decideByRules(rules, view(), () => 0.5, fired)).toEqual({
      action: { kind: 'cast', skillId: '1' },
      ruleIdx: 1,
    })
  })

  test('沉默时 cast 规则跳过继续匹配（普攻兜底）', () => {
    const rules: AiRule[] = [
      { at: 'act', do: { kind: 'cast', skillId: '1' } },
      { at: 'act', do: { kind: 'attack' } },
    ]
    expect(
      decideByRules(
        rules,
        view({ self: { hpPercent: 1, firstOfKind: true, silenced: true } }),
        () => 0.5,
        new Set(),
      ),
    ).toEqual({
      action: { kind: 'attack' },
      ruleIdx: 1,
    })
  })

  test('when 不命中继续下一条；全部不命中 → null', () => {
    const rules: AiRule[] = [
      { at: 'act', when: { kind: 'difficulty', in: ['hard'] }, do: { kind: 'attack' } },
      { at: 'act', when: { kind: 'hpBelow', percent: 10 }, do: { kind: 'attack' } },
    ]
    expect(decideByRules(rules, view(), () => 0.5, new Set())).toBeNull()
  })

  test('turnStart 通道规则不参与 act 决策（act 只取 at=act 首命中）', () => {
    const rules: AiRule[] = [{ at: 'turnStart', do: { kind: 'attack' } }]
    expect(decideByRules(rules, view(), () => 0.5, new Set())).toBeNull()
  })
})

describe('O08 evalAiCond：all/any/not 与数值条件', () => {
  test('嵌套 all/any/not 组合求值', () => {
    const v = view()
    expect(
      evalAiCond(
        {
          kind: 'not',
          cond: {
            kind: 'all',
            of: [
              { kind: 'hpAbove', percent: 99 },
              { kind: 'difficulty', in: ['hard'] },
            ],
          },
        },
        v,
        () => 0.5,
      ),
    ).toBe(true)
  })

  test('allyCount 比较符 <=/>= 与 playerInParty', () => {
    expect(evalAiCond({ kind: 'allyCount', op: '<=', value: 2 }, view(), () => 0.5)).toBe(true)
    expect(evalAiCond({ kind: 'allyCount', op: '>=', value: 3 }, view(), () => 0.5)).toBe(false)
    expect(evalAiCond({ kind: 'playerInParty', role: 'linger' }, view(), () => 0.5)).toBe(true)
    expect(evalAiCond({ kind: 'playerInParty', role: 'anu' }, view(), () => 0.5)).toBe(false)
  })
})

describe('O08 pickAiTarget：策略与稳定并列序', () => {
  const players = [
    { index: 0, role: 'a', hpPercent: 50, hp: 50, mp: 10, attack: 20 },
    { index: 1, role: 'b', hpPercent: 90, hp: 90, mp: 40, attack: 25 },
    { index: 2, role: 'c', hpPercent: 30, hp: 30, mp: 20, attack: 25 },
  ]

  test('lowestHp/highestHp/lowestMp/strongest 各自取极值', () => {
    expect(pickAiTarget('lowestHp', players, () => 0)).toBe(2)
    expect(pickAiTarget('highestHp', players, () => 0)).toBe(1)
    expect(pickAiTarget('lowestMp', players, () => 0)).toBe(0)
    // strongest：attack 25 并列（槽1/槽2）→ 严格小于才换 best → 槽序靠前的 1。
    expect(pickAiTarget('strongest', players, () => 0)).toBe(1)
  })

  test('strongest 全并列时取槽序靠前（稳定，key 严格小于才换 best）', () => {
    const tie: typeof players = [
      { index: 0, role: 'a', hpPercent: 1, hp: 1, mp: 1, attack: 25 },
      { index: 1, role: 'b', hpPercent: 1, hp: 1, mp: 1, attack: 25 },
    ]
    expect(pickAiTarget('strongest', tie, () => 0)).toBe(0)
  })

  test('空 players → fail-loud', () => {
    expect(() => pickAiTarget('random', [], () => 0)).toThrow(
      'pickAiTarget: players must not be empty',
    )
  })
})

describe('O08 buildActionQueue：dualMove 相对位与稳定排序', () => {
  test('无 dualMove：dex 降序、同 dex 敌人先于队员', () => {
    const queue = buildActionQueue([{ idx: 0, dex: 50 }], [{ idx: 1, dex: 50, dualMove: false }])
    expect(queue.map(({ isEnemy, idx }) => ({ isEnemy, idx }))).toEqual([
      { isEnemy: true, idx: 1 },
      { isEnemy: false, idx: 0 },
    ])
  })

  test('dualMove 有 dex2：dex2<=dex 时第二次在后（fIsSecond 次序标记）', () => {
    const queue = buildActionQueue([], [{ idx: 1, dex: 80, dualMove: true, dex2: 60 }])
    expect(queue.map(({ idx, fIsSecond }) => ({ idx, fIsSecond }))).toEqual([
      { idx: 1, fIsSecond: false },
      { idx: 1, fIsSecond: true },
    ])
    expect(queue[0]!.dex).toBe(80)
    expect(queue[1]!.dex).toBe(60)
  })

  test('dualMove 有 dex2 且 dex2>dex：第一次标记 fIsSecond（先动高 dex）', () => {
    const queue = buildActionQueue([], [{ idx: 1, dex: 60, dualMove: true, dex2: 90 }])
    expect(queue.map(({ dex, fIsSecond }) => ({ dex, fIsSecond }))).toEqual([
      { dex: 90, fIsSecond: false },
      { dex: 60, fIsSecond: true },
    ])
  })

  test('dualMove 无 dex2：补 dex-1 的第二次动作', () => {
    const queue = buildActionQueue([], [{ idx: 1, dex: 80, dualMove: true }])
    expect(queue.map(({ dex, fIsSecond }) => ({ dex, fIsSecond }))).toEqual([
      { dex: 80, fIsSecond: false },
      { dex: 79, fIsSecond: true },
    ])
  })
})

describe('O08 战斗状态：tick/apply/canAct/canCastMagic', () => {
  test('tickBattleStatus：正计数递减、原地修改（>999 视为永久同样递减）', () => {
    const st: BattleStatus = { ...emptyBattleStatus(), sleep: 2, haste: 1000 }
    tickBattleStatus(st)
    expect(st.sleep).toBe(1)
    expect(st.haste).toBe(999)
  })

  test('applyPlayerStatus：坏状态已有不刷新；好状态仅活人取较长；傀儡仅死者', () => {
    const st = { ...emptyBattleStatus(), sleep: 3 }
    expect(applyPlayerStatus(st, 'sleep', 2, true)).toBe(false)
    expect(st.sleep).toBe(3)
    expect(applyPlayerStatus(st, 'haste', 2, true)).toBe(true)
    expect(st.haste).toBe(2)
    expect(applyPlayerStatus(st, 'haste', 5, true)).toBe(true)
    expect(st.haste).toBe(5)
    expect(applyPlayerStatus(st, 'slow', 3, true)).toBe(true)
    expect(st.slow).toBe(3)
    expect(st.haste).toBe(0)
    const st2 = emptyBattleStatus()
    expect(applyPlayerStatus(st2, 'puppet', 4, false)).toBe(true)
    expect(st2.puppet).toBe(4)
    const st3 = emptyBattleStatus()
    expect(applyPlayerStatus(st3, 'puppet', 4, true)).toBe(false)
    expect(applyPlayerStatus(st3, 'haste', 2, false)).toBe(false)
  })
})
