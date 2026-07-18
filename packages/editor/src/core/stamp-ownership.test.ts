import type { ProjectMap, StampPlacementGroupV1 } from '@type-pal/content'
import { buildBlankProjectMap, withProjectMapStampPlacements } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { visualSlotKey } from './map-selection.js'
import {
  buildStampPlacementIndex,
  directStampPlacementOwners,
  inheritStampPlacementIndex,
  seedStampPlacementIndexDelta,
} from './stamp-ownership.js'

function filledMap(width: number, height: number): ProjectMap {
  const map = buildBlankProjectMap(width, height, 'tiles')
  return {
    ...map,
    layers: map.layers.map((layer) => ({
      ...layer,
      tiles: layer.tiles.map((row) => row.map(() => 1)),
    })),
  }
}

function placement(
  id: string,
  visualSlots: StampPlacementGroupV1['visualSlots'],
  gridPoints: StampPlacementGroupV1['gridPoints'],
): StampPlacementGroupV1 {
  const anchor = visualSlots[0] ?? gridPoints[0] ?? { row: 0, col: 0 }
  return {
    id,
    anchor: { row: anchor.row, col: anchor.col },
    visualSlots: visualSlots.map((ref) => ({ ...ref })),
    gridPoints: gridPoints.map((ref) => ({ ...ref })),
  }
}

function expectSameOwners<K, V>(
  indexed: { readonly size: number; get(key: K): V | undefined },
  direct: ReadonlyMap<K, V>,
): void {
  expect(indexed.size).toBe(direct.size)
  for (const [key, owner] of direct) expect(indexed.get(key)).toBe(owner)
}

describe('stamp ownership derived index', () => {
  test('3000 groups × 20 members build exact owners once and cached lookup does not rescan authoring', () => {
    const width = 200
    const placements = Array.from({ length: 3_000 }, (_, placementIndex) => {
      const visualSlots = Array.from({ length: 12 }, (_, memberIndex) => {
        const index = placementIndex * 12 + memberIndex
        return { layerId: 'floor', row: Math.floor(index / width), col: index % width }
      })
      const gridPoints = Array.from({ length: 8 }, (_, memberIndex) => {
        const index = placementIndex * 8 + memberIndex
        return { row: Math.floor(index / width), col: index % width }
      })
      return placement(
        `placement-${placementIndex.toString().padStart(4, '0')}`,
        visualSlots,
        gridPoints,
      )
    })
    const map = withProjectMapStampPlacements(filledMap(width, 90), placements)
    expect(map.version).toBe(3)
    if (map.version !== 3) throw new Error('scale fixture must be a v3 project map')

    let authoringReads = 0
    const observed = { ...map } as ProjectMap
    Object.defineProperty(observed, 'authoring', {
      enumerable: true,
      get: () => {
        authoringReads++
        return map.authoring
      },
    })

    const index = buildStampPlacementIndex(observed)
    const readsAfterBuild = authoringReads
    expect(index.byId.size).toBe(3_000)
    expect(index.visualOwnerByKey.size).toBe(36_000)
    expect(index.collisionOwnerByKey.size).toBe(24_000)
    expect(buildStampPlacementIndex(observed)).toBe(index)

    let found = 0
    for (let query = 0; query < 10_000; query++) {
      const memberIndex = query % 36_000
      const key = visualSlotKey({
        layerId: 'floor',
        row: Math.floor(memberIndex / width),
        col: memberIndex % width,
      })
      if (index.visualOwnerByKey.has(key)) found++
    }
    expect(found).toBe(10_000)
    expect(authoringReads).toBe(readsAfterBuild)

    const direct = directStampPlacementOwners(observed)
    expectSameOwners(index.visualOwnerByKey, direct.visual)
    expectSameOwners(index.collisionOwnerByKey, direct.collision)
  })

  test('delta seed removes and upserts only affected ownership while ordinary map edits share the index', () => {
    const basePlacements = [
      placement('a', [{ layerId: 'floor', row: 0, col: 0 }], [{ row: 0, col: 0 }]),
      placement('b', [{ layerId: 'floor', row: 1, col: 0 }], [{ row: 1, col: 0 }]),
      placement('c', [{ layerId: 'floor', row: 2, col: 0 }], [{ row: 2, col: 0 }]),
    ]
    const before = withProjectMapStampPlacements(filledMap(8, 8), basePlacements)
    const beforeIndex = buildStampPlacementIndex(before)
    const changedA = placement(
      'a',
      [
        { layerId: 'floor', row: 4, col: 1 },
        { layerId: 'floor', row: 3, col: 1 },
      ],
      [
        { row: 4, col: 1 },
        { row: 3, col: 1 },
      ],
    )
    const addedD = placement('d', [{ layerId: 'floor', row: 1, col: 0 }], [{ row: 1, col: 0 }])
    const after = withProjectMapStampPlacements(filledMap(8, 8), [
      changedA,
      basePlacements[2]!,
      addedD,
    ])

    const seeded = seedStampPlacementIndexDelta(before, after, {
      removedPlacementIds: ['b'],
      upsertPlacementIds: [changedA.id, addedD.id],
    })
    const direct = directStampPlacementOwners(after)
    expect(buildStampPlacementIndex(after)).toBe(seeded)
    expect(seeded.byId.size).toBe(3)
    expect(seeded.byId.has('b')).toBe(false)
    expect(seeded.byId.get('a')).toEqual(
      after.version === 3
        ? after.authoring.stampPlacements.find((candidate) => candidate.id === 'a')
        : undefined,
    )
    expect(seeded.visualOwnerByKey.has(visualSlotKey({ layerId: 'floor', row: 0, col: 0 }))).toBe(
      false,
    )
    expect(seeded.visualOwnerByKey.get(visualSlotKey({ layerId: 'floor', row: 2, col: 0 }))).toBe(
      'c',
    )
    expect(seeded.visualOwnerByKey.get(visualSlotKey({ layerId: 'floor', row: 1, col: 0 }))).toBe(
      'd',
    )
    expectSameOwners(seeded.visualOwnerByKey, direct.visual)
    expectSameOwners(seeded.collisionOwnerByKey, direct.collision)

    const ordinaryEdit = {
      ...after,
      layers: after.layers.map((layer) => ({ ...layer, name: `${layer.name}*` })),
    } as ProjectMap
    inheritStampPlacementIndex(after, ordinaryEdit)
    expect(buildStampPlacementIndex(ordinaryEdit)).toBe(seeded)
    expect(buildStampPlacementIndex(before)).toBe(beforeIndex)
  })

  test('long edit sessions compact bounded overlay chains without changing owner semantics', () => {
    let current = withProjectMapStampPlacements(filledMap(8, 40), [
      placement('moving', [{ layerId: 'floor', row: 0, col: 0 }], [{ row: 0, col: 0 }]),
    ])
    buildStampPlacementIndex(current)

    for (let step = 1; step <= 80; step++) {
      const nextPlacement = placement(
        'moving',
        [{ layerId: 'floor', row: step % 70, col: step % 8 }],
        [{ row: step % 70, col: step % 8 }],
      )
      const next = withProjectMapStampPlacements(filledMap(8, 40), [nextPlacement])
      seedStampPlacementIndexDelta(current, next, { upsertPlacementIds: [nextPlacement.id] })
      current = next
    }

    const indexed = buildStampPlacementIndex(current)
    const direct = directStampPlacementOwners(current)
    expectSameOwners(indexed.visualOwnerByKey, direct.visual)
    expectSameOwners(indexed.collisionOwnerByKey, direct.collision)
  })
})
