/** 敌人 AI 规则求值器(M4c-1)—— 设计:enemy-ai-design.md §1/§2。 */
import { describe, expect, test, vi } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { AiBattleView, AiRule } from './enemy-ai.js'
import { decideByRules, evalAiCond, pickAiTarget } from './enemy-ai.js'
import { checkEnemyAi } from './enemy-script.js'

const view = (
  over?: Omit<Partial<AiBattleView>, 'self'> & { self?: Partial<AiBattleView['self']> },
): AiBattleView => ({
  turn: 1,
  difficulty: 'normal',
  allyCount: 2,
  players: [
    { index: 0, hpPercent: 80, hp: 400, mp: 50, attack: 60, role: 'li-xiaoyao' },
    { index: 2, hpPercent: 30, hp: 90, mp: 10, attack: 40, role: 'lin-yueru' },
  ],
  ...over,
  self: { hpPercent: 100, firstOfKind: true, silenced: false, ...over?.self },
})
const r0 = () => 0 // rng 恒 0(chance 恒中,random 目标取首个)
const r9 = () => 0.99

describe('evalAiCond', () => {
  test('hpBelow/hpAbove/turn/aloneAlive/firstOfKind', () => {
    expect(
      evalAiCond({ kind: 'hpBelow', percent: 30 }, view({ self: { hpPercent: 20 } }), r0),
    ).toBe(true)
    expect(evalAiCond({ kind: 'hpAbove', percent: 50 }, view(), r0)).toBe(true)
    expect(evalAiCond({ kind: 'hpBelow', percent: 100 }, view(), r0)).toBe(false)
    expect(evalAiCond({ kind: 'hpAbove', percent: 100 }, view(), r0)).toBe(false)
    expect(evalAiCond({ kind: 'turn', op: '>=', value: 3 }, view({ turn: 3 }), r0)).toBe(true)
    expect(evalAiCond({ kind: 'turn', op: '==', value: 3 }, view({ turn: 4 }), r0)).toBe(false)
    expect(evalAiCond({ kind: 'aloneAlive' }, view({ allyCount: 1 }), r0)).toBe(true)
    expect(evalAiCond({ kind: 'firstOfKind' }, view({ self: { firstOfKind: false } }), r0)).toBe(
      false,
    )
  })
  test('chance 用注入 rng;战场感知与难度', () => {
    expect(evalAiCond({ kind: 'chance', percent: 50 }, view(), r0)).toBe(true)
    expect(evalAiCond({ kind: 'chance', percent: 50 }, view(), r9)).toBe(false)
    expect(evalAiCond({ kind: 'anyPlayerHpBelow', percent: 40 }, view(), r0)).toBe(true)
    expect(evalAiCond({ kind: 'allyCount', op: '<=', value: 1 }, view(), r0)).toBe(false)
    expect(evalAiCond({ kind: 'difficulty', in: ['hard', 'hardcore'] }, view(), r0)).toBe(false)
    expect(evalAiCond({ kind: 'difficulty', in: ['normal'] }, view(), r0)).toBe(true)
  })
  test('playerInParty:角色在队(0x79 门 —— 绿叶小妖赵灵儿在队才退下)', () => {
    // view 默认队伍 = [李逍遥, 林月如]
    expect(evalAiCond({ kind: 'playerInParty', role: 'li-xiaoyao' }, view(), r0)).toBe(true)
    expect(evalAiCond({ kind: 'playerInParty', role: 'zhao-linger' }, view(), r0)).toBe(false)
  })
  test('组合子 all/any/not', () => {
    const c = {
      kind: 'all' as const,
      of: [
        { kind: 'turn' as const, op: '>=' as const, value: 1 },
        { kind: 'not' as const, cond: { kind: 'aloneAlive' as const } },
      ],
    }
    expect(evalAiCond(c, view(), r0)).toBe(true)
    const random = vi.fn(() => 0.25)
    expect(evalAiCond({ kind: 'any', of: [] }, view(), random)).toBe(false)
    expect(
      evalAiCond(
        {
          kind: 'any',
          of: [
            { kind: 'turn', op: '>=', value: 1 },
            { kind: 'chance', percent: 50 },
          ],
        },
        view(),
        random,
      ),
    ).toBe(true)
    expect(
      evalAiCond(
        {
          kind: 'all',
          of: [
            { kind: 'hpBelow', percent: 10 },
            { kind: 'chance', percent: 50 },
          ],
        },
        view(),
        random,
      ),
    ).toBe(false)
    // Short-circuiting is observable RNG ownership, not merely an optimization.
    expect(random).not.toHaveBeenCalled()
  })
})

describe('decideByRules(首条命中 / once / 沉默跳 cast)', () => {
  const rules: AiRule[] = [
    { at: 'turnStart', do: { kind: 'pass' } }, // act 决策不看 turnStart
    {
      at: 'act',
      when: { kind: 'hpBelow', percent: 30 },
      do: { kind: 'transform', enemyId: 'enemy-2' },
      once: true,
    },
    { at: 'act', when: { kind: 'chance', percent: 50 }, do: { kind: 'cast', skillId: '339' } },
    { at: 'act', do: { kind: 'attack' } },
  ]
  test('顺序匹配:满血 → 概率中 → 施法', () => {
    expect(decideByRules(rules, view(), r0, new Set())).toEqual({
      action: { kind: 'cast', skillId: '339' },
      ruleIdx: 2,
    })
  })
  test('低血优先变身;once 已触发则跳过', () => {
    const v = view({ self: { hpPercent: 10 } })
    expect(decideByRules(rules, v, r0, new Set())).toEqual({
      action: { kind: 'transform', enemyId: 'enemy-2' },
      ruleIdx: 1,
    })
    expect(decideByRules(rules, v, r0, new Set([1]))).toEqual({
      action: { kind: 'cast', skillId: '339' },
      ruleIdx: 2,
    })
  })
  test('沉默:cast 跳过继续匹配 → 普攻兜底', () => {
    expect(decideByRules(rules, view({ self: { silenced: true } }), r0, new Set())).toEqual({
      action: { kind: 'attack' },
      ruleIdx: 3,
    })
  })
  test('概率不中落到兜底;无命中返回 null', () => {
    expect(decideByRules(rules, view(), r9, new Set())).toEqual({
      action: { kind: 'attack' },
      ruleIdx: 3,
    })
    expect(decideByRules([rules[2]!], view(), r9, new Set())).toBeNull()
  })
})

describe('pickAiTarget(目标策略)', () => {
  const ps = view().players
  test('random 走 rng;lowestHp 集火残血;strongest 打高攻', () => {
    expect(pickAiTarget('random', ps, r0)).toBe(0)
    expect(pickAiTarget(undefined, ps, r9)).toBe(2)
    expect(pickAiTarget('lowestHp', ps, r0)).toBe(2)
    expect(pickAiTarget('strongest', ps, r0)).toBe(0)
    expect(pickAiTarget('lowestMp', ps, r0)).toBe(2)
  })

  test('highestHp 取最高血；并列取槽序靠前，旁队员不改', () => {
    checkEnemyAi(
      {
        resistanceToSorcery: 0,
        rules: [{ at: 'act', do: { kind: 'attack', target: 'highestHp' } }],
      },
      'ai',
    )
    const players = [
      { index: 0, hpPercent: 40, hp: 80, mp: 30, attack: 50, role: 'hero.li' },
      { index: 2, hpPercent: 90, hp: 200, mp: 10, attack: 20, role: 'hero.zhao' },
      { index: 3, hpPercent: 90, hp: 200, mp: 99, attack: 80, role: 'hero.lin' },
    ]
    const snap = deepSnapshot(players)
    expect(pickAiTarget('highestHp', players, () => 0.99)).toBe(2)
    expect(players).toEqual(snap)
    expect(players[0]?.hp).toBe(80)
    expect(players[2]?.index).toBe(3)
  })
})
