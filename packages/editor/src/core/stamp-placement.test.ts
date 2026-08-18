import type { ProjectMap, StampTemplate } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  buildStampPlacementIndex,
  directStampPlacementOwners,
  nextStampPlacementId,
  type PlanStampPlacementInput,
  planStampPlacement,
  stampPlacementActualHeight,
} from './stamp-placement.js'

function fixtureMap(): ProjectMap {
  let map = buildBlankProjectMap(5, 4, 'tiles-a')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  return map
}

function empty(rows = 4, cols = 2): Array<Array<number | null>> {
  return Array.from({ length: rows }, () => Array<number | null>(cols).fill(null))
}

function template(): StampTemplate {
  const groundTiles = empty()
  const groundSources = empty()
  groundTiles[0]![0] = 1
  groundSources[0]![0] = 0
  const crownTiles = empty()
  const crownSources = empty()
  crownTiles[1]![0] = 2
  crownTiles[2]![0] = 3
  crownSources[1]![0] = 1
  crownSources[2]![0] = 1
  const collision = empty() as Array<Array<number | null>>
  collision[1]![0] = 0
  collision[2]![0] = 1
  return {
    id: 'tree-house',
    name: '树屋',
    origin: 'authored',
    width: 2,
    height: 2,
    anchor: { row: 0, col: 0 },
    tilesetRefs: ['tiles-a', 'tiles-b'],
    layers: [
      { id: 'ground-slot', name: '地面槽', tiles: groundTiles, sources: groundSources },
      {
        id: 'crown-slot',
        name: '树冠槽',
        tiles: crownTiles,
        sources: crownSources,
        heights: [
          [0, 0],
          [3, 0],
          [4, 0],
          [0, 0],
        ],
      },
    ],
    collision,
  }
}

function planInput(patch: Partial<PlanStampPlacementInput> = {}): PlanStampPlacementInput {
  return {
    mapId: 'map-a',
    map: fixtureMap(),
    mapRevision: 7,
    template: template(),
    anchor: { row: 0, col: 1 },
    placementBaseHeight: 5,
    mappings: [
      { layerSlotId: 'ground-slot', targetLayerId: 'floor' },
      { layerSlotId: 'crown-slot', targetLayerId: 'objects' },
    ],
    permission: { hiddenLayerIds: [], lockedLayerIds: [] },
    availableTileIdsByTileset: new Map([
      ['tiles-a', new Set([1])],
      ['tiles-b', new Set([2, 3])],
    ]),
    conflictPolicy: 'reject',
    ...patch,
  }
}

describe('canonical stamp placement planning', () => {
  test('multi-source dense content resolves coordinates and relative height atomically', () => {
    const plan = planStampPlacement(planInput())
    expect(plan.canApply).toBe(true)
    expect(plan.issues).toEqual([])
    expect(
      plan.resolvedVisual.map(({ ref, tilesetId, relativeHeight, height }) => ({
        ref,
        tilesetId,
        relativeHeight,
        height,
      })),
    ).toEqual([
      {
        ref: { layerId: 'floor', row: 0, col: 1 },
        tilesetId: 'tiles-a',
        relativeHeight: 0,
        height: 5,
      },
      {
        ref: { layerId: 'objects', row: 1, col: 1 },
        tilesetId: 'tiles-b',
        relativeHeight: 3,
        height: 8,
      },
      {
        ref: { layerId: 'objects', row: 2, col: 1 },
        tilesetId: 'tiles-b',
        relativeHeight: 4,
        height: 9,
      },
    ])
    expect(plan.resolvedCollision.map(({ ref, value }) => ({ ...ref, value }))).toEqual([
      { row: 1, col: 1, value: 0 },
      { row: 2, col: 1, value: 1 },
    ])
    expect(plan.patch.visual.filter(({ channel }) => channel === 'tilesetId')).toHaveLength(3)
    expect(plan.placement.visualSlots).toEqual(plan.resolvedVisual.map(({ ref }) => ref))
    expect(stampPlacementActualHeight(5, 5)).toBe(10)
  })

  test('odd/even row mapping uses the same staggered lattice formula', () => {
    const even = planStampPlacement(planInput({ anchor: { row: 0, col: 1 } }))
    const odd = planStampPlacement(planInput({ anchor: { row: 1, col: 1 } }))
    expect(even.resolvedVisual[1]?.ref).toEqual({ layerId: 'objects', row: 1, col: 1 })
    expect(odd.resolvedVisual[1]?.ref).toEqual({ layerId: 'objects', row: 2, col: 2 })
  })

  test.each([
    ['missing mapping', { mappings: [] }, 'mapping-missing'],
    [
      'missing target',
      { mappings: [{ layerSlotId: 'ground-slot', targetLayerId: 'ghost' }] },
      'target-layer-missing',
    ],
    ['hidden', { permission: { hiddenLayerIds: ['objects'], lockedLayerIds: [] } }, 'hidden-layer'],
    [
      'missing source tile',
      { availableTileIdsByTileset: new Map([['tiles-a', new Set([1])]]) },
      'missing-tile',
    ],
    ['outside', { anchor: { row: 99, col: 0 } }, 'anchor-out-of-bounds'],
  ] as const)('%s fails closed', (_name, patch, code) => {
    const plan = planStampPlacement(planInput(patch as Partial<PlanStampPlacementInput>))
    expect(plan.canApply).toBe(false)
    expect(plan.issues.some((issue) => issue.code === code)).toBe(true)
  })

  test('ordinary content may be explicitly overwritten but owned members never are', () => {
    let map = paintProjectMapTiles(fixtureMap(), [
      { layerId: 'floor', row: 0, col: 1, tileId: 9, tilesetId: 'tiles-a', height: 0 },
    ])
    map = paintProjectMapCollision(map, [{ row: 1, col: 1, value: 2 }])
    expect(planStampPlacement(planInput({ map })).conflicts).toHaveLength(2)
    expect(planStampPlacement(planInput({ map, conflictPolicy: 'overwrite' })).canApply).toBe(true)

    const owned = withProjectMapStampPlacements(map, [
      {
        id: 'existing',
        anchor: { row: 0, col: 1 },
        visualSlots: [{ layerId: 'floor', row: 0, col: 1 }],
        gridPoints: [{ row: 1, col: 1 }],
      },
    ])
    const blocked = planStampPlacement(planInput({ map: owned, conflictPolicy: 'overwrite' }))
    expect(blocked.issues.some(({ code }) => code === 'visual-owned')).toBe(true)
    expect(blocked.issues.some(({ code }) => code === 'collision-owned')).toBe(true)
  })

  test('placement reverse index matches direct scan and ids increment deterministically', () => {
    let map = paintProjectMapTiles(fixtureMap(), [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles-a', height: 0 },
      { layerId: 'floor', row: 1, col: 0, tileId: 1, tilesetId: 'tiles-a', height: 0 },
    ])
    map = withProjectMapStampPlacements(map, [
      {
        id: 'tree-placement',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [{ row: 0, col: 0 }],
      },
      {
        id: 'tree-placement-2',
        anchor: { row: 1, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 1, col: 0 }],
        gridPoints: [],
      },
    ])
    const indexed = buildStampPlacementIndex(map)
    const direct = directStampPlacementOwners(map)
    expect(indexed.visualOwnerByKey.size).toBe(direct.visual.size)
    expect(indexed.collisionOwnerByKey.size).toBe(direct.collision.size)
    expect(nextStampPlacementId(map, 'tree-placement')).toBe('tree-placement-3')
  })
})
