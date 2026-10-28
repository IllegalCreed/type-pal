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
  test('id length accepts the 128-character boundary and rejects 129 characters', () => {
    expect(validateWorldVariableIdV1('a'.repeat(128))).toBe('a'.repeat(128))
    expect(() => validateWorldVariableIdV1('a'.repeat(129))).toThrow(
      `长度不得超过 ${WORLD_VARIABLE_ID_MAX_LENGTH}`,
    )
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
    const initial = initialWorldVariablesV1(registry)
    expect(initial.flags).toEqual({ 'quest.started': true })
    expect(initial.vars).toEqual({ 'score.total': 7 })
    // Runtime writes must not change the author definitions or a later new game's defaults.
    initial.flags['quest.started'] = false
    initial.vars['score.total'] = 99
    expect(registry['quest.started'].initial).toBe(true)
    expect(registry['score.total'].initial).toBe(7)
    expect(initialWorldVariablesV1(registry)).toEqual({
      flags: { 'quest.started': true },
      vars: { 'score.total': 7 },
    })
  })
})
