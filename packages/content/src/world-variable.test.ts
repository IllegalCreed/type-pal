import { describe, expect, test } from 'vitest'
import {
  initialWorldVariablesV1,
  validateWorldVariableIdV1,
  validateWorldVariableRegistryV1,
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
})
