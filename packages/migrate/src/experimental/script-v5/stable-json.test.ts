import { describe, expect, test } from 'vitest'
import { stableJson, stableJsonSha256 } from './stable-json.js'

describe('script-v5 strict stable JSON', () => {
  test('普通 JSON 对象不受键插入顺序影响', () => {
    expect(stableJson({ z: 1, a: { y: 2, x: 3 } })).toBe(stableJson({ a: { x: 3, y: 2 }, z: 1 }))
    expect(stableJsonSha256({ z: 1, a: 2 })).toBe(stableJsonSha256({ a: 2, z: 1 }))
  })

  test.each([
    ['Map', new Map([['key', 'value']])],
    ['Set', new Set(['value'])],
    ['Date', new Date(0)],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['undefined', undefined],
    ['function', () => undefined],
  ])('拒绝会被 JSON 静默丢失或折叠的 %s', (_name, value) => {
    expect(() => stableJson(value)).toThrow('stable JSON')
  })

  test('拒绝数组或对象中的 undefined，而不是产生摘要碰撞', () => {
    expect(() => stableJson([undefined])).toThrow('unsupported undefined')
    expect(() => stableJson({ omitted: undefined })).toThrow('unsupported undefined')
    expect(stableJson({})).toBe('{}')
  })

  test('拒绝循环引用', () => {
    const value: { self?: unknown } = {}
    value.self = value
    expect(() => stableJson(value)).toThrow('cycle')
  })

  test('稀疏数组不会与显式 null 碰撞', () => {
    const sparse = new Array(1)
    expect(() => stableJson(sparse)).toThrow('sparse array')
    expect(stableJson([null])).toBe('[null]')
  })

  test('__proto__ 数据键被保留，Symbol 与访问器属性被拒绝', () => {
    const protoKey = JSON.parse('{"__proto__":1}') as unknown
    expect(stableJson(protoKey)).toBe('{"__proto__":1}')
    expect(() => stableJson({ [Symbol('hidden')]: 1 })).toThrow('non-data object property')
    const accessor = Object.defineProperty({}, 'value', {
      enumerable: true,
      get: () => 1,
    })
    expect(() => stableJson(accessor)).toThrow('non-data object property')
  })
})
