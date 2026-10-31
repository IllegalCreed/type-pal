/**
 * TEST-CONTENT-CONTRACTS-1 B1/B5：map-index 规范化、查找与身份派生。
 * 与 asset 路径 API 的「拒绝不规范化」相对：本 API 先 trim 再逐段规范化（合同分栏）。
 */
import { describe, expect, test } from 'vitest'
import {
  mapAssetById,
  nextMapAssetId,
  normalizeMapAssetPath,
  validateMapIndex,
} from './map-index.js'

describe('B1 normalizeMapAssetPath · trim + 规范化（与 asset 路径合同不同）', () => {
  test('空白被 trim、点段被消除、保留原值语义', () => {
    expect(normalizeMapAssetPath(' maps/a.json ')).toBe('maps/a.json')
    expect(normalizeMapAssetPath('maps/./a.json')).toBe('maps/a.json')
  })
  test.each([
    ['反斜杠', 'a\\b.json', /期望工程相对路径/],
    ['非 .json', 'maps/a.txt', /必须指向 .json/],
  ])('%s 拒绝', (_name, path, pattern) => {
    expect(() => normalizeMapAssetPath(path)).toThrow(pattern)
  })
})

describe('B1 validateMapIndex · 稳定 ID/名称规范化与查找', () => {
  const index = () => [{ id: 'map-a', name: 'A', path: 'maps/a.json' }]
  test('合法索引通过；name 保真 trim 返回', () => {
    const validated = validateMapIndex({
      version: 1,
      maps: [...index(), { id: 'map-b', name: ' B ', path: ' maps/b.json ' }],
    })
    expect(validated.maps[1]).toEqual({ id: 'map-b', name: 'B', path: 'maps/b.json' })
  })
  test.each([
    ['非法 id', [{ id: 'bad id!', name: 'X', path: 'maps/x.json' }], /非法稳定 id/],
  ])('%s 拒绝', (_name, maps, pattern) => {
    expect(() => validateMapIndex({ version: 1, maps })).toThrow(pattern)
  })
  test('nextMapAssetId 唯一性选择与 mapAssetById 查找', () => {
    const validated = validateMapIndex({ version: 1, maps: index() })
    expect(nextMapAssetId(validated, 'map-a')).toBe('map-a-2') // 冲突时派生
    expect(nextMapAssetId(validated, 'map-new')).toBe('map-new') // 不冲突时原样
    expect(mapAssetById(validated, 'map-a')).toBe(validated.maps[0])
    expect(mapAssetById(validated, 'ghost')).toBeUndefined()
  })
})
