/**
 * TEST-GLM-CONTENT-GUARDS-2 G2/G3：enemy-ai-condition-guard 直接叶/组合边界。
 * 去重：enemy-script.wave2.test.ts 的 11 行表已在 ai.rules[0].when 路径证明
 * chance 上界(101)/hpBelow 下界(-1)/hpAbove 非有限(Infinity)/anyPlayerHpBelow
 * 多余键/turn '<' 与 value 0.5/allyCount '==' 与 value -1/role 首尾空格/
 * difficulty 空表与空元素；四 kind 共用同一个 percent 调用，上下界合同已由父入口
 * 证毕——本文件的百分比行是共享叶的直入口变体（新增独立入口、完整 message 路径
 * 与输入保真断言），不另称"未证分支"。不测 evalAiCond 求值语义。
 * R1：错误路径用完整 message 全等比较；对象输入（含合法正控）调用前后对独立
 * 快照比较。R2：每个拒绝先跑同 kind 合法正控，坏输入相对正控只改一个字段。
 * C2：嵌套 turn（not.cond）与未知 kind 行的合法正控走同一入口，坏输入从合法
 * turn 复制仅改 op，不由别的 kind 代替。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/guard-leaf-fixtures.js'
import { checkEnemyAiCondition } from './enemy-ai-condition-guard.js'

describe('G2 四类百分比条件共用 percent 叶（直入口变体）', () => {
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

describe('G2 离散叶轴', () => {
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

  test('turn 负整数拒绝（非整数轴 wave2 已证，此处证负数半界）', () => {
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

  test('playerInParty 空串拒绝（trim 轴 wave2 已证）', () => {
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

  test('difficulty 非数组与元素非串拒绝（空表/空元素轴 wave2 已证）', () => {
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
