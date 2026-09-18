/**
 * TEST-CONTENT-CONTRACTS-1 B1/B5/B6：map-index 规范化/冲突/身份与 tileset 注册表（map-index.ts、tileset.ts）。
 * 与 asset 路径 API 的「拒绝不规范化」相对：本 API 先 trim 再逐段规范化（合同分栏）。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot, spriteAssetRecord } from './__tests__/glm-content-contract-fixtures.js'
import { validateAssetCatalog } from './asset.js'
import {
  mapAssetById,
  nextMapAssetId,
  normalizeMapAssetPath,
  validateMapIndex,
} from './map-index.js'
import { resolveTilesetAsset, validateTilesets } from './tileset.js'

describe('B1 normalizeMapAssetPath · trim + 规范化（与 asset 路径合同不同）', () => {
  test('空白被 trim、点段被消除、保留原值语义', () => {
    expect(normalizeMapAssetPath(' maps/a.json ')).toBe('maps/a.json')
    expect(normalizeMapAssetPath('maps/./a.json')).toBe('maps/a.json')
  })
  test.each([
    ['绝对路径', '/abs.json'],
    ['反斜杠', 'a\\b.json'],
    ['上跳出根', '../escape.json'],
    ['非 .json', 'maps/a.txt'],
  ])('%s 拒绝', (_name, path) => {
    expect(() => normalizeMapAssetPath(path)).toThrow()
  })
})

describe('B1 validateMapIndex · 稳定 ID/路径冲突/自身保护', () => {
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
    ['重复 id', [...index(), { id: 'map-a', name: 'X', path: 'maps/x.json' }], /重复 "map-a"/],
    [
      '规范化后路径重复',
      [...index(), { id: 'map-b', name: 'B', path: ' maps/a.json ' }],
      /规范化后重复/,
    ],
    [
      '覆盖自身索引',
      [{ id: 'map-i', name: 'I', path: 'content/maps/index.json' }],
      /不得覆盖 map index 自身/,
    ],
  ])('%s 拒绝', (_name, maps, pattern) => {
    expect(() => validateMapIndex({ version: 1, maps })).toThrow(pattern)
  })
  test('nextMapAssetId 唯一性选择与 mapAssetById 查找', () => {
    const validated = validateMapIndex({ version: 1, maps: index() })
    expect(nextMapAssetId(validated, 'map-a')).toBe('map-a-2') // 冲突时派生
    expect(nextMapAssetId(validated, 'map-new')).toBe('map-new') // 不冲突时原样
    expect(mapAssetById(validated, 'map-a')).toBeDefined()
    expect(mapAssetById(validated, 'ghost')).toBeUndefined()
  })
})

describe('B6 validateTilesets · 注册表守卫与资产解析', () => {
  const tilesetDef = { id: 'tiles-main', name: '主瓦片集', category: 'outdoor', asset: 'sprite.x' }
  test('合法定义通过且输入不变；resolveTilesetAsset 精确解析', () => {
    const raw = [tilesetDef]
    const before = deepSnapshot(raw)
    const validated = validateTilesets(raw)
    expect(validated).toEqual([tilesetDef])
    expect(raw).toEqual(before)
    expect(resolveTilesetAsset('tiles-main', validated)).toBe('sprite.x')
    expect(() => resolveTilesetAsset('ghost', validated)).toThrow(/不在注册表/) // 现行合同：fail-loud
  })
  test.each([
    ['重复 id', [tilesetDef, tilesetDef], /重复/],
    ['缺 asset', [{ id: 't2', name: 'X', category: 'c' }], /asset/],
  ])('%s 拒绝', (_name, defs, pattern) => {
    expect(() => validateTilesets(defs)).toThrow(pattern)
  })
  test('带 catalog 时 asset 不存在/kind 不符拒绝', () => {
    const catalog = validateAssetCatalog({
      version: 1,
      assets: {
        'sprite.x': {
          ...spriteAssetRecord('sprite.x'),
          kind: 'music',
          mediaType: 'audio/midi',
          path: 'assets/runtime/x.mid',
          origin: { kind: 'licensed' },
        },
      },
    })
    expect(() => validateTilesets([tilesetDef], catalog)).toThrow(/期望 tileset|不存在|kind/)
  })
})
