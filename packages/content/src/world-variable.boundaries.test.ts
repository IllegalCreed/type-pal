/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 A1-A4：作者世界变量边界（world-variable.ts）。
 * world-variable.test.ts:9/40/58 已覆盖判别 registry/未知字段/非有限默认/fresh 初始化；
 * 本文件补长度边界精确轴、错型错误路径、空文本域规则与初始化双向独立性。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot, legalVariable } from './__tests__/glm-state-boundary-fixtures.js'
import {
  initialWorldVariablesV1,
  validateWorldVariableIdV1,
  validateWorldVariableRegistryV1,
  WORLD_VARIABLE_DESCRIPTION_MAX_LENGTH,
  WORLD_VARIABLE_ID_MAX_LENGTH,
  WORLD_VARIABLE_NAME_MAX_LENGTH,
} from './world-variable.js'

describe('A1 长度边界（合法上界与超界只差一轴）', () => {
  test('ID 128/129、name 80/81、description 500/501 各自恰好越界即拒；上界全绿', () => {
    const base = legalVariable()
    const idMax = 'a'.repeat(WORLD_VARIABLE_ID_MAX_LENGTH)
    expect(() =>
      validateWorldVariableRegistryV1({ [idMax]: base['flag.opened-chest:1']! }),
    ).not.toThrow()
    const idOver = 'a'.repeat(WORLD_VARIABLE_ID_MAX_LENGTH + 1)
    expect(() =>
      validateWorldVariableRegistryV1({ [idOver]: base['flag.opened-chest:1']! }),
    ).toThrow(`worldVariables.${idOver}: 长度不得超过 ${WORLD_VARIABLE_ID_MAX_LENGTH}`)
    const nameMax = '名'.repeat(WORLD_VARIABLE_NAME_MAX_LENGTH)
    const nameOver = '名'.repeat(WORLD_VARIABLE_NAME_MAX_LENGTH + 1)
    expect(() =>
      validateWorldVariableRegistryV1({ v: { ...base['num.counter_2']!, name: nameMax } }),
    ).not.toThrow()
    expect(() =>
      validateWorldVariableRegistryV1({ v: { ...base['num.counter_2']!, name: nameOver } }),
    ).toThrow(`worldVariables.v.name: 长度不得超过 ${WORLD_VARIABLE_NAME_MAX_LENGTH}`)
    const descMax = 'd'.repeat(WORLD_VARIABLE_DESCRIPTION_MAX_LENGTH)
    const descOver = 'd'.repeat(WORLD_VARIABLE_DESCRIPTION_MAX_LENGTH + 1)
    expect(() =>
      validateWorldVariableRegistryV1({ v: { ...base['num.counter_2']!, description: descMax } }),
    ).not.toThrow()
    expect(() =>
      validateWorldVariableRegistryV1({ v: { ...base['num.counter_2']!, description: descOver } }),
    ).toThrow(`worldVariables.v.description: 长度不得超过 ${WORLD_VARIABLE_DESCRIPTION_MAX_LENGTH}`)
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

describe('A2 错型错误路径与原输入不变', () => {
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
  test('验证拒绝不修改原输入（同一对象深快照在最后消费后比较）', () => {
    const bad = {
      v: { kind: 'number', name: 'n', description: '', initial: Number.NaN },
      ok: legalVariable()['flag.opened-chest:1']!,
    }
    const snapshot = deepSnapshot(bad)
    expect(() => validateWorldVariableRegistryV1(bad)).toThrow()
    expect(bad).toEqual(snapshot)
  })
})

describe('A3 空文本域与 sys 命名空间规则分域', () => {
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
    expect(validateWorldVariableIdV1('system-flag')).toBe('system-flag') // 相似前缀不受限
  })
})

describe('A4 初始化双向独立性', () => {
  test('两次初始化互不污染；改结果不污染作者定义；改定义不污染已产出的运行值', () => {
    const registry = validateWorldVariableRegistryV1(legalVariable())
    const registrySnapshot = deepSnapshot(registry)
    const first = initialWorldVariablesV1(registry)
    const second = initialWorldVariablesV1(registry)
    expect(first).toEqual(second)
    first.flags['flag.opened-chest:1'] = true
    first.vars['num.counter_2'] = 999
    // 第一次结果被改不影响第二次，也不污染作者定义
    expect(second.flags['flag.opened-chest:1']).toBe(false)
    expect(second.vars['num.counter_2']).toBe(-3.5)
    expect(registry).toEqual(registrySnapshot)
    // 改作者定义不影响已产出的运行值对象
    const flagDef = registry['flag.opened-chest:1']!
    if (flagDef.kind !== 'flag') throw new Error('kind')
    flagDef.initial = true
    expect(second.flags['flag.opened-chest:1']).toBe(false)
  })
})
