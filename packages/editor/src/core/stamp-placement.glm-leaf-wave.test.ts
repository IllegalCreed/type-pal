import {
  buildBlankProjectMap,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { buildStampPlacementIndex, stampVisualOwner } from './stamp-ownership.js'
import { nextStampPlacementId, stampPlacementActualHeight } from './stamp-placement.js'

function placedMap() {
  let map = buildBlankProjectMap(6, 6, 'tiles-a')
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles-a', height: 0 },
    { layerId: 'floor', row: 0, col: 1, tileId: 1, tilesetId: 'tiles-a', height: 0 },
    { layerId: 'floor', row: 3, col: 3, tileId: 2, tilesetId: 'tiles-a', height: 1 },
  ])
  map = withProjectMapStampPlacements(map, [
    {
      id: 'place-001',
      sourceStampId: 'stamp.a',
      sourceStampName: '图章甲',
      anchor: { row: 0, col: 0 },
      visualSlots: [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'floor', row: 0, col: 1 },
      ],
      gridPoints: [{ row: 0, col: 0 }],
    },
    {
      id: 'place-002',
      anchor: { row: 3, col: 3 },
      visualSlots: [{ layerId: 'floor', row: 3, col: 3 }],
      gridPoints: [{ row: 3, col: 3 }],
    },
  ])
  return map
}

describe('stamp-ownership 剩余合同', () => {
  test('index resolves owners by slot key and reports duplicate ownership loud', () => {
    const map = placedMap()
    const index = buildStampPlacementIndex(map)
    expect(index.byId.size).toBe(2)
    expect(index.byId.get('place-001')?.visualSlots).toHaveLength(2)
    expect(index.collisionOwnerByKey.get('0:0')).toBe('place-001')
    expect(index.collisionOwnerByKey.get('3:3')).toBe('place-002')
  })

  test('stampVisualOwner answers per-slot with the owning placement id', () => {
    const map = placedMap()
    expect(stampVisualOwner(map, { layerId: 'floor', row: 0, col: 1 })).toBe('place-001')
    expect(stampVisualOwner(map, { layerId: 'floor', row: 4, col: 4 })).toBeUndefined()
  })
})

describe('stamp-placement 剩余合同', () => {
  test('nextStampPlacementId sanitizes and dedupes existing ids', () => {
    const map = placedMap()
    expect(nextStampPlacementId(map, 'place-001')).toBe('place-001-2')
    expect(nextStampPlacementId(map, 'place-009')).toBe('place-009')
    const sanitized = nextStampPlacementId(map, 'place.001')
    expect(map.authoring?.stampPlacements.some((placement) => placement.id === sanitized)).toBe(
      false,
    )
  })

  test('actual height adds the relative offset to the non-negative base', () => {
    expect(stampPlacementActualHeight(3, 2)).toBe(5)
    expect(stampPlacementActualHeight(0, 0)).toBe(0)
    expect(() => stampPlacementActualHeight(3, -7)).toThrow('相对高度必须是非负安全整数')
  })
})
