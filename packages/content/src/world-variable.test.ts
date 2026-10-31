import { describe, expect, test } from 'vitest'
import {
  initialWorldVariablesV1,
  validateWorldVariableIdV1,
  validateWorldVariableRegistryV1,
  WORLD_VARIABLE_ID_MAX_LENGTH,
} from './world-variable.js'

describe('WorldVariableRegistryV1', () => {
  test('validates the exact discriminated registry and returns a detached value', () => {
    const input = {
      'quest.opened': {
        kind: 'flag',
        name: '任务已开启',
        description: '主线第一章',
        initial: false,
      },
      reputation: {
        kind: 'number',
        name: '声望',
        description: '',
        initial: 2.5,
      },
    }
    const checked = validateWorldVariableRegistryV1(input)
    expect(checked).toEqual(input)
    expect(checked).not.toBe(input)
    expect(checked['quest.opened']).not.toBe(input['quest.opened'])
  })

  test.each([
    ['', /不能为空/],
    [' quest', /首尾空格/],
    ['2quest', /字母开头/],
    ['quest name', /只允许/],
    ['sys:screenWave', /保留给引擎/],
  ])('rejects invalid author id %j', (id, message) => {
    expect(() => validateWorldVariableIdV1(id)).toThrow(message)
  })

  test('rejects unknown keys, malformed text and non-finite number defaults', () => {
    expect(() =>
      validateWorldVariableRegistryV1({
        ok: { kind: 'flag', name: 'OK', description: '', initial: false, extra: true },
      }),
    ).toThrow(/未知字段 extra/)
    expect(() =>
      validateWorldVariableRegistryV1({
        ok: { kind: 'flag', name: ' ', description: '', initial: false },
      }),
    ).toThrow(/首尾空格/)
    expect(() =>
      validateWorldVariableRegistryV1({
        ok: { kind: 'number', name: 'OK', description: '', initial: Number.POSITIVE_INFINITY },
      }),
    ).toThrow(/有限数值/)
  })

  test('builds fresh runtime values from author defaults', () => {
    const registry = validateWorldVariableRegistryV1({
      opened: { kind: 'flag', name: '开启', description: '', initial: true },
      score: { kind: 'number', name: '分数', description: '', initial: 7 },
    })
    const first = initialWorldVariablesV1(registry)
    const second = initialWorldVariablesV1(registry)
    expect(first).toEqual({ flags: { opened: true }, vars: { score: 7 } })
    expect(second).toEqual(first)
    expect(second.flags).not.toBe(first.flags)
    expect(second.vars).not.toBe(first.vars)
  })

  test('id length accepts the 128-character boundary and rejects 129 characters', () => {
    expect(validateWorldVariableIdV1('a'.repeat(128))).toBe('a'.repeat(128))
    expect(() => validateWorldVariableIdV1('a'.repeat(129))).toThrow(
      `长度不得超过 ${WORLD_VARIABLE_ID_MAX_LENGTH}`,
    )
  })

  test('registry guard rejects numeric flags and boolean numbers', () => {
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
    const registry = {
      'quest.started': { kind: 'flag', name: '任务已开始', description: '', initial: true },
      'score.total': { kind: 'number', name: '总分', description: '', initial: 7 },
    } as const

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
