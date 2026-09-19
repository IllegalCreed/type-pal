/**
 * TEST-CONTENT-RESIDUAL-1 A11：map-index 剩余拒绝边界（map-index.ts:41–60）。
 * map-index.contracts.test.ts 已覆盖非法 id/重复 id/路径重复/覆盖自身/normalize trim——
 * 本文件只补容器与字段层未钉轴：version 非 1、maps 非数组、条目非对象、name 空/空白、path 非字符串。
 */
import { describe, expect, test } from 'vitest'
import { validateMapIndex } from './map-index.js'

const entry = { id: 'map-a', name: 'A', path: 'maps/a.json' }

describe('A11 剩余拒绝边界', () => {
  test.each([
    ['version 非 1', { version: 2, maps: [entry] }, /仅支持 1，收到 2/],
    ['version 缺席（undefined）', { maps: [entry] }, /仅支持 1，收到 undefined/],
    ['maps 非数组', { version: 1, maps: {} }, /maps: 期望数组/],
    ['条目非对象', { version: 1, maps: ['x'] }, /maps\[0\]: 期望对象/],
    ['name 空串', { version: 1, maps: [{ ...entry, name: '' }] }, /name: 期望非空字符串/],
    ['name 纯空白', { version: 1, maps: [{ ...entry, name: '   ' }] }, /name: 期望非空字符串/],
    ['path 非字符串', { version: 1, maps: [{ ...entry, path: 5 }] }, /path: 期望字符串/],
  ])('%s 拒绝', (_name, value, pattern) => {
    expect(() => validateMapIndex(value)).toThrow(pattern)
  })
  test('根非对象拒绝；合法单条目正控（与既有用例互补不重复）', () => {
    expect(() => validateMapIndex(null)).toThrow('mapIndex: 期望对象')
    expect(() => validateMapIndex([entry])).toThrow('mapIndex: 期望对象')
    expect(() => validateMapIndex({ version: 1, maps: [entry] })).not.toThrow()
  })
})
