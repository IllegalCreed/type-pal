import { describe, expect, test } from 'vitest'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { AiCond } from './enemy-ai.js'
import { checkEnemyAi, checkEnemyFallback } from './enemy-script.js'

const conditions: { label: string; good: AiCond; bad: unknown; error: string }[] = [
  {
    label: 'chance upper',
    good: { kind: 'chance', percent: 100 },
    bad: { kind: 'chance', percent: 101 },
    error: '.percent: 期望 0..100 有限数',
  },
  {
    label: 'HP lower',
    good: { kind: 'hpBelow', percent: 0 },
    bad: { kind: 'hpBelow', percent: -1 },
    error: '.percent: 期望 0..100 有限数',
  },
  {
    label: 'HP finite',
    good: { kind: 'hpAbove', percent: 50.5 },
    bad: { kind: 'hpAbove', percent: Infinity },
    error: '.percent: 期望有限数',
  },
  {
    label: 'player HP extra field',
    good: { kind: 'anyPlayerHpBelow', percent: 50 },
    bad: { kind: 'anyPlayerHpBelow', percent: 50, extra: 1 },
    error: '.extra: 未知字段',
  },
  {
    label: 'turn operator',
    good: { kind: 'turn', op: '>=', value: 0 },
    bad: { kind: 'turn', op: '<', value: 0 },
    error: '.op: 期望 ==|>=',
  },
  {
    label: 'turn integer',
    good: { kind: 'turn', op: '==', value: 1 },
    bad: { kind: 'turn', op: '==', value: 0.5 },
    error: '.value: 期望非负整数',
  },
  {
    label: 'ally operator',
    good: { kind: 'allyCount', op: '<=', value: 0 },
    bad: { kind: 'allyCount', op: '==', value: 0 },
    error: '.op: 期望 <=|>=',
  },
  {
    label: 'ally count',
    good: { kind: 'allyCount', op: '>=', value: 1 },
    bad: { kind: 'allyCount', op: '>=', value: -1 },
    error: '.value: 期望非负整数',
  },
  {
    label: 'player role',
    good: { kind: 'playerInParty', role: 'hero' },
    bad: { kind: 'playerInParty', role: ' hero ' },
    error: '.role: 期望非空且无首尾空格的 string',
  },
  {
    label: 'difficulty list',
    good: { kind: 'difficulty', in: ['normal'] },
    bad: { kind: 'difficulty', in: [] },
    error: '.in: 期望非空难度 id 数组',
  },
  {
    label: 'difficulty identity',
    good: { kind: 'difficulty', in: ['normal'] },
    bad: { kind: 'difficulty', in: [''] },
    error: '.in[0]: 期望非空且无首尾空格的 string',
  },
]
test.each(
  conditions,
)('enemy AI rejects $label through its real rule parent and retains all input fields', ({
  good,
  bad,
  error,
}) => {
  const positive = {
    resistanceToSorcery: 0,
    rules: [{ at: 'act', when: good, do: { kind: 'pass' } }],
  }
  checkEnemyAi(positive, 'ai')
  const input = { ...positive, rules: [{ ...positive.rules[0], when: bad }] },
    before = deepSnapshot(input)
  expectExactError(() => checkEnemyAi(input, 'ai'), `ai.rules[0].when${error}`)
  expect(input).toEqual(before)
})
test('enemy AI recursively accepts all/any/not, no-argument conditions and target policies', () => {
  const input = {
      resistanceToSorcery: 0,
      rules: [
        {
          at: 'act',
          once: false,
          when: {
            kind: 'all',
            of: [
              { kind: 'aloneAlive' },
              {
                kind: 'any',
                of: [
                  { kind: 'firstOfKind' },
                  { kind: 'not', cond: { kind: 'chance', percent: 0 } },
                ],
              },
            ],
          },
          do: { kind: 'attack', target: 'lowestHp' },
        },
        { at: 'turnStart', do: { kind: 'cast', skillId: 'fire', target: 'strongest' } },
        { at: 'act', do: { kind: 'transform', enemyId: 'friend' } },
        { at: 'act', do: { kind: 'divide', copies: 2 } },
        { at: 'act', do: { kind: 'flee' } },
      ],
    },
    before = deepSnapshot(input)
  expect(() => checkEnemyAi(input, 'ai')).not.toThrow()
  expect(input).toEqual(before)
})
test.each([
  [
    'attack is not fallback',
    { action: { kind: 'attack' }, chancePercent: 0 },
    'fallback 只允许 cast|pass',
  ],
  [
    'invalid target',
    { action: { kind: 'cast', skillId: 'fire', target: 'unknown' }, chancePercent: 50 },
    'target: 未知目标策略',
  ],
  [
    'missing skill',
    { action: { kind: 'cast', skillId: '' }, chancePercent: 50 },
    'skillId: 期望非空',
  ],
  [
    'percentage lower',
    { action: { kind: 'pass' }, chancePercent: -1 },
    'chancePercent: 期望 0..100',
  ],
  [
    'percentage upper',
    { action: { kind: 'pass' }, chancePercent: 101 },
    'chancePercent: 期望 0..100',
  ],
] as const)('enemy fallback rejects %s with an independent legal counterpart', (_label, bad, error) => {
  checkEnemyFallback(
    { action: { kind: 'cast', skillId: 'fire', target: 'random' }, chancePercent: 100 },
    'fallback',
  )
  checkEnemyFallback({ action: { kind: 'pass' }, chancePercent: 0 }, 'fallback')
  const before = deepSnapshot(bad)
  expect(() => checkEnemyFallback(bad, 'fallback')).toThrow(error)
  expect(bad).toEqual(before)
})
describe('enemy AI rule and hook shapes', () => {
  const ai = (over: Record<string, unknown> = {}) => ({
    resistanceToSorcery: 0,
    ...over,
  })
  test('rules.at 非法值拒绝且 where 精确', () => {
    expect(() =>
      checkEnemyAi(ai({ rules: [{ at: 'midturn', do: { kind: 'attack' }, once: false }] }), 'ai'),
    ).toThrow(/ai\.rules\[0\]\.at: 期望 turnStart\|act/)
  })
  test('hooks 未知频道键拒绝（只允许 ready/turnStart）', () => {
    expect(() =>
      checkEnemyAi(
        ai({
          hooks: {
            idle: { initial: 'ready', states: { ready: { body: [], next: { kind: 'stay' } } } },
          },
        }),
        'ai',
      ),
    ).toThrow(new Error('ai.hooks.idle: 未知字段'))
  })
  test('hooks 内嵌非法 hook flow 逐层透传拒绝', () => {
    expect(() =>
      checkEnemyAi(ai({ hooks: { ready: { initial: 'ready', states: {} } } }), 'ai'),
    ).toThrow(/ai\.hooks\.ready\.states: 期望至少一个 state/)
  })
})

describe('action and rule fields', () => {
  test('未知 AI 动作与 summon 缺 enemyId 正控/负例', () => {
    const control = {
      resistanceToSorcery: 0,
      rules: [{ at: 'act', do: { kind: 'summon', count: 1 } }],
    }
    expectAcceptsUnchanged((value) => checkEnemyAi(value, 'ai'), control)
    const badKind = {
      resistanceToSorcery: 0,
      rules: [{ at: 'act', do: { kind: 'bogus' } }],
    }
    const before = deepSnapshot(badKind)
    expectExactError(
      () => checkEnemyAi(badKind, 'ai'),
      'ai.rules[0].do.kind: 未知敌人 AI 动作 bogus',
    )
    expect(badKind).toEqual(before)
    const badEnemyId = {
      resistanceToSorcery: 0,
      rules: [{ at: 'act', do: { kind: 'summon', enemyId: '', count: 1 } }],
    }
    const badEnemyIdBefore = deepSnapshot(badEnemyId)
    expectExactError(
      () => checkEnemyAi(badEnemyId, 'ai'),
      'ai.rules[0].do.enemyId: 期望非空且无首尾空格的 string',
    )
    expect(badEnemyId).toEqual(badEnemyIdBefore)
  })

  test('checkEnemyAi rules 数组门与 once 叶拒绝', () => {
    const control = {
      resistanceToSorcery: 0,
      rules: [{ at: 'act', do: { kind: 'pass' }, once: true }],
    }
    expectAcceptsUnchanged((value) => checkEnemyAi(value, 'ai'), control)
    const badRules = { resistanceToSorcery: 0, rules: 'x' }
    const rulesBefore = deepSnapshot(badRules)
    expectExactError(() => checkEnemyAi(badRules, 'ai'), 'ai.rules: 期望 AiRule[]')
    expect(badRules).toEqual(rulesBefore)
    const badOnce = {
      resistanceToSorcery: 0,
      rules: [{ at: 'act', do: { kind: 'pass' }, once: 'yes' }],
    }
    const badOnceBefore = deepSnapshot(badOnce)
    expectExactError(() => checkEnemyAi(badOnce, 'ai'), 'ai.rules[0].once: 期望 boolean')
    expect(badOnce).toEqual(badOnceBefore)
  })
})
