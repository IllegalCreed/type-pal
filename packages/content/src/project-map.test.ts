import { describe, expect, test } from 'vitest'
import type { ProjectMap, ProjectMapV2, ProjectMapV3 } from './project-map.js'
import {
  formatProjectMap,
  formatProjectMapV2,
  mapInstanceHeight,
  parseProjectMap,
  parseProjectMapV2,
  validateProjectMap,
  validateProjectMapV2,
} from './project-map.js'

function validMap(): ProjectMapV2 {
  return {
    version: 2,
    width: 2,
    height: 1,
    tilesetId: 'tileset-020',
    layers: [
      {
        id: 'floor',
        name: '地板',
        depthMode: 'flat',
        tiles: [
          [0, null],
          [1024, 2],
        ],
      },
      {
        id: 'objects',
        name: '高物',
        depthMode: 'height',
        tiles: [
          [null, 3],
          [4, null],
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

function utf8Bytes(value: string): number {
  let bytes = 0
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      bytes += 4
      index++
    } else bytes += 3
  }
  return bytes
}

function validV3Map(): ProjectMapV3 {
  const base = validMap()
  return {
    ...base,
    version: 3,
    authoring: {
      version: 1,
      stampPlacements: [
        {
          id: 'placement-tree-1',
          sourceStampId: 'tree',
          sourceStampName: '树',
          anchor: { row: 0, col: 0 },
          visualSlots: [
            { layerId: 'floor', row: 0, col: 0 },
            { layerId: 'objects', row: 0, col: 1 },
          ],
          // 与本组视觉槽同坐标合法：视觉和 collision 是两个独立所有权通道。
          gridPoints: [{ row: 0, col: 0 }],
        },
      ],
    },
  }
}

describe('validateProjectMapV2', () => {
  test('接受 N 层、实例高度、无上限 tileId 与独立碰撞值', () => {
    const map = validateProjectMapV2(validMap())
    expect(map.version).toBe(2)
    expect(map.layers[0]?.tiles[1]?.[0]).toBe(1024)
    expect(mapInstanceHeight(map.layers[0]!, 1, 0)).toBe(0)
    expect(mapInstanceHeight(map.layers[1]!, 1, 0)).toBe(15)
    expect(map.collision[1]?.[0]).toBe(2)
  })

  test('拒绝重复稳定 layer id 与错误矩阵尺寸', () => {
    const duplicate = validMap()
    duplicate.layers.push({ ...duplicate.layers[0]!, name: '重复层' })
    expect(() => validateProjectMapV2(duplicate)).toThrow('重复的稳定 id')

    const badTiles = validMap()
    badTiles.layers[0]!.tiles.pop()
    expect(() => validateProjectMapV2(badTiles)).toThrow('期望 2 行')

    const badCollision = validMap()
    badCollision.collision[0]!.push(0)
    expect(() => validateProjectMapV2(badCollision)).toThrow('期望 2 列')
  })

  test('height 层必须有高度，flat 层只能为 0，空瓦片高度必须为 0', () => {
    const missing = validMap()
    delete missing.layers[1]!.heights
    expect(() => validateProjectMapV2(missing)).toThrow('height 层必须提供')

    const flat = validMap()
    flat.layers[0]!.heights = [
      [1, 0],
      [0, 0],
    ]
    expect(() => validateProjectMapV2(flat)).toThrow('flat 层高度必须为 0')

    const empty = validMap()
    empty.layers[1]!.heights![0]![0] = 1
    expect(() => validateProjectMapV2(empty)).toThrow('空瓦片高度必须为 0')
  })

  test('共享格式化器矩阵逐行紧凑、往返语义与字节幂等', () => {
    const first = formatProjectMapV2(validMap())
    expect(first).toContain('        [0,null]')
    expect(first).not.toContain('\n          0,')
    expect(parseProjectMapV2(first)).toEqual(validateProjectMapV2(validMap()))
    expect(formatProjectMapV2(parseProjectMapV2(first))).toBe(first)
  })

  test('v2 禁止夹带 authoring，联合 guard 对未知版本 fail-loud', () => {
    expect(() => validateProjectMap({ ...validMap(), authoring: { version: 1 } })).toThrow(
      'version 2 禁止携带作者态',
    )
    expect(() => validateProjectMap({ ...validMap(), version: 4 })).toThrow('仅支持 2 或 3')
    expect(() => validateProjectMapV2(validV3Map())).toThrow('仅支持 2')
  })
})

describe('ProjectMapV3 authoring', () => {
  test('非空放置组往返，视觉与碰撞同坐标允许', () => {
    const map = validateProjectMap(validV3Map())
    expect(map.version).toBe(3)
    if (map.version !== 3) throw new Error('期望 v3')
    expect(map.authoring.stampPlacements[0]?.visualSlots).toHaveLength(2)
    const first = formatProjectMap(map)
    expect(parseProjectMap(first)).toEqual(map)
    expect(formatProjectMap(parseProjectMap(first))).toBe(first)
  })

  test('v3 必须有已版本化且非空的 authoring', () => {
    const v3 = validV3Map() as unknown as Record<string, unknown>
    delete v3.authoring
    expect(() => validateProjectMap(v3)).toThrow('authoring: 期望对象')

    const empty = validV3Map()
    empty.authoring.stampPlacements = []
    expect(() => validateProjectMap(empty)).toThrow('至少一个放置组')

    const unknown = validV3Map() as unknown as { authoring: { version: number } }
    unknown.authoring.version = 2
    expect(() => validateProjectMap(unknown)).toThrow('authoring.version: 仅支持 1')
  })

  test('P1：视觉槽与碰撞格点分别排他，但跨通道重叠不冲突', () => {
    const duplicateVisual = validV3Map()
    duplicateVisual.authoring.stampPlacements.push({
      id: 'placement-2',
      anchor: { row: 1, col: 0 },
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [{ row: 1, col: 1 }],
    })
    expect(() => validateProjectMap(duplicateVisual)).toThrow('视觉槽已属于放置组')

    const duplicateCollision = validV3Map()
    duplicateCollision.authoring.stampPlacements.push({
      id: 'placement-2',
      anchor: { row: 1, col: 0 },
      visualSlots: [{ layerId: 'floor', row: 1, col: 0 }],
      gridPoints: [{ row: 0, col: 0 }],
    })
    expect(() => validateProjectMap(duplicateCollision)).toThrow('碰撞格点已属于放置组')
  })

  test('P1：跨组视觉与 collision 同坐标仍允许', () => {
    const crossGroupCrossChannel = validV3Map()
    crossGroupCrossChannel.authoring.stampPlacements[0]!.gridPoints = []
    crossGroupCrossChannel.authoring.stampPlacements.push({
      id: 'placement-2',
      anchor: { row: 1, col: 0 },
      visualSlots: [{ layerId: 'floor', row: 1, col: 0 }],
      gridPoints: [{ row: 0, col: 0 }],
    })
    expect(validateProjectMap(crossGroupCrossChannel).version).toBe(3)
  })

  test('P1：拒绝重复 placement id 及组内重复成员', () => {
    const duplicateId = validV3Map()
    duplicateId.authoring.stampPlacements.push({
      id: 'placement-tree-1',
      anchor: { row: 1, col: 0 },
      visualSlots: [{ layerId: 'floor', row: 1, col: 0 }],
      gridPoints: [],
    })
    expect(() => validateProjectMap(duplicateId)).toThrow('重复放置组 id')

    const duplicateVisual = validV3Map()
    duplicateVisual.authoring.stampPlacements[0]!.visualSlots.push({
      ...duplicateVisual.authoring.stampPlacements[0]!.visualSlots[0]!,
    })
    expect(() => validateProjectMap(duplicateVisual)).toThrow('组内重复视觉槽')

    const duplicateGridPoint = validV3Map()
    duplicateGridPoint.authoring.stampPlacements[0]!.gridPoints.push({ row: 0, col: 0 })
    expect(() => validateProjectMap(duplicateGridPoint)).toThrow('组内重复碰撞格点')
  })

  test('P1：不同视觉层允许拥有相同坐标', () => {
    const sameCoordinateDifferentLayer = validV3Map()
    sameCoordinateDifferentLayer.layers[1]!.tiles[0]![0] = 9
    sameCoordinateDifferentLayer.layers[1]!.heights![0]![0] = 1
    sameCoordinateDifferentLayer.authoring.stampPlacements.push({
      id: 'placement-2',
      anchor: { row: 1, col: 0 },
      visualSlots: [{ layerId: 'objects', row: 0, col: 0 }],
      gridPoints: [],
    })
    expect(validateProjectMap(sameCoordinateDifferentLayer).version).toBe(3)
  })

  test('formatter 对放置组与视觉成员采用规范顺序', () => {
    const shuffled = validV3Map()
    shuffled.authoring.stampPlacements[0]!.visualSlots.reverse()
    shuffled.authoring.stampPlacements.push({
      id: 'a-placement',
      anchor: { row: 1, col: 0 },
      visualSlots: [{ layerId: 'floor', row: 1, col: 0 }],
      gridPoints: [],
    })
    const normalized = parseProjectMap(formatProjectMap(shuffled))
    if (normalized.version !== 3) throw new Error('期望 v3')
    expect(normalized.authoring.stampPlacements.map((placement) => placement.id)).toEqual([
      'a-placement',
      'placement-tree-1',
    ])
    expect(normalized.authoring.stampPlacements[1]!.visualSlots).toEqual([
      { layerId: 'floor', row: 0, col: 0 },
      { layerId: 'objects', row: 0, col: 1 },
    ])
  })

  test('拒绝空视觉成员、悬空图层、空瓦片和越界成员', () => {
    const emptyVisual = validV3Map()
    emptyVisual.authoring.stampPlacements[0]!.visualSlots = []
    expect(() => validateProjectMap(emptyVisual)).toThrow('至少拥有一个视觉槽')

    const missingLayer = validV3Map()
    missingLayer.authoring.stampPlacements[0]!.visualSlots[0]!.layerId = 'missing'
    expect(() => validateProjectMap(missingLayer)).toThrow('图层 "missing" 不存在')

    const emptyTile = validV3Map()
    emptyTile.authoring.stampPlacements[0]!.visualSlots[0] = {
      layerId: 'floor',
      row: 0,
      col: 1,
    }
    expect(() => validateProjectMap(emptyTile)).toThrow('不得指向空瓦片')

    const outside = validV3Map()
    outside.authoring.stampPlacements[0]!.gridPoints[0]!.col = 2
    expect(() => validateProjectMap(outside)).toThrow('超出地图边界')
  })

  test('P4：300 个大型放置组的格式化体积有硬预算，二次格式化字节稳定', () => {
    const width = 80
    const height = 40
    const rows = height * 2
    const cells = width * rows
    const layers = Array.from({ length: 4 }, (_, layerIndex) => ({
      id: `layer-${layerIndex}`,
      name: `层 ${layerIndex}`,
      depthMode: (layerIndex === 0 ? 'flat' : 'height') as 'flat' | 'height',
      tiles: Array.from({ length: rows }, () => Array.from({ length: width }, () => 1)),
      ...(layerIndex === 0
        ? {}
        : { heights: Array.from({ length: rows }, () => Array.from({ length: width }, () => 1)) }),
    }))
    const placements = Array.from({ length: 300 }, (_, placementIndex) => ({
      id: `placement-${placementIndex}`,
      anchor: {
        row: Math.floor((placementIndex * 8) / width),
        col: (placementIndex * 8) % width,
      },
      visualSlots: Array.from({ length: 12 }, (_, memberIndex) => {
        const ordinal = placementIndex * 12 + memberIndex
        const layerIndex = ordinal % layers.length
        const cell = Math.floor(ordinal / layers.length) % cells
        return {
          layerId: `layer-${layerIndex}`,
          row: Math.floor(cell / width),
          col: cell % width,
        }
      }),
      gridPoints: Array.from({ length: 8 }, (_, memberIndex) => {
        const cell = placementIndex * 8 + memberIndex
        return { row: Math.floor(cell / width), col: cell % width }
      }),
    }))
    const map: ProjectMap = {
      version: 3,
      width,
      height,
      tilesetId: 'stress',
      layers,
      collision: Array.from({ length: rows }, () => Array.from({ length: width }, () => 0)),
      authoring: { version: 1, stampPlacements: placements },
    }
    const first = formatProjectMap(map)
    expect(utf8Bytes(first)).toBeLessThan(900_000)
    expect(formatProjectMap(parseProjectMap(first))).toBe(first)
  })
})
