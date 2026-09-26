/**
 * TEST-GLM-CONTENT-GUARDS-2 G2/G3：enemy-ai-condition-guard 直接叶/组合边界。
 * 去重：enemy-script.wave2.test.ts 的 11 行表已在 ai.rules[0].when 路径证明
 * chance 上界(101)/hpBelow 下界(-1)/hpAbove 非有限(Infinity)/anyPlayerHpBelow
 * 多余键/turn '<' 与 value 0.5/allyCount '==' 与 value -1/role 首尾空格/
 * difficulty 空表与空元素——本文件不再复制这些轴，只补同型未证半界与独立检查分支、
 * all/any/not 容器形状与坏子节点完整 where 路径；不测 evalAiCond 求值语义。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { checkEnemyAiCondition } from './enemy-ai-condition-guard.js'

describe('G2 四类百分比条件共用 percent 叶', () => {
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
  ])('$kind 越界拒绝、合法端点正控通过且实际输入不变', ({ good, bad }) => {
    checkEnemyAiCondition(good, 'when')
    const before = deepSnapshot(bad)
    expect(() => checkEnemyAiCondition(bad, 'when')).toThrow('when.percent: 期望 0..100 有限数')
    expect(bad).toEqual(before)
  })

  test('缺 percent 字段走有限数叶且路径精确', () => {
    checkEnemyAiCondition({ kind: 'chance', percent: 50 }, 'when')
    const bad = { kind: 'chance' }
    const before = deepSnapshot(bad)
    expect(() => checkEnemyAiCondition(bad, 'when')).toThrow('when.percent: 期望有限数')
    expect(bad).toEqual(before)
  })
})

describe('G2 离散叶轴', () => {
  test('kind 缺失在入口叶拒绝', () => {
    const bad = {}
    expect(() => checkEnemyAiCondition(bad, 'when')).toThrow(
      'when.kind: 期望非空且无首尾空格的 string',
    )
  })

  test('turn 负整数拒绝（非整数轴 wave2 已证，此处证负数半界）', () => {
    checkEnemyAiCondition({ kind: 'turn', op: '>=', value: 0 }, 'when')
    const bad = { kind: 'turn', op: '>=', value: -1 }
    const before = deepSnapshot(bad)
    expect(() => checkEnemyAiCondition(bad, 'when')).toThrow('when.value: 期望非负整数')
    expect(bad).toEqual(before)
  })

  test('allyCount 非整数拒绝（switch 分支与 turn 各有独立检查代码）', () => {
    checkEnemyAiCondition({ kind: 'allyCount', op: '<=', value: 0 }, 'when')
    const bad = { kind: 'allyCount', op: '<=', value: 0.5 }
    const before = deepSnapshot(bad)
    expect(() => checkEnemyAiCondition(bad, 'when')).toThrow('when.value: 期望非负整数')
    expect(bad).toEqual(before)
  })

  test('playerInParty 空串拒绝（trim 轴 wave2 已证）', () => {
    checkEnemyAiCondition({ kind: 'playerInParty', role: 'role.zhao' }, 'when')
    const bad = { kind: 'playerInParty', role: '' }
    const before = deepSnapshot(bad)
    expect(() => checkEnemyAiCondition(bad, 'when')).toThrow(
      'when.role: 期望非空且无首尾空格的 string',
    )
    expect(bad).toEqual(before)
  })

  test('difficulty 非数组与元素非串拒绝（空表/空元素轴 wave2 已证）', () => {
    checkEnemyAiCondition({ kind: 'difficulty', in: ['hard', 'normal'] }, 'when')
    const nonArray = { kind: 'difficulty', in: 'normal' }
    expect(() => checkEnemyAiCondition(nonArray, 'when')).toThrow('when.in: 期望非空难度 id 数组')
    const badElement = { kind: 'difficulty', in: ['normal', 42] }
    const before = deepSnapshot(badElement)
    expect(() => checkEnemyAiCondition(badElement, 'when')).toThrow(
      'when.in[1]: 期望非空且无首尾空格的 string',
    )
    expect(badElement).toEqual(before)
  })

  test('无参条件正控通过、多余键拒绝且只破多余键一轴', () => {
    checkEnemyAiCondition({ kind: 'aloneAlive' }, 'when')
    checkEnemyAiCondition({ kind: 'firstOfKind' }, 'when')
    const badAlone = { kind: 'aloneAlive', percent: 50 }
    const before = deepSnapshot(badAlone)
    expect(() => checkEnemyAiCondition(badAlone, 'when')).toThrow('when.percent: 未知字段')
    expect(badAlone).toEqual(before)
    expect(() => checkEnemyAiCondition({ kind: 'firstOfKind', extra: 1 }, 'when')).toThrow(
      'when.extra: 未知字段',
    )
  })
})

describe('G3 组合容器', () => {
  test('wave2 未覆盖的六类条件嵌套 all/any/not 合法且输入不变', () => {
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
    const before = deepSnapshot(input)
    expect(() => checkEnemyAiCondition(input, 'when')).not.toThrow()
    expect(input).toEqual(before)
  })

  test('of 空数组现状可过（容器形状合同，不涉求值语义）且输入不变', () => {
    for (const kind of ['all', 'any'] as const) {
      const input = { kind, of: [] }
      const before = deepSnapshot(input)
      expect(() => checkEnemyAiCondition(input, 'when')).not.toThrow()
      expect(input).toEqual(before)
    }
  })

  test('of 非数组拒绝且路径精确', () => {
    checkEnemyAiCondition({ kind: 'all', of: [{ kind: 'aloneAlive' }] }, 'when')
    const bad = { kind: 'all', of: {} }
    const before = deepSnapshot(bad)
    expect(() => checkEnemyAiCondition(bad, 'when')).toThrow('when.of: 期望条件数组')
    expect(bad).toEqual(before)
  })

  test('坏子节点在完整 where 路径上报告且同输入快照不变', () => {
    const input = {
      kind: 'all',
      of: [{ kind: 'aloneAlive' }, { kind: 'chance', percent: 101 }],
    }
    const before = deepSnapshot(input)
    expect(() => checkEnemyAiCondition(input, 'when')).toThrow(
      'when.of[1].percent: 期望 0..100 有限数',
    )
    expect(input).toEqual(before)
  })

  test('not 子条件走 cond 子路径且缺 cond 报对象叶', () => {
    checkEnemyAiCondition({ kind: 'not', cond: { kind: 'aloneAlive' } }, 'when')
    const badCond = { kind: 'not', cond: { kind: 'turn', op: '<', value: 1 } }
    expect(() => checkEnemyAiCondition(badCond, 'when')).toThrow('when.cond.op: 期望 ==|>=')
    const missing = { kind: 'not' }
    expect(() => checkEnemyAiCondition(missing, 'when')).toThrow('when.cond: 期望对象')
  })

  test('未知 kind 精确报错且输入不变', () => {
    const input = { kind: 'hypothetical' }
    const before = deepSnapshot(input)
    expect(() => checkEnemyAiCondition(input, 'when')).toThrow(
      'when.kind: 未知敌人 AI 条件 hypothetical',
    )
    expect(input).toEqual(before)
  })
})
