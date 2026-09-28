import { describe, expect, test } from 'vitest'
import {
  initialWorldVariablesV1,
  validateWorldVariableIdV1,
  validateWorldVariableRegistryV1,
  WORLD_VARIABLE_DESCRIPTION_MAX_LENGTH,
  WORLD_VARIABLE_ID_MAX_LENGTH,
  WORLD_VARIABLE_NAME_MAX_LENGTH,
} from './world-variable.js'

const registry = {
  'quest.started': { kind: 'flag', name: '任务已开始', description: '', initial: true },
  'score.total': { kind: 'number', name: '总分', description: '', initial: 7 },
} as const

describe('world-variable 剩余合同', () => {
  test('id guard rejects empty, untrimmed, oversize, non-pattern and sys-prefixed ids', () => {
    expect(() => validateWorldVariableIdV1('')).toThrow('不能为空')
    expect(() => validateWorldVariableIdV1(' a ')).toThrow('首尾空格')
    expect(() => validateWorldVariableIdV1('a'.repeat(WORLD_VARIABLE_ID_MAX_LENGTH + 1))).toThrow(
      `长度不得超过 ${WORLD_VARIABLE_ID_MAX_LENGTH}`,
    )
    expect(() => validateWorldVariableIdV1('1abc')).toThrow('只允许字母开头')
    expect(() => validateWorldVariableIdV1('sys:engine')).toThrow('sys: 命名空间保留给引擎')
    expect(validateWorldVariableIdV1('quest.started')).toBe('quest.started')
  })

  test('registry guard enforces name/description lengths and flag/number initial types', () => {
    expect(() =>
      validateWorldVariableRegistryV1({
        a: {
          kind: 'flag',
          name: 'x'.repeat(WORLD_VARIABLE_NAME_MAX_LENGTH + 1),
          description: '',
          initial: false,
        },
      }),
    ).toThrow(`长度不得超过 ${WORLD_VARIABLE_NAME_MAX_LENGTH}`)
    expect(() =>
      validateWorldVariableRegistryV1({
        a: {
          kind: 'flag',
          name: 'x',
          description: 'x'.repeat(WORLD_VARIABLE_DESCRIPTION_MAX_LENGTH + 1),
          initial: false,
        },
      }),
    ).toThrow(`长度不得超过 ${WORLD_VARIABLE_DESCRIPTION_MAX_LENGTH}`)
    expect(() =>
      validateWorldVariableRegistryV1({
        a: { kind: 'flag', name: 'x', description: '', initial: 0 },
      }),
    ).toThrow('flag 期望 boolean')
    expect(() =>
      validateWorldVariableRegistryV1({
        a: { kind: 'number', name: 'x', description: '', initial: true },
      }),
    ).toThrow('number 期望有限数值')
  })

  test('initial values split into disjoint flags and vars maps without leaking references', () => {
    const initial = initialWorldVariablesV1(JSON.parse(JSON.stringify(registry)))
    expect(initial.flags).toEqual({ 'quest.started': true })
    expect(initial.vars).toEqual({ 'score.total': 7 })
    // 修改产物不回写 registry。
    expect(initial.flags['quest.started']).toBe(true)
    expect(initial.vars['score.total']).toBe(7)
  })
})
