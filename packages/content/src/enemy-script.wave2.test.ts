import { expect, test } from 'vitest'
import { enemyFlow } from './__tests__/coverage-wave2/e-enemy-author.js'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import type { AiCond } from './enemy-ai.js'
import {
  checkEnemyAi,
  checkEnemyFallback,
  checkEnemyHookFlow,
  checkEnemyOnDefeatedCommands,
} from './enemy-script.js'

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
    error: '.role: 期望非空且无首尾空格',
  },
  {
    label: 'difficulty list',
    good: { kind: 'difficulty', in: ['normal'] },
    bad: { kind: 'difficulty', in: [] },
    error: '.in: 期望非空难度',
  },
  {
    label: 'difficulty identity',
    good: { kind: 'difficulty', in: ['normal'] },
    bad: { kind: 'difficulty', in: [''] },
    error: '.in[0]: 期望非空',
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
  expect(() => checkEnemyAi(input, 'ai')).toThrow(`ai.rules[0].when${error}`)
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
test('hook rejects a forbidden effect kind even when the nested AI action itself is legal', () => {
  const flow = enemyFlow(),
    before = deepSnapshot(flow)
  const bad = {
    ...flow,
    states: {
      ...flow.states,
      one: {
        ...flow.states.one,
        body: [{ kind: 'effect', id: 'spawn', effect: { kind: 'attack' } }],
      },
    },
  }
  expect(() => checkEnemyHookFlow(bad, 'hook')).toThrow(
    'hook.states.one.body[0].effect.kind: effect 只允许',
  )
  expect(flow).toEqual(before)
})
test('onDefeated recursion reports exact count/number errors and does not rewrite nonempty branch arms', () => {
  const good = [
    {
      kind: 'branch',
      cond: { kind: 'flag', flag: 'reward', is: true },
      then: [{ kind: 'giveItem', itemId: 'herb', count: 1 }],
      else: [
        { kind: 'giveMoney', delta: 0 },
        { kind: 'setFlag', flag: 'reward', value: false },
        { kind: 'stopScript' },
      ],
    },
  ]
  checkEnemyOnDefeatedCommands(good, 'defeated')
  const bad = [{ ...good[0], then: [{ kind: 'giveItem', itemId: 'herb', count: 0 }] }],
    before = deepSnapshot(bad)
  expect(() => checkEnemyOnDefeatedCommands(bad, 'defeated')).toThrow(
    'defeated[0].then[0].count: 期望正整数',
  )
  expect(bad).toEqual(before)
  expect(() =>
    checkEnemyOnDefeatedCommands([{ kind: 'giveMoney', delta: Infinity }], 'defeated'),
  ).toThrow('期望有限数')
})
