import { describe, expect, test } from 'vitest'
import type { ProjectMap } from './project-map.js'
import {
  formatProjectMap,
  mapInstanceHeight,
  mapInstanceTilesetId,
  parseProjectMap,
  validateProjectMap,
} from './project-map.js'

function validMap(): ProjectMap {
  return {
    version: 4,
    width: 2,
    height: 1,
    tilesetRefs: ['tiles-a', 'tiles-b'],
    layers: [
      {
        id: 'floor',
        name: '地板',
        tiles: [
          [0, 0],
          [null, null],
        ],
        sources: [
          [0, 1],
          [null, null],
        ],
      },
      {
        id: 'objects',
        name: '高物',
        tiles: [
          [null, 3],
          [4, null],
        ],
        sources: [
          [null, 0],
          [1, null],
        ],
        heights: [
          [0, 2],
          [15, 0],
        ],
      },
    ],
    collision: [
      [0, 1],
      [2, 0],
    ],
  }
}

describe('ProjectMap current canonical schema', () => {
  test('同层同号 tileId 可来自不同瓦片集且解析无歧义', () => {
    const map = validateProjectMap(validMap())
    const floor = map.layers[0]!
    expect(floor.tiles[0]).toEqual([0, 0])
    expect(mapInstanceTilesetId(map, floor, 0, 0)).toBe('tiles-a')
    expect(mapInstanceTilesetId(map, floor, 0, 1)).toBe('tiles-b')
    expect(mapInstanceHeight(map.layers[1]!, 1, 0)).toBe(15)
  })

  test('tiles/sources lockstep、来源下标和稳定来源表 fail-loud', () => {
    const missingSource = validMap()
    missingSource.layers[0]!.sources[0]![0] = null
    expect(() => validateProjectMap(missingSource)).toThrow('tiles/sources 必须同时')

    const outOfRange = validMap()
    outOfRange.layers[0]!.sources[0]![0] = 2
    expect(() => validateProjectMap(outOfRange)).toThrow('超出 tilesetRefs')

    const unsorted = validMap()
    unsorted.tilesetRefs = ['tiles-b', 'tiles-a']
    expect(() => validateProjectMap(unsorted)).toThrow('字典序排列')
  })

  test('空瓦片高度必须为零，全零高度矩阵规范化为省略', () => {
    const emptyHeight = validMap()
    emptyHeight.layers[1]!.heights![0]![0] = 1
    expect(() => validateProjectMap(emptyHeight)).toThrow('空瓦片高度必须为 0')

    const allZero = validMap()
    allZero.layers[0]!.heights = [
      [0, 0],
      [0, 0],
    ]
    expect(validateProjectMap(allZero).layers[0]!.heights).toBeUndefined()
  })

  test('作者放置身份与普通内容共同按当前单版本往返', () => {
    const map = validMap()
    map.authoring = {
      version: 1,
      stampPlacements: [
        {
          id: 'path-1',
          sourceStampId: 'path',
          anchor: { row: 0, col: 0 },
          visualSlots: [
            { layerId: 'floor', row: 0, col: 0 },
            { layerId: 'floor', row: 0, col: 1 },
          ],
          gridPoints: [{ row: 0, col: 0 }],
        },
      ],
    }
    const first = formatProjectMap(map)
    expect(first).toContain('"tilesetRefs": ["tiles-a","tiles-b"]')
    expect(first).toContain('"sources"')
    expect(formatProjectMap(parseProjectMap(first))).toBe(first)
  })

  test('单来源逐格来源矩阵以唯一可还原的省略形态落盘', () => {
    const map = validMap()
    map.tilesetRefs = ['tiles-a']
    for (const layer of map.layers)
      layer.sources = layer.tiles.map((row) => row.map((tile) => (tile === null ? null : 0)))
    const text = formatProjectMap(map)
    expect(text).not.toContain('"sources"')
    const parsed = parseProjectMap(text)
    expect(parsed.layers.map(({ sources }) => sources)).toEqual(
      map.layers.map(({ sources }) => sources),
    )
    expect(formatProjectMap(parsed)).toBe(text)
  })

  test('拒绝旧开发版本、重复层和错误矩阵尺寸', () => {
    expect(() => validateProjectMap({ ...validMap(), version: 3 })).toThrow('当前版本 4')
    const duplicate = validMap()
    duplicate.layers.push({ ...duplicate.layers[0]!, name: '重复层' })
    expect(() => validateProjectMap(duplicate)).toThrow('重复的稳定 id')
    const bad = validMap()
    bad.layers[0]!.sources.pop()
    expect(() => validateProjectMap(bad)).toThrow('期望 2 行')
  })
})
