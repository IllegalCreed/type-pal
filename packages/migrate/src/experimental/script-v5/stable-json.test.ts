import { createHash } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import {
  fastJsonSha256,
  stableJson,
  stableJsonFramedSha256,
  stableJsonSha256,
} from './stable-json.js'

describe('script-v5 strict stable JSON', () => {
  test('普通 JSON 对象不受键插入顺序影响', () => {
    expect(stableJson({ z: 1, a: { y: 2, x: 3 } })).toBe(stableJson({ a: { x: 3, y: 2 }, z: 1 }))
    expect(stableJsonSha256({ z: 1, a: 2 })).toBe(stableJsonSha256({ a: 2, z: 1 }))
  })

  test.each([
    null,
    true,
    -0,
    1.25e30,
    '引号"、反斜线\\、换行\n与😀',
    [1, 'two', false, null, { z: 1, a: 2 }],
    { '10': 'ten', '2': 'two', '4294967295': 'not-index', '01': 'name', z: 1, a: 2 },
  ])('流式摘要与 canonical JSON 字节完全一致 %#', (value) => {
    const expected = createHash('sha256').update(stableJson(value)).digest('hex')
    expect(stableJsonSha256(value)).toBe(expected)
  })

  test('长度前缀序列摘要与历史逐条 framing 完全一致', () => {
    const values = [{ '10': 'ten', '2': 'two', z: 1 }, ['中文', '😀', -0, 1.25e30], null]
    const expected = createHash('sha256')
    for (const value of values) {
      const serialized = stableJson(value)
      expected
        .update(String(Buffer.byteLength(serialized)))
        .update(':')
        .update(serialized)
    }
    expect(stableJsonFramedSha256(values)).toBe(expected.digest('hex'))
  })

  test('长度前缀序列摘要仍拒绝非法值', () => {
    expect(() => stableJsonFramedSha256([{ ok: true }, undefined])).toThrow('stable JSON')
  })

  test.each([
    null,
    true,
    -0,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    '引号"、反斜线\\、换行\n与😀',
    [1, undefined, false, null, { z: 1, omitted: undefined, a: 2 }],
    { '10': 'ten', '2': 'two', omitted: undefined, z: 1, a: 2 },
    new Date(0),
  ])('快速流式摘要与 JSON.stringify 字节完全一致 %#', (value) => {
    const serialized = JSON.stringify(value)
    if (serialized === undefined) throw new Error('test fixture unexpectedly omitted')
    const expected = createHash('sha256').update(serialized).digest('hex')
    expect(fastJsonSha256(value)).toBe(expected)
  })

  test('快速流式摘要保留 JSON.stringify 的 root 与循环失败语义', () => {
    expect(() => fastJsonSha256(undefined)).toThrow('unsupported undefined root')
    const cyclic: { self?: unknown } = {}
    cyclic.self = cyclic
    expect(() => fastJsonSha256(cyclic)).toThrow('circular structure')
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
    expect(() => stableJsonSha256(value)).toThrow('stable JSON')
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
