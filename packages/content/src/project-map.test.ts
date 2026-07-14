import { describe, expect, test } from 'vitest'
import type { ProjectMapV2 } from './project-map.js'
import {
  formatProjectMapV2,
  mapInstanceHeight,
  parseProjectMapV2,
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
})
