import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  initialWorldVariablesV1,
  validateWorldVariableIdV1,
  validateWorldVariableRegistryV1,
  type WorldVariableRegistryV1,
} from './world-variable.js'

function variableDefinitions() {
  return {
    'flag.opened-chest:1': { kind: 'flag', name: '开箱标记', description: '', initial: false },
    'num.counter_2': { kind: 'number', name: '计数器', description: '运行计数', initial: -3.5 },
  } satisfies WorldVariableRegistryV1
}

describe('author variable length limits', () => {
  test('ID 128/129、name 80/81、description 500/501 各自恰好越界即拒；上界全绿', () => {
    const base = variableDefinitions()
    const idMax = 'a'.repeat(128)
    expect(() =>
      validateWorldVariableRegistryV1({ [idMax]: base['flag.opened-chest:1'] }),
    ).not.toThrow()
    const idOver = 'a'.repeat(129)
    expect(() =>
      validateWorldVariableRegistryV1({ [idOver]: base['flag.opened-chest:1'] }),
    ).toThrow(`worldVariables.${idOver}: 长度不得超过 128`)
    const nameMax = '名'.repeat(80)
    const nameOver = '名'.repeat(81)
    expect(() =>
      validateWorldVariableRegistryV1({ v: { ...base['num.counter_2'], name: nameMax } }),
    ).not.toThrow()
    expect(() =>
      validateWorldVariableRegistryV1({ v: { ...base['num.counter_2'], name: nameOver } }),
    ).toThrow(`worldVariables.v.name: 长度不得超过 80`)
    const descMax = 'd'.repeat(500)
    const descOver = 'd'.repeat(501)
    expect(() =>
      validateWorldVariableRegistryV1({ v: { ...base['num.counter_2'], description: descMax } }),
    ).not.toThrow()
    expect(() =>
      validateWorldVariableRegistryV1({ v: { ...base['num.counter_2'], description: descOver } }),
    ).toThrow(`worldVariables.v.description: 长度不得超过 500`)
  })
  test('小数/负数/false 仍是合法 initial（数值与布尔各按自身域）', () => {
    const registry = validateWorldVariableRegistryV1({
      n1: { kind: 'number', name: 'n', description: '', initial: 0.25 },
      n2: { kind: 'number', name: 'n', description: '', initial: -7 },
      f1: { kind: 'flag', name: 'f', description: '', initial: false },
    })
    expect(registry.n1?.initial).toBe(0.25)
    expect(registry.n2?.initial).toBe(-7)
    expect(registry.f1?.initial).toBe(false)
  })
})

describe('invalid registry shape', () => {
  test('registry/definition 错型、kind 错型、flag 非布尔、number 非有限各自精确路径', () => {
    expect(() => validateWorldVariableRegistryV1(null)).toThrow('worldVariables: 期望对象')
    expect(() => validateWorldVariableRegistryV1([1])).toThrow('worldVariables: 期望对象')
    expect(() => validateWorldVariableRegistryV1({ v: 'not-object' })).toThrow(
      'worldVariables.v: 期望对象',
    )
    expect(() => validateWorldVariableRegistryV1({ v: 3 })).toThrow('worldVariables.v: 期望对象')
    expect(() =>
      validateWorldVariableRegistryV1({
        v: { kind: 'text', name: 'n', description: '', initial: '' },
      }),
    ).toThrow('worldVariables.v.kind: 只允许 flag / number')
    expect(() =>
      validateWorldVariableRegistryV1({
        v: { kind: 'flag', name: 'n', description: '', initial: 'yes' },
      }),
    ).toThrow('worldVariables.v.initial: flag 期望 boolean')
    expect(() =>
      validateWorldVariableRegistryV1({
        v: { kind: 'number', name: 'n', description: '', initial: Number.NaN },
      }),
    ).toThrow('worldVariables.v.initial: number 期望有限数值')
    expect(() =>
      validateWorldVariableRegistryV1({
        v: { kind: 'number', name: 'n', description: '', initial: Number.POSITIVE_INFINITY },
      }),
    ).toThrow('worldVariables.v.initial: number 期望有限数值')
  })
  test.each([
    ['', 'worldVariables.<empty>: 不能为空'],
    ['a b', 'worldVariables.a b: 只允许字母开头及字母、数字、点、冒号、下划线、连字符'],
  ])('登记表拒绝无效键 %j 并定位实际条目', (id, message) => {
    const definition = variableDefinitions()['flag.opened-chest:1']
    expect(() => validateWorldVariableRegistryV1({ [id]: definition })).toThrow(new Error(message))
  })

  test.each([
    [{ name: ' A' }, 'worldVariables.entry.name: 不得包含首尾空格'],
    [{ description: 3 }, 'worldVariables.entry.description: 期望字符串'],
  ])('登记表拒绝格式错误的标签字段 %j', (invalid, message) => {
    const definition = variableDefinitions()['flag.opened-chest:1']
    expect(() => validateWorldVariableRegistryV1({ entry: { ...definition, ...invalid } })).toThrow(
      new Error(message),
    )
  })

  test('验证拒绝不修改原输入（同一对象深快照在最后消费后比较）', () => {
    const bad = {
      v: { kind: 'number', name: 'n', description: '', initial: Number.NaN },
      ok: variableDefinitions()['flag.opened-chest:1'],
    }
    const snapshot = deepSnapshot(bad)
    expect(() => validateWorldVariableRegistryV1(bad)).toThrow()
    expect(bad).toEqual(snapshot)
  })
})

describe('variable labels and reserved IDs', () => {
  test('空 description 合法、空 name 非法；sys: 只约束 ID 不约束 name/description', () => {
    expect(() =>
      validateWorldVariableRegistryV1({
        v: { kind: 'flag', name: 'n', description: '', initial: true },
      }),
    ).not.toThrow()
    expect(() =>
      validateWorldVariableRegistryV1({
        v: { kind: 'flag', name: '', description: '', initial: true },
      }),
    ).toThrow('worldVariables.v.name: 不能为空')
    // name/description 含 "sys:" 前缀文本合法（规则只作用于 ID）
    expect(() =>
      validateWorldVariableRegistryV1({
        v: { kind: 'flag', name: 'sys:标记', description: 'sys:说明', initial: true },
      }),
    ).not.toThrow()
    expect(() => validateWorldVariableIdV1('sys:anything')).toThrow('sys: 命名空间保留给引擎')
    expect(() =>
      validateWorldVariableRegistryV1({
        'sys:battleField': variableDefinitions()['flag.opened-chest:1'],
      }),
    ).toThrow(new Error('worldVariables.sys:battleField: sys: 命名空间保留给引擎'))
    expect(validateWorldVariableIdV1('system-flag')).toBe('system-flag') // 相似前缀不受限
  })
})

describe('runtime initialization', () => {
  test('an empty registry creates separate empty flags and number maps', () => {
    const world = initialWorldVariablesV1({})
    expect(world).toEqual({ flags: {}, vars: {} })
    expect(world.flags).not.toBe(world.vars)
  })

  test('两次初始化互不污染；改结果不污染作者定义；改定义不污染已产出的运行值', () => {
    const registry = validateWorldVariableRegistryV1(variableDefinitions())
    const registrySnapshot = deepSnapshot(registry)
    const first = initialWorldVariablesV1(registry)
    const second = initialWorldVariablesV1(registry)
    expect(first).toEqual({
      flags: { 'flag.opened-chest:1': false },
      vars: { 'num.counter_2': -3.5 },
    })
    expect(second).toEqual(first)
    first.flags['flag.opened-chest:1'] = true
    first.vars['num.counter_2'] = 999
    // 第一次结果被改不影响第二次，也不污染作者定义
    expect(second.flags['flag.opened-chest:1']).toBe(false)
    expect(second.vars['num.counter_2']).toBe(-3.5)
    expect(registry).toEqual(registrySnapshot)
    // 改作者定义不影响已产出的运行值对象
    const flagDef = registry['flag.opened-chest:1']
    if (flagDef?.kind !== 'flag') throw new Error('Expected opened-chest flag definition')
    flagDef.initial = true
    expect(second.flags['flag.opened-chest:1']).toBe(false)
  })
})
