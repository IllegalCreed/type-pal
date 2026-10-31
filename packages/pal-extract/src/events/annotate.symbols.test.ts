/** Unknown symbols-sidecar JSON is validated independently of command annotation. */
import { describe, expect, test } from 'vitest'
import { parseSymbols, type Symbols } from './annotate.js'

describe('symbols JSON input contract', () => {
  test('合法映射保留；空对象合法', () => {
    const input: Symbols = {
      item: { '62': '止血草' },
      spell: { '296': '御剑' },
      person: { '36': '李逍遥' },
      enemy: { '398': '蝙蝠' },
      scene: { '17': '客栈' },
    }
    expect(parseSymbols(input)).toEqual({
      item: { '62': '止血草' },
      spell: { '296': '御剑' },
      person: { '36': '李逍遥' },
      enemy: { '398': '蝙蝠' },
      scene: { '17': '客栈' },
    })
    expect(parseSymbols({})).toEqual({})
  })

  test('symbols 顶层必须是对象', () => {
    for (const value of [null, [], 7, true, 'text']) {
      expect(() => parseSymbols(value)).toThrow('symbols: 期望对象')
    }
  })

  test('拒绝未知 symbols 表名并给出路径', () => {
    expect(() => parseSymbols({ nope: {} })).toThrow('symbols.nope: 未知字段')
  })

  test('各 symbols 表必须是对象映射', () => {
    for (const value of [null, [], 7, true, 'text']) {
      expect(() => parseSymbols({ item: value })).toThrow('symbols.item: 期望对象')
    }
  })

  test('symbols 表值必须是字符串并给出键路径', () => {
    for (const value of [null, [], 7, true, {}]) {
      expect(() => parseSymbols({ item: { '62': value } })).toThrow('symbols.item.62: 期望字符串')
    }
  })
})
