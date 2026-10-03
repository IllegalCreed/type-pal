import type { ProjectMap } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  buildStampPlacementIndex,
  floodFillStampPlacementTiles,
  seedStampPlacementIndexDelta,
} from './stamp-ownership.js'

function fixtureMap(): ProjectMap {
  let map = buildBlankProjectMap(3, 2, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
    { layerId: 'floor', row: 1, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
  ])
  return withProjectMapStampPlacements(map, [
    {
      id: 'duo',
      sourceStampId: 'duo',
      sourceStampName: '双格',
      anchor: { row: 0, col: 0 },
      visualSlots: [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'floor', row: 1, col: 0 },
      ],
      gridPoints: [],
    },
  ])
}

describe('TEST-GLM-WAVE-L-1 L06 stamp ownership guards', () => {
  test('组内 fill 对未知组、未知层与出界起点都返回空编辑', () => {
    const map = fixtureMap()
    expect(
      floodFillStampPlacementTiles(map, 'nope', 'floor', { row: 0, col: 0 }, 9, 'tiles', 0),
    ).toEqual([])
    expect(
      floodFillStampPlacementTiles(map, 'duo', 'missing-layer', { row: 0, col: 0 }, 9, 'tiles', 0),
    ).toEqual([])
    expect(
      floodFillStampPlacementTiles(map, 'duo', 'floor', { row: 99, col: 0 }, 9, 'tiles', 0),
    ).toEqual([])
  })

  test('差分登记对同一 afterMap 幂等返回同一索引', () => {
    const before = fixtureMap()
    const after = withProjectMapStampPlacements(before, [])
    const first = seedStampPlacementIndexDelta(before, after, {
      removedPlacementIds: ['duo'],
    })
    const second = seedStampPlacementIndexDelta(before, after, {
      removedPlacementIds: ['duo'],
    })
    expect(second).toBe(first)
    expect(first.byId.has('duo')).toBe(false)
    expect(buildStampPlacementIndex(before).byId.has('duo')).toBe(true)
  })

  test('移除登记里的未知 id 被安全跳过，不改变既有归属', () => {
    const before = fixtureMap()
    const after = withProjectMapStampPlacements(before, [])
    const index = seedStampPlacementIndexDelta(before, after, {
      removedPlacementIds: ['duo', 'ghost'],
    })
    expect(index.byId.size).toBe(0)
    expect(index.visualOwnerByKey.get('floor:0:0')).toBeUndefined()
    expect(index.visualOwnerByKey.get('floor:1:0')).toBeUndefined()
  })
})
