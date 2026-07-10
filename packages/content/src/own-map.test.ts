import { describe, expect, test } from 'vitest'
import type { OwnMap } from './own-map.js'
import { validateOwnMap } from './own-map.js'

function validMap(): OwnMap {
  return {
    version: 1,
    width: 2,
    height: 1,
    tileset: 'tileset/20.rle',
    layers: [
      {
        id: 'floor',
        name: '地板',
        occlude: false,
        tiles: [
          [0, null],
          [1024, 2],
        ],
      },
    ],
    collision: [
      [0, 1],
      [2, 0],
    ],
  }
}

describe('validateOwnMap', () => {
  test('接受 N 层 v1、无上限 tileId 与独立碰撞值', () => {
    const map = validateOwnMap(validMap())
    expect(map.version).toBe(1)
    expect(map.layers[0]?.tiles[1]?.[0]).toBe(1024)
    expect(map.collision[1]?.[0]).toBe(2)
  })

  test('拒绝重复稳定 layer id', () => {
    const map = validMap()
    map.layers.push({ ...map.layers[0]!, name: '重复层' })
    expect(() => validateOwnMap(map)).toThrow('重复的稳定 id')
  })

  test('拒绝视觉层或碰撞层尺寸不等于 2H × W', () => {
    const badTiles = validMap()
    badTiles.layers[0]!.tiles.pop()
    expect(() => validateOwnMap(badTiles)).toThrow('期望 2 行')

    const badCollision = validMap()
    badCollision.collision[0]!.push(0)
    expect(() => validateOwnMap(badCollision)).toThrow('期望 2 列')
  })

  test('拒绝负 tileId、负碰撞值与空层数组', () => {
    const badTile = validMap()
    badTile.layers[0]!.tiles[0]![0] = -1
    expect(() => validateOwnMap(badTile)).toThrow('非负整数 tileId')

    const badCollision = validMap()
    badCollision.collision[0]![0] = -1
    expect(() => validateOwnMap(badCollision)).toThrow('非负整数')

    const noLayers = validMap()
    noLayers.layers = []
    expect(() => validateOwnMap(noLayers)).toThrow('至少需要一个视觉层')
  })
})
