import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { applyPreparedProjectMapPatch, prepareProjectMapPatch } from './map-patch.js'
import type { MapSelection } from './map-selection.js'
import {
  captureMapClipboard,
  planMapDelete,
  planMapMove,
  planMapPaste,
  relativeLatticeOffset,
  resolveRelativeLatticeOffset,
} from './map-transform.js'

function mapFixture() {
  let map = buildBlankProjectMap(5, 4, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件', 'height'))
  map = paintProjectMapTiles(map, [
    { layerId: 'objects', row: 0, col: 0, tileId: 2, height: 1 },
    { layerId: 'objects', row: 1, col: 0, tileId: 3, height: 2 },
    { layerId: 'objects', row: 4, col: 3, tileId: 9, height: 4 },
  ])
  return paintProjectMapCollision(map, [
    { row: 0, col: 0, value: 5 },
    { row: 1, col: 0, value: 0 },
  ])
}

const selection: MapSelection = {
  kind: 'cells',
  visualSlots: [
    { layerId: 'objects', row: 0, col: 0 },
    { layerId: 'objects', row: 1, col: 0 },
  ],
  gridPoints: [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
  ],
  hitScope: 'active-layer',
}

function ownedMap() {
  return withProjectMapStampPlacements(mapFixture(), [
    {
      id: 'tree-1',
      anchor: { row: 0, col: 0 },
      visualSlots: [{ layerId: 'objects', row: 0, col: 0 }],
      gridPoints: [{ row: 0, col: 0 }],
    },
  ])
}

describe('W8 structured clipboard / lattice geometry', () => {
  test('visual-only 与 include-collision payload 分形，collision=0 仍保留', () => {
    const map = mapFixture()
    const visual = captureMapClipboard('map-a', map, selection, false)!
    expect(visual.visual.map((cell) => cell.tileId)).toEqual([2, 3])
    expect(visual.collision).toEqual({ kind: 'excluded' })
    const withCollision = captureMapClipboard('map-a', map, selection, true)!
    expect(withCollision.collision).toEqual({
      kind: 'included',
      cells: [expect.objectContaining({ value: 5 }), expect.objectContaining({ value: 0 })],
    })
  })

  test('纯空视觉槽且未包含 collision 时不覆盖为无效剪贴板', () => {
    const map = mapFixture()
    expect(
      captureMapClipboard(
        'map-a',
        map,
        {
          kind: 'cells',
          visualSlots: [{ layerId: 'objects', row: 0, col: 1 }],
          gridPoints: [],
          hitScope: 'active-layer',
        },
        false,
      ),
    ).toBeUndefined()
  })

  test.each([
    [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 3, col: 2 },
    ],
    [
      { row: 1, col: 1 },
      { row: 2, col: 1 },
      { row: 4, col: 3 },
    ],
  ])('even/odd 跨行相对坐标保持世界横向形状', (anchor, point, target) => {
    const offset = relativeLatticeOffset(point, anchor)
    const resolved = resolveRelativeLatticeOffset(target, offset)
    const sourceDx =
      point.col * 32 + (point.row & 1) * 16 - (anchor.col * 32 + (anchor.row & 1) * 16)
    const targetDx =
      resolved.col * 32 + (resolved.row & 1) * 16 - (target.col * 32 + (target.row & 1) * 16)
    expect(targetDx).toBe(sourceDx)
  })
})

describe('W8 paste/move/delete planning', () => {
  test('ownership 是 plan 级硬错误，overwrite 也不能绕过 paste/move/delete', () => {
    const map = ownedMap()
    const clipboard = captureMapClipboard('map-a', mapFixture(), selection, true)!
    const paste = planMapPaste(
      map,
      clipboard,
      { row: 0, col: 0 },
      {
        conflictPolicy: 'overwrite',
        collisionAuthorityLayerId: 'objects',
      },
    )
    expect(paste.canApply).toBe(false)
    expect(paste.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['visual-owned', 'collision-owned']),
    )
    expect(paste.patch).toEqual({ visual: [], collision: [] })

    const remove = planMapDelete(map, selection, true, 'objects')
    expect(remove.canApply).toBe(false)
    expect(remove.issues.some((issue) => issue.code === 'visual-owned')).toBe(true)

    const moveSource = planMapMove(
      map,
      selection,
      { row: 2, col: 1 },
      {
        includeCollision: true,
        collisionAuthorityLayerId: 'objects',
        conflictPolicy: 'overwrite',
      },
      'map-a',
    )
    expect(moveSource.canApply).toBe(false)
    expect(moveSource.issues.some((issue) => issue.code === 'visual-owned')).toBe(true)

    const ordinarySelection: MapSelection = {
      kind: 'cells',
      visualSlots: [{ layerId: 'objects', row: 4, col: 3 }],
      gridPoints: [],
      hitScope: 'active-layer',
    }
    const moveDestination = planMapMove(
      map,
      ordinarySelection,
      { row: 0, col: 0 },
      {
        includeCollision: false,
        collisionAuthorityLayerId: 'objects',
        conflictPolicy: 'overwrite',
      },
      'map-a',
    )
    expect(moveDestination.canApply).toBe(false)
    expect(moveDestination.issues.some((issue) => issue.code === 'visual-owned')).toBe(true)
  })

  test('paste 跨层 mapping；reject/overwrite 冲突语义；选区跟随', () => {
    const map = mapFixture()
    const clipboard = captureMapClipboard('map-a', map, selection, false)!
    const rejected = planMapPaste(map, clipboard, { row: 4, col: 3 })
    expect(rejected.conflicts).toHaveLength(1)
    expect(rejected.canApply).toBe(false)
    expect(rejected.patch).toEqual({ visual: [], collision: [] })
    const overwritten = planMapPaste(
      map,
      clipboard,
      { row: 4, col: 3 },
      { conflictPolicy: 'overwrite' },
    )
    expect(overwritten.canApply).toBe(true)
    expect(overwritten.nextSelection).toMatchObject({ kind: 'cells' })
    const overwritePrepared = prepareProjectMapPatch(map, overwritten.patch, {
      hiddenLayerIds: [],
      lockedLayerIds: [],
      requiredWritableLayerIds: overwritten.requiredWritableLayerIds,
    })
    const pasted = applyPreparedProjectMapPatch(map, overwritePrepared)
    expect(pasted.layers[1]?.tiles[4]?.[3]).toBe(2)
    expect(applyPreparedProjectMapPatch(pasted, overwritePrepared, 'prev')).toEqual(map)

    const remapped = planMapPaste(
      map,
      clipboard,
      { row: 2, col: 1 },
      {
        layerMappings: [{ sourceLayerId: 'objects', targetLayerId: 'floor' }],
        conflictPolicy: 'overwrite',
      },
    )
    expect(remapped.issues.some((issue) => issue.code === 'flat-height')).toBe(true)
    expect(remapped.canApply).toBe(false)
  })

  test('visual-only paste 不改 collision；include-collision 同一原子 patch 写入 0/非零', () => {
    const map = mapFixture()
    const visualClipboard = captureMapClipboard('map-a', map, selection, false)!
    const visualPlan = planMapPaste(
      map,
      visualClipboard,
      { row: 2, col: 1 },
      {
        conflictPolicy: 'overwrite',
      },
    )
    const visualPrepared = prepareProjectMapPatch(map, visualPlan.patch, {
      hiddenLayerIds: [],
      lockedLayerIds: [],
      requiredWritableLayerIds: visualPlan.requiredWritableLayerIds,
    })
    const visualResult = applyPreparedProjectMapPatch(map, visualPrepared)
    expect(visualResult.collision).toBe(map.collision)

    const fullClipboard = captureMapClipboard('map-a', map, selection, true)!
    const fullPlan = planMapPaste(
      map,
      fullClipboard,
      { row: 2, col: 1 },
      {
        collisionAuthorityLayerId: 'objects',
        conflictPolicy: 'overwrite',
      },
    )
    expect(fullPlan.canApply).toBe(true)
    const fullPrepared = prepareProjectMapPatch(map, fullPlan.patch, {
      hiddenLayerIds: [],
      lockedLayerIds: [],
      requiredWritableLayerIds: fullPlan.requiredWritableLayerIds,
    })
    const fullResult = applyPreparedProjectMapPatch(map, fullPrepared)
    expect(fullResult.collision[2]?.[1]).toBe(5)
    expect(fullResult.collision[3]?.[1]).toBe(0)
  })

  test('collision-only paste 要求明确活动层权限归属，并能单独提交', () => {
    const map = mapFixture()
    const clipboard = captureMapClipboard(
      'map-a',
      map,
      {
        kind: 'cells',
        visualSlots: [],
        gridPoints: [{ row: 0, col: 0 }],
        hitScope: 'active-layer',
      },
      true,
    )!
    const missingAuthority = planMapPaste(
      map,
      clipboard,
      { row: 2, col: 1 },
      {
        conflictPolicy: 'overwrite',
      },
    )
    expect(missingAuthority.canApply).toBe(false)
    expect(
      missingAuthority.issues.some((issue) => issue.code === 'collision-authority-missing'),
    ).toBe(true)

    const plan = planMapPaste(
      map,
      clipboard,
      { row: 2, col: 1 },
      {
        collisionAuthorityLayerId: 'floor',
        conflictPolicy: 'overwrite',
      },
    )
    expect(plan.canApply).toBe(true)
    expect(plan.patch.visual).toEqual([])
    expect(plan.requiredWritableLayerIds).toEqual(['floor'])
    const prepared = prepareProjectMapPatch(map, plan.patch, {
      hiddenLayerIds: [],
      lockedLayerIds: [],
      requiredWritableLayerIds: plan.requiredWritableLayerIds,
    })
    expect(applyPreparedProjectMapPatch(map, prepared).collision[2]?.[1]).toBe(5)
  })

  test('平面层 copy/paste/move/delete 都不生成 height 写入', () => {
    const map = paintProjectMapTiles(mapFixture(), [
      { layerId: 'floor', row: 0, col: 1, tileId: 11, height: 0 },
    ])
    const flatSelection: MapSelection = {
      kind: 'cells',
      visualSlots: [{ layerId: 'floor', row: 0, col: 1 }],
      gridPoints: [{ row: 0, col: 1 }],
      hitScope: 'active-layer',
    }
    const clipboard = captureMapClipboard('map-a', map, flatSelection, false)!
    const paste = planMapPaste(
      map,
      clipboard,
      { row: 2, col: 2 },
      {
        conflictPolicy: 'overwrite',
      },
    )
    const move = planMapMove(
      map,
      flatSelection,
      { row: 2, col: 2 },
      { includeCollision: false, collisionAuthorityLayerId: 'floor', conflictPolicy: 'overwrite' },
      'map-a',
    )
    const remove = planMapDelete(map, flatSelection, false, 'floor')
    for (const plan of [paste, move, remove]) {
      expect(plan.canApply).toBe(true)
      expect(plan.patch.visual.some((write) => write.channel === 'height')).toBe(false)
      expect(() =>
        prepareProjectMapPatch(map, plan.patch, {
          hiddenLayerIds: [],
          lockedLayerIds: [],
          requiredWritableLayerIds: plan.requiredWritableLayerIds,
        }),
      ).not.toThrow()
    }
  })

  test('move 重叠时目标写优先、无重复通道；一次 patch 可完整往返', () => {
    const map = mapFixture()
    const plan = planMapMove(
      map,
      selection,
      { row: 1, col: 0 },
      { includeCollision: true, collisionAuthorityLayerId: 'objects', conflictPolicy: 'overwrite' },
      'map-a',
    )
    expect(plan.canApply).toBe(true)
    const channelKeys = plan.patch.visual.map(
      (write) => `${write.ref.layerId}:${write.ref.row}:${write.ref.col}:${write.channel}`,
    )
    expect(new Set(channelKeys).size).toBe(channelKeys.length)
    const prepared = prepareProjectMapPatch(map, plan.patch, {
      hiddenLayerIds: [],
      lockedLayerIds: [],
      requiredWritableLayerIds: plan.requiredWritableLayerIds,
    })
    const moved = applyPreparedProjectMapPatch(map, prepared)
    expect(moved.layers[1]?.tiles[0]?.[0]).toBeNull()
    expect(moved.layers[1]?.tiles[1]?.[0]).toBe(2)
    expect(applyPreparedProjectMapPatch(moved, prepared, 'prev')).toEqual(map)
  })

  test('delete visual-only / include collision；空选区不可提交', () => {
    const map = mapFixture()
    const visual = planMapDelete(map, selection, false, 'objects')
    expect(visual.patch.collision).toEqual([])
    expect(visual.canApply).toBe(true)
    const full = planMapDelete(map, selection, true, 'objects')
    expect(full.patch.collision).toHaveLength(2)
    expect(full.requiredWritableLayerIds).toContain('objects')
    const prepared = prepareProjectMapPatch(map, full.patch, {
      hiddenLayerIds: [],
      lockedLayerIds: [],
      requiredWritableLayerIds: full.requiredWritableLayerIds,
    })
    const deleted = applyPreparedProjectMapPatch(map, prepared)
    expect(deleted.layers[1]?.tiles[0]?.[0]).toBeNull()
    expect(deleted.layers[1]?.tiles[1]?.[0]).toBeNull()
    expect(deleted.collision[0]?.[0]).toBe(0)
    expect(applyPreparedProjectMapPatch(deleted, prepared, 'prev')).toEqual(map)
    expect(planMapDelete(map, { kind: 'none' }, false, 'objects').canApply).toBe(false)

    const duplicated = planMapDelete(
      map,
      {
        ...selection,
        visualSlots: [...selection.visualSlots, selection.visualSlots[0]!],
        gridPoints: [...selection.gridPoints, selection.gridPoints[0]!],
      },
      true,
      'objects',
    )
    expect(() =>
      prepareProjectMapPatch(map, duplicated.patch, {
        hiddenLayerIds: [],
        lockedLayerIds: [],
        requiredWritableLayerIds: duplicated.requiredWritableLayerIds,
      }),
    ).not.toThrow()
  })

  test('越界与多源映射同一目标整笔失败', () => {
    const map = mapFixture()
    const clipboard = captureMapClipboard('map-a', map, selection, false)!
    const outside = planMapPaste(map, clipboard, { row: 7, col: 4 })
    expect(outside.canApply).toBe(false)
    expect(outside.patch).toEqual({ visual: [], collision: [] })

    const duplicate = {
      ...clipboard,
      visual: [clipboard.visual[0]!, { ...clipboard.visual[0]!, sourceLayerId: 'other' }],
    }
    const ambiguous = planMapPaste(
      map,
      duplicate,
      { row: 2, col: 1 },
      {
        layerMappings: [{ sourceLayerId: 'other', targetLayerId: 'objects' }],
        conflictPolicy: 'overwrite',
      },
    )
    expect(ambiguous.issues.some((issue) => issue.code === 'ambiguous-destination')).toBe(true)
  })
})
