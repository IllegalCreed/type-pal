import { describe, expect, test } from 'vitest'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import { checkEnemyAiCondition } from './enemy-ai-condition-guard.js'

describe('percentage conditions', () => {
  test.each([
    {
      kind: 'hpAbove',
      good: { kind: 'hpAbove', percent: 100 },
      bad: { kind: 'hpAbove', percent: 101 },
    },
    {
      kind: 'hpBelow',
      good: { kind: 'hpBelow', percent: 100 },
      bad: { kind: 'hpBelow', percent: 100.5 },
    },
    {
      kind: 'anyPlayerHpBelow',
      good: { kind: 'anyPlayerHpBelow', percent: 0 },
      bad: { kind: 'anyPlayerHpBelow', percent: -1 },
    },
    {
      kind: 'chance',
      good: { kind: 'chance', percent: 0 },
      bad: { kind: 'chance', percent: -1 },
    },
  ])('$kind 越界拒绝、同kind合法端点正控通过且实际输入不变', ({ good, bad }) => {
    expectAcceptsUnchanged(() => checkEnemyAiCondition(good, 'when'), good)
    const before = deepSnapshot(bad)
    expectExactError(() => checkEnemyAiCondition(bad, 'when'), 'when.percent: 期望 0..100 有限数')
    expect(bad).toEqual(before)
  })

  test('缺 percent 字段走有限数叶且路径精确', () => {
    const control = { kind: 'chance', percent: 50 }
    expectAcceptsUnchanged(() => checkEnemyAiCondition(control, 'when'), control)
    const bad = { kind: 'chance' }
    const before = deepSnapshot(bad)
    expectExactError(() => checkEnemyAiCondition(bad, 'when'), 'when.percent: 期望有限数')
    expect(bad).toEqual(before)
  })
})

describe('condition fields', () => {
  test('kind 缺失在入口叶拒绝（同入口合法正控先过）', () => {
    const control = { kind: 'aloneAlive' }
    expectAcceptsUnchanged(() => checkEnemyAiCondition(control, 'when'), control)
    const bad = {}
    const before = deepSnapshot(bad)
    expectExactError(
      () => checkEnemyAiCondition(bad, 'when'),
      'when.kind: 期望非空且无首尾空格的 string',
    )
    expect(bad).toEqual(before)
  })

  test('rejects a negative turn count at its field', () => {
    const control = { kind: 'turn', op: '>=', value: 0 }
    expectAcceptsUnchanged(() => checkEnemyAiCondition(control, 'when'), control)
    const bad = { kind: 'turn', op: '>=', value: -1 }
    const before = deepSnapshot(bad)
    expectExactError(() => checkEnemyAiCondition(bad, 'when'), 'when.value: 期望非负整数')
    expect(bad).toEqual(before)
  })

  test('allyCount 非整数拒绝（switch 分支与 turn 各有独立检查代码）', () => {
    const control = { kind: 'allyCount', op: '<=', value: 0 }
    expectAcceptsUnchanged(() => checkEnemyAiCondition(control, 'when'), control)
    const bad = { kind: 'allyCount', op: '<=', value: 0.5 }
    const before = deepSnapshot(bad)
    expectExactError(() => checkEnemyAiCondition(bad, 'when'), 'when.value: 期望非负整数')
    expect(bad).toEqual(before)
  })

  test('rejects an empty actor key in a party condition', () => {
    const control = { kind: 'playerInParty', role: 'role.zhao' }
    expectAcceptsUnchanged(() => checkEnemyAiCondition(control, 'when'), control)
    const bad = { kind: 'playerInParty', role: '' }
    const before = deepSnapshot(bad)
    expectExactError(
      () => checkEnemyAiCondition(bad, 'when'),
      'when.role: 期望非空且无首尾空格的 string',
    )
    expect(bad).toEqual(before)
  })

  test('rejects an invalid difficulty list or entry', () => {
    const control = { kind: 'difficulty', in: ['hard', 'normal'] }
    expectAcceptsUnchanged(() => checkEnemyAiCondition(control, 'when'), control)
    const nonArray = { kind: 'difficulty', in: 'normal' }
    const nonArrayBefore = deepSnapshot(nonArray)
    expectExactError(() => checkEnemyAiCondition(nonArray, 'when'), 'when.in: 期望非空难度 id 数组')
    expect(nonArray).toEqual(nonArrayBefore)
    const badElement = { kind: 'difficulty', in: ['normal', 42] }
    const before = deepSnapshot(badElement)
    expectExactError(
      () => checkEnemyAiCondition(badElement, 'when'),
      'when.in[1]: 期望非空且无首尾空格的 string',
    )
    expect(badElement).toEqual(before)
  })

  test('无参条件正控通过、多余键拒绝且只破多余键一轴', () => {
    const alone = { kind: 'aloneAlive' }
    expectAcceptsUnchanged(() => checkEnemyAiCondition(alone, 'when'), alone)
    const first = { kind: 'firstOfKind' }
    expectAcceptsUnchanged(() => checkEnemyAiCondition(first, 'when'), first)
    const badAlone = { kind: 'aloneAlive', percent: 50 }
    const before = deepSnapshot(badAlone)
    expectExactError(() => checkEnemyAiCondition(badAlone, 'when'), 'when.percent: 未知字段')
    expect(badAlone).toEqual(before)
    const badFirst = { kind: 'firstOfKind', extra: 1 }
    const firstBefore = deepSnapshot(badFirst)
    expectExactError(() => checkEnemyAiCondition(badFirst, 'when'), 'when.extra: 未知字段')
    expect(badFirst).toEqual(firstBefore)
  })
})

describe('nested conditions', () => {
  test('preserves all, any and not with their nested conditions', () => {
    const input = {
      kind: 'all',
      of: [
        { kind: 'turn', op: '==', value: 3 },
        { kind: 'hpAbove', percent: 20 },
        { kind: 'anyPlayerHpBelow', percent: 80 },
        {
          kind: 'any',
          of: [
            { kind: 'playerInParty', role: 'role.zhao' },
            { kind: 'difficulty', in: ['hard', 'normal'] },
          ],
        },
        { kind: 'not', cond: { kind: 'allyCount', op: '<=', value: 0 } },
      ],
    }
    expectAcceptsUnchanged(() => checkEnemyAiCondition(input, 'when'), input)
  })

  test('of 空数组现状可过（容器形状合同，不涉求值语义）且输入不变', () => {
    for (const kind of ['all', 'any'] as const) {
      const input = { kind, of: [] }
      expectAcceptsUnchanged(() => checkEnemyAiCondition(input, 'when'), input)
    }
  })

  test('of 非数组拒绝且路径精确', () => {
    const control = { kind: 'all', of: [{ kind: 'aloneAlive' }] }
    expectAcceptsUnchanged(() => checkEnemyAiCondition(control, 'when'), control)
    const bad = { kind: 'all', of: {} }
    const before = deepSnapshot(bad)
    expectExactError(() => checkEnemyAiCondition(bad, 'when'), 'when.of: 期望条件数组')
    expect(bad).toEqual(before)
  })

  test('坏子节点在完整 where 路径上报告且同输入快照不变（同型合法对照先过）', () => {
    const control = {
      kind: 'all',
      of: [{ kind: 'aloneAlive' }, { kind: 'chance', percent: 100 }],
    }
    expectAcceptsUnchanged(() => checkEnemyAiCondition(control, 'when'), control)
    const input = {
      kind: 'all',
      of: [{ kind: 'aloneAlive' }, { kind: 'chance', percent: 101 }],
    }
    const before = deepSnapshot(input)
    expectExactError(
      () => checkEnemyAiCondition(input, 'when'),
      'when.of[1].percent: 期望 0..100 有限数',
    )
    expect(input).toEqual(before)
  })

  test('not 子条件走 cond 子路径：同入口合法 turn 仅改 op，缺 cond 报对象叶', () => {
    const legalTurnInNot = { kind: 'not', cond: { kind: 'turn', op: '>=', value: 1 } }
    expectAcceptsUnchanged(() => checkEnemyAiCondition(legalTurnInNot, 'when'), legalTurnInNot)
    const badCond = { kind: 'not', cond: { ...legalTurnInNot.cond, op: '<' } }
    const badBefore = deepSnapshot(badCond)
    expectExactError(() => checkEnemyAiCondition(badCond, 'when'), 'when.cond.op: 期望 ==|>=')
    expect(badCond).toEqual(badBefore)
    const missing = { kind: 'not' }
    const missingBefore = deepSnapshot(missing)
    expectExactError(() => checkEnemyAiCondition(missing, 'when'), 'when.cond: 期望对象')
    expect(missing).toEqual(missingBefore)
  })

  test('未知 kind 精确报错且输入不变（同入口合法正控先过）', () => {
    const control = { kind: 'aloneAlive' }
    expectAcceptsUnchanged(() => checkEnemyAiCondition(control, 'when'), control)
    const input = { kind: 'hypothetical' }
    const before = deepSnapshot(input)
    expectExactError(
      () => checkEnemyAiCondition(input, 'when'),
      'when.kind: 未知敌人 AI 条件 hypothetical',
    )
    expect(input).toEqual(before)
  })
})
