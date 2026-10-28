/**
 * TEST-CONTENT-CONTRACTS-1 B2/B3/B5：project-map v4 矩阵/来源/格式往返（project-map.ts）。
 * 关键合同：height×2 矩阵行数、tile0 非空格（tiles/sources 同 null 或同非 null）、
 * format/parse 确定性往返、不污染输入。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import type { ProjectMap } from './project-map.js'
import { formatProjectMap, parseProjectMap, validateProjectMap } from './project-map.js'

const map = (): ProjectMap => ({
  version: 4,
  width: 2,
  height: 1,
  tilesetRefs: ['tiles-main'],
  layers: [
    {
      id: 'base',
      name: '地面',
      tiles: [
        [1, 0],
        [1, 1],
      ],
      sources: [
        [0, 0],
        [0, 0],
      ],
    },
  ],
  collision: [
    [0, 1],
    [0, 0],
  ],
})

describe('B2 validateProjectMap · v4 矩阵合同', () => {
  test('合法地图通过且语义等价返回（验证器可重建对象，serialize 相同）；输入不变', () => {
    const raw = map()
    const before = deepSnapshot(raw)
    const validated = validateProjectMap(raw)
    expect(validated).toEqual(raw) // 现实现重建对象，只保证语义等价，不保证同引用
    expect(raw).toEqual(before)
  })
  test('矩阵行数必须是 height×2（截断/超长拒绝）', () => {
    const short = map()
    short.layers[0]!.tiles = [[1, 0]]
    expect(() => validateProjectMap(short)).toThrow('projectMap.layers[0].tiles: 期望 2 行')
    const long = map()
    long.layers[0]!.tiles = [
      [1, 0],
      [1, 1],
      [1, 1],
    ]
    expect(() => validateProjectMap(long)).toThrow('projectMap.layers[0].tiles: 期望 2 行')
  })
  test('tile 0 非空格：tiles=0/sources=0 合法；tiles 非空配 null source 拒绝（同空同非空门）', () => {
    const zero = map()
    zero.layers[0]!.tiles = [
      [0, 0],
      [0, 0],
    ]
    zero.layers[0]!.sources = [
      [0, 0],
      [0, 0],
    ]
    expect(() => validateProjectMap(zero)).not.toThrow()
    const mixed = map()
    mixed.layers[0]!.sources = [
      [null, 0],
      [0, 0],
    ] // tiles[0][0]=1 配 null source
    expect(() => validateProjectMap(mixed)).toThrow('tiles/sources 必须同时为空或同时非空')
    const emptyBoth = map()
    emptyBoth.layers[0]!.tiles = [
      [null, null],
      [null, null],
    ]
    emptyBoth.layers[0]!.sources = [
      [null, null],
      [null, null],
    ]
    expect(() => validateProjectMap(emptyBoth)).not.toThrow()
  })
})

describe('B5 formatProjectMap/parseProjectMap · 确定性往返', () => {
  test('format→parse 完整往返保真；两次 format 字节相同；输入不被污染', () => {
    const raw = map()
    const before = deepSnapshot(raw)
    const text1 = formatProjectMap(raw)
    const text2 = formatProjectMap(raw)
    expect(text1).toBe(text2) // 确定性
    const parsed = parseProjectMap(text1)
    expect(parsed).toEqual(raw)
    expect(raw).toEqual(before) // 不污染
    // parse 再 format 稳定
    expect(formatProjectMap(parsed)).toBe(text1)
  })
})
