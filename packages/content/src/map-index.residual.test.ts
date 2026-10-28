/**
 * TEST-CONTENT-RESIDUAL-1 A11：map-index 剩余拒绝边界（validateMapIndex）。
 * map-index.test.ts 与 map-index.contracts.test.ts 承担 id/路径冲突及规范化——
 * 本文件只补容器与字段层未钉轴：version 缺席、maps 非数组、条目非对象、name 空/空白、path 非字符串。
 */
import { describe, expect, test } from 'vitest'
import { validateMapIndex } from './map-index.js'

const entry = { id: 'map-a', name: 'A', path: 'maps/a.json' }

describe('A11 剩余拒绝边界', () => {
  test.each([
    ['version 缺席（undefined）', { maps: [entry] }, /仅支持 1，收到 undefined/],
    ['maps 非数组', { version: 1, maps: {} }, /maps: 期望数组/],
    ['条目非对象', { version: 1, maps: ['x'] }, /maps\[0\]: 期望对象/],
    ['name 空串', { version: 1, maps: [{ ...entry, name: '' }] }, /name: 期望非空字符串/],
    ['name 纯空白', { version: 1, maps: [{ ...entry, name: '   ' }] }, /name: 期望非空字符串/],
    ['path 非字符串', { version: 1, maps: [{ ...entry, path: 5 }] }, /path: 期望字符串/],
  ])('%s 拒绝', (_name, value, pattern) => {
    expect(() => validateMapIndex(value)).toThrow(pattern)
  })
  test('根 null 和数组均按对象入口合同拒绝', () => {
    expect(() => validateMapIndex(null)).toThrow('mapIndex: 期望对象')
    expect(() => validateMapIndex([entry])).toThrow('mapIndex: 期望对象')
  })
})
