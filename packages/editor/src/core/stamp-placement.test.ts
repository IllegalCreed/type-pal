import type { ProjectMap, StampTemplateV1 } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  moveProjectMapLayer,
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
} from './stamp-placement.js'

function fixtureMap(): ProjectMap {
  let map = buildBlankProjectMap(5, 4, 'tiles-a')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件', 'height'))
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'canopy', '树冠', 'height'))
  return map
}

function template(): StampTemplateV1 {
  return {
    id: 'tree-house',
    name: '树屋',
    tilesetId: 'tiles-a',
    origin: 'authored',
    layerSlots: [
      { id: 'ground-slot', name: '地面槽', depthMode: 'flat' },
      { id: 'crown-slot', name: '树冠槽', depthMode: 'height' },
    ],
    visual: [
      { layerSlotId: 'ground-slot', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 },
      { layerSlotId: 'crown-slot', offset: { dRow: 1, du: 1 }, tileId: 2, height: 3 },
      { layerSlotId: 'crown-slot', offset: { dRow: 2, du: 0 }, tileId: 3, height: 4 },
    ],
    collision: [
      { offset: { dRow: 1, du: 1 }, value: 0 },
      { offset: { dRow: 2, du: 0 }, value: 1 },
    ],
  }
}

function planInput(patch: Partial<PlanStampPlacementInput> = {}): PlanStampPlacementInput {
  return {
    mapId: 'map-a',
    map: fixtureMap(),
    mapRevision: 7,
    template: template(),
    anchor: { row: 0, col: 1 },
    mappings: [
      { layerSlotId: 'ground-slot', targetLayerId: 'floor' },
      { layerSlotId: 'crown-slot', targetLayerId: 'objects' },
    ],
    permission: { hiddenLayerIds: [], lockedLayerIds: [] },
    availableTileIds: new Set([1, 2, 3]),
    conflictPolicy: 'reject',
    ...patch,
  }
}

describe('W7G stamp placement planning', () => {
  test('多层显式 mapping 生成 ghost、patch 与 placement 的同一最终坐标', () => {
    const plan = planStampPlacement(planInput())
    expect(plan.canApply).toBe(true)
    expect(plan.issues).toEqual([])
    expect(plan.resolvedVisual.map((member) => member.ref)).toEqual([
      { layerId: 'floor', row: 0, col: 1 },
      { layerId: 'objects', row: 1, col: 1 },
      { layerId: 'objects', row: 2, col: 1 },
    ])
    expect(
      plan.resolvedCollision.map((member) => ({ ...member.ref, value: member.value })),
    ).toEqual([
      { row: 1, col: 1, value: 0 },
      { row: 2, col: 1, value: 1 },
    ])
    expect(plan.patch.visual).toEqual([
      { channel: 'tileId', ref: { layerId: 'floor', row: 0, col: 1 }, value: 1 },
      { channel: 'tileId', ref: { layerId: 'objects', row: 1, col: 1 }, value: 2 },
      { channel: 'height', ref: { layerId: 'objects', row: 1, col: 1 }, value: 3 },
      { channel: 'tileId', ref: { layerId: 'objects', row: 2, col: 1 }, value: 3 },
      { channel: 'height', ref: { layerId: 'objects', row: 2, col: 1 }, value: 4 },
    ])
    expect(plan.placement.visualSlots).toEqual(plan.resolvedVisual.map((member) => member.ref))
    expect(plan.placement.gridPoints).toEqual(plan.resolvedCollision.map((member) => member.ref))
    expect(plan.mapRevision).toBe(7)
  })

  test('奇偶行使用 {dRow,du} 解析，无 raw dCol 半格漂移', () => {
    const even = planStampPlacement(planInput({ anchor: { row: 0, col: 1 } }))
    const odd = planStampPlacement(planInput({ anchor: { row: 1, col: 1 } }))
    expect(even.resolvedVisual[1]?.ref).toEqual({ layerId: 'objects', row: 1, col: 1 })
    expect(odd.resolvedVisual[1]?.ref).toEqual({ layerId: 'objects', row: 2, col: 2 })
  })

  test('slot 与源/目标同 ID 也绝不自动映射，改名重排不改变稳定 target layerId', () => {
    const sameIdTemplate: StampTemplateV1 = {
      ...template(),
      layerSlots: [{ id: 'floor', name: '模板地面', depthMode: 'flat' }],
      visual: [{ layerSlotId: 'floor', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 }],
      collision: [],
    }
    const missing = planStampPlacement(
      planInput({ template: sameIdTemplate, mappings: [], availableTileIds: new Set([1]) }),
    )
    expect(missing.issues.some((item) => item.code === 'mapping-missing')).toBe(true)

    const reordered = moveProjectMapLayer(fixtureMap(), 'objects', 2)
    const map: ProjectMap = {
      ...reordered,
      layers: reordered.layers.map((layer) =>
        layer.id === 'objects' ? { ...layer, name: '重命名物件层' } : layer,
      ),
    }
    const mapped = planStampPlacement(planInput({ map }))
    expect(mapped.canApply).toBe(true)
    expect(mapped.resolvedVisual.filter((item) => item.layerSlotId === 'crown-slot')).toHaveLength(
      2,
    )
    expect(
      mapped.resolvedVisual
        .filter((item) => item.layerSlotId === 'crown-slot')
        .every((item) => item.targetLayerId === 'objects'),
    ).toBe(true)
  })

  test.each([
    ['tileset mismatch', { template: { ...template(), tilesetId: 'tiles-b' } }, 'tileset-mismatch'],
    ['missing mapping', { mappings: [] }, 'mapping-missing'],
    [
      'unknown mapping',
      { mappings: [{ layerSlotId: 'ghost', targetLayerId: 'floor' }] },
      'mapping-unknown-slot',
    ],
    [
      'duplicate mapping',
      {
        mappings: [
          { layerSlotId: 'ground-slot', targetLayerId: 'floor' },
          { layerSlotId: 'ground-slot', targetLayerId: 'floor' },
          { layerSlotId: 'crown-slot', targetLayerId: 'objects' },
        ],
      },
      'mapping-duplicate-slot',
    ],
    [
      'missing target',
      {
        mappings: [
          { layerSlotId: 'ground-slot', targetLayerId: 'floor' },
          { layerSlotId: 'crown-slot', targetLayerId: 'ghost' },
        ],
      },
      'target-layer-missing',
    ],
    [
      'depth mismatch',
      {
        mappings: [
          { layerSlotId: 'ground-slot', targetLayerId: 'objects' },
          { layerSlotId: 'crown-slot', targetLayerId: 'canopy' },
        ],
      },
      'depth-mode-mismatch',
    ],
    ['hidden', { permission: { hiddenLayerIds: ['objects'], lockedLayerIds: [] } }, 'hidden-layer'],
    ['locked', { permission: { hiddenLayerIds: [], lockedLayerIds: ['floor'] } }, 'locked-layer'],
    ['missing tile', { availableTileIds: new Set([1, 2]) }, 'missing-tile'],
    ['anchor outside', { anchor: { row: 99, col: 0 } }, 'anchor-out-of-bounds'],
    ['member outside', { anchor: { row: 7, col: 4 } }, 'out-of-bounds'],
  ] as const)('%s fail-loud 且计划不可提交', (_name, patch, code) => {
    const plan = planStampPlacement(planInput(patch as Partial<PlanStampPlacementInput>))
    expect(plan.canApply).toBe(false)
    expect(plan.issues.some((item) => item.code === code)).toBe(true)
  })

  test('重复目标视觉槽拒绝，但多个 slot 映射同层且实际槽不同允许', () => {
    const multiSlots: StampTemplateV1 = {
      ...template(),
      layerSlots: [
        { id: 'a', name: 'A', depthMode: 'height' },
        { id: 'b', name: 'B', depthMode: 'height' },
      ],
      visual: [
        { layerSlotId: 'a', offset: { dRow: 0, du: 0 }, tileId: 1, height: 1 },
        { layerSlotId: 'b', offset: { dRow: 0, du: 0 }, tileId: 2, height: 2 },
      ],
      collision: [],
    }
    const ambiguous = planStampPlacement(
      planInput({
        template: multiSlots,
        mappings: [
          { layerSlotId: 'a', targetLayerId: 'objects' },
          { layerSlotId: 'b', targetLayerId: 'objects' },
        ],
      }),
    )
    expect(ambiguous.issues.some((item) => item.code === 'ambiguous-destination')).toBe(true)

    multiSlots.visual[1] = {
      layerSlotId: 'b',
      offset: { dRow: 1, du: 1 },
      tileId: 2,
      height: 2,
    }
    expect(
      planStampPlacement(
        planInput({
          template: multiSlots,
          mappings: [
            { layerSlotId: 'a', targetLayerId: 'objects' },
            { layerSlotId: 'b', targetLayerId: 'objects' },
          ],
        }),
      ).canApply,
    ).toBe(true)
  })

  test('普通视觉/碰撞冲突可显式覆盖；已有同通道 owner 永远不可覆盖，跨通道 owner 允许', () => {
    let map = fixtureMap()
    map = paintProjectMapTiles(map, [{ layerId: 'floor', row: 0, col: 1, tileId: 9, height: 0 }])
    map = paintProjectMapCollision(map, [{ row: 1, col: 1, value: 2 }])
    const rejected = planStampPlacement(planInput({ map }))
    expect(rejected.conflicts).toHaveLength(2)
    expect(rejected.canApply).toBe(false)
    expect(planStampPlacement(planInput({ map, conflictPolicy: 'overwrite' })).canApply).toBe(true)

    const sameCollision = paintProjectMapCollision(fixtureMap(), [{ row: 2, col: 1, value: 1 }])
    expect(planStampPlacement(planInput({ map: sameCollision })).conflicts).toContainEqual({
      channel: 'collision',
      ref: { row: 2, col: 1 },
      currentValue: 1,
      incomingValue: 1,
    })

    let owned = paintProjectMapTiles(fixtureMap(), [
      { layerId: 'floor', row: 0, col: 1, tileId: 8, height: 0 },
      { layerId: 'objects', row: 3, col: 1, tileId: 7, height: 1 },
    ])
    owned = withProjectMapStampPlacements(owned, [
      {
        id: 'existing',
        anchor: { row: 3, col: 1 },
        visualSlots: [{ layerId: 'floor', row: 0, col: 1 }],
        gridPoints: [{ row: 2, col: 1 }],
      },
    ])
    const blocked = planStampPlacement(planInput({ map: owned, conflictPolicy: 'overwrite' }))
    expect(blocked.issues.some((item) => item.code === 'visual-owned')).toBe(true)
    expect(blocked.issues.some((item) => item.code === 'collision-owned')).toBe(true)

    const crossChannelTemplate: StampTemplateV1 = {
      ...template(),
      visual: [{ layerSlotId: 'ground-slot', offset: { dRow: 2, du: 0 }, tileId: 1, height: 0 }],
      collision: [{ offset: { dRow: 0, du: 0 }, value: 1 }],
    }
    const cross = planStampPlacement(
      planInput({ map: owned, template: crossChannelTemplate, conflictPolicy: 'overwrite' }),
    )
    expect(cross.issues.some((item) => /-owned$/.test(item.code))).toBe(false)
    expect(cross.canApply).toBe(true)
  })

  test('placement 反向索引与直接扫描一致且 id 确定递增', () => {
    let map = paintProjectMapTiles(fixtureMap(), [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 },
      { layerId: 'objects', row: 1, col: 0, tileId: 2, height: 1 },
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
        visualSlots: [{ layerId: 'objects', row: 1, col: 0 }],
        gridPoints: [],
      },
    ])
    const indexed = buildStampPlacementIndex(map)
    const direct = directStampPlacementOwners(map)
    expect([...indexed.visualOwnerByKey]).toEqual([...direct.visual])
    expect([...indexed.collisionOwnerByKey]).toEqual([...direct.collision])
    expect(buildStampPlacementIndex(map)).toBe(indexed)
    expect(nextStampPlacementId(map, 'tree-placement')).toBe('tree-placement-3')
  })
})
