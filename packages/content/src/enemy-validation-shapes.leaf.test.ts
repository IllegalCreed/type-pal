/**
 * TEST-GLM-CONTENT-GUARDS-2 G1：enemy-validation-shapes 六函数直接叶合同。
 * 去重：既有证据全部经父入口（enemy-script.wave2 经 checkEnemyAi 的 rules.when、
 * author-battle-dialogue-boundary 经作者递归、validate-enemy-crosscalls 经
 * validateEnemies 三路），六个导出函数自身此前无任何直接测试；本文件补对象身份、
 * 精确未知键路径、trim、有限数/百分比闭区间/正整数叶轴，各拒绝前放同型合法对照，
 * 不复制父入口已证边界，也不新发更严政策。
 * R1：错误路径用完整 message 全等比较（toThrow(string) 是子串匹配）；对象输入
 * 调用前后对独立快照比较，原始值直接做值断言不做空快照。
 */
import { describe, expect, test } from 'vitest'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/guard-leaf-fixtures.js'
import {
  exactKeys,
  finite,
  nonEmptyString,
  percent,
  positiveInteger,
  record,
} from './enemy-validation-shapes.js'

describe('G1 record', () => {
  test('合法对象原身份透传且内容不被改写', () => {
    const input = { kind: 'wait', ms: 0 }
    expectAcceptsUnchanged((value) => expect(record(value, 'v')).toBe(value), input)
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['数组', ['x']],
    ['字符串', 'x'],
    ['数字0', 0],
    ['false', false],
  ] as const)('%s拒绝且路径精确', (_label, bad) => {
    expectAcceptsUnchanged(() => record({ kind: 'wait', ms: 0 }, 'v'), { kind: 'wait', ms: 0 })
    expectExactError(() => record(bad, 'v'), 'v: 期望对象')
  })
})

describe('G1 exactKeys', () => {
  test('恰好允许键与允许键子集都通过（缺允许键不是本层错误）', () => {
    expect(() => exactKeys({ kind: 'wait', ms: 0 }, ['kind', 'ms'], 'v')).not.toThrow()
    expect(() => exactKeys({ kind: 'wait' }, ['kind', 'ms'], 'v')).not.toThrow()
  })

  test('未知字段拒绝且路径含键名；多个未知按实际键序报第一个', () => {
    expectAcceptsUnchanged(() => exactKeys({ kind: 'wait' }, ['kind'], 'v'), { kind: 'wait' })
    expectExactError(
      () => exactKeys({ kind: 'wait', extra: 1 }, ['kind'], 'v'),
      'v.extra: 未知字段',
    )
    expectAcceptsUnchanged(() => exactKeys({ a: 1, b: 2 }, ['a', 'b'], 'v'), { a: 1, b: 2 })
    expectExactError(() => exactKeys({ a: 1, b: 2 }, [], 'v'), 'v.a: 未知字段')
  })
})

describe('G1 nonEmptyString', () => {
  test('合法串原值返回；内部空格合法（只禁首尾空白）', () => {
    const input = 'actor.zhao-linger'
    expect(nonEmptyString(input, 'v')).toBe(input)
    expect(() => nonEmptyString('a b', 'v')).not.toThrow()
  })

  test.each([
    ['空串', ''],
    ['纯空白', '   '],
    ['首尾空格', ' hero '],
    ['非字符串', 42],
    ['null', null],
  ] as const)('%s拒绝', (_label, bad) => {
    expect(nonEmptyString('hero', 'v')).toBe('hero')
    expectExactError(() => nonEmptyString(bad, 'v'), 'v: 期望非空且无首尾空格的 string')
  })
})

describe('G1 finite', () => {
  test('有限数原值返回（0/负数/小数都合法）', () => {
    expect(finite(0, 'v')).toBe(0)
    expect(finite(-3.5, 'v')).toBe(-3.5)
  })

  test.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['字符串', '1'],
    ['null', null],
  ] as const)('%s拒绝', (_label, bad) => {
    expect(finite(0, 'v')).toBe(0)
    expectExactError(() => finite(bad, 'v'), 'v: 期望有限数')
  })
})

describe('G1 percent 闭区间', () => {
  test('端点0与100合法且原值返回', () => {
    expect(percent(0, 'v')).toBe(0)
    expect(percent(100, 'v')).toBe(100)
  })

  test.each([
    ['负小数', -0.5, 'v: 期望 0..100 有限数'],
    ['超上界', 100.01, 'v: 期望 0..100 有限数'],
    ['Infinity', Number.POSITIVE_INFINITY, 'v: 期望有限数'],
    ['NaN', Number.NaN, 'v: 期望有限数'],
  ] as const)('%s拒绝（非有限先走有限叶）', (_label, bad, message) => {
    expect(percent(100, 'v')).toBe(100)
    expectExactError(() => percent(bad, 'v'), message)
  })
})

describe('G1 positiveInteger', () => {
  test('1与大整数合法且原值返回', () => {
    expect(positiveInteger(1, 'v')).toBe(1)
    expect(positiveInteger(1000, 'v')).toBe(1000)
  })

  test.each([
    ['0', 0],
    ['负整数', -1],
    ['正小数', 1.5],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['NaN', Number.NaN],
    ['字符串', '1'],
  ] as const)('%s拒绝', (_label, bad) => {
    expect(positiveInteger(1, 'v')).toBe(1)
    expectExactError(() => positiveInteger(bad, 'v'), 'v: 期望正整数')
  })
})
