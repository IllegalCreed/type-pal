/**
 * TEST-CURSOR-MAP-LOGIC-2 M5：放置 ID/高度/精确 patch。
 * 不去重 stamp-placement.boundaries 已占 id/未知 mapping。
 */
import { validateStampTemplates } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { editorStateWithMap, legalBlankMap } from './__tests__/cursor-map-logic-fixtures.js'
import { EditSession } from './edit-session.js'
import {
  canonicalizeStampDraft,
  createBlankStampDraft,
  setStampDraftCollision,
  setStampDraftVisual,
} from './stamp-draft.js'
import { stampCollisionOwner, stampVisualOwner } from './stamp-ownership.js'
import {
  nextStampPlacementId,
  planStampPlacement,
  stampPlacementActualHeight,
} from './stamp-placement.js'
import { PlaceStampCommand } from './stamp-placement-command.js'

function legalDraftTemplate() {
  const draft = setStampDraftCollision(
    setStampDraftVisual(
      createBlankStampDraft('bush', '灌木', 'tiles'),
      'base',
      { row: 8, col: 7 },
      1,
      'tiles',
      2,
    ),
    { row: 8, col: 7 },
    4,
  )
  const template = canonicalizeStampDraft(draft, new Map([['tiles', new Set([1])]]))
  expect(validateStampTemplates([template])[0]!.id).toBe('bush')
  return template
}

describe('M5 stamp-placement 剩余合同', () => {
  test('合法 draft→canonicalize 后 planStampPlacement 给出精确三通道 patch', () => {
    const map = legalBlankMap(8, 8)
    const template = legalDraftTemplate()
    const plan = planStampPlacement({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      template,
      anchor: { row: 2, col: 2 },
      placementBaseHeight: 1,
      mappings: [{ layerSlotId: 'base', targetLayerId: 'floor' }],
      permission: { hiddenLayerIds: [], lockedLayerIds: [] },
      availableTileIdsByTileset: new Map([['tiles', new Set([1])]]),
      conflictPolicy: 'reject',
    })
    expect(plan.canApply).toBe(true)
    const visualTile = plan.patch.visual.find(
      (entry) =>
        entry.channel === 'tileId' &&
        entry.ref.layerId === 'floor' &&
        entry.ref.row === 2 &&
        entry.ref.col === 2,
    )
    const height = plan.patch.visual.find((entry) => entry.channel === 'height')
    expect(visualTile).toMatchObject({ value: 1 })
    expect(height).toMatchObject({ value: 3 })
    expect(plan.patch.collision).toEqual([{ ref: { row: 2, col: 2 }, value: 4 }])
    expect(plan.placement.visualSlots).toEqual([{ layerId: 'floor', row: 2, col: 2 }])
  })

  test('PlaceStampCommand 应用后公开查询 owner，旁格仍无归属', () => {
    const map = legalBlankMap(8, 8)
    const plan = planStampPlacement({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      template: legalDraftTemplate(),
      anchor: { row: 2, col: 2 },
      placementBaseHeight: 1,
      mappings: [{ layerSlotId: 'base', targetLayerId: 'floor' }],
      permission: { hiddenLayerIds: [], lockedLayerIds: [] },
      availableTileIdsByTileset: new Map([['tiles', new Set([1])]]),
      conflictPolicy: 'reject',
    })
    const session = new EditSession(editorStateWithMap('map-a', map))
    expect(session.dispatch(new PlaceStampCommand(plan))).toBe(true)
    const after = session.getState().maps['map-a']!
    expect(stampVisualOwner(after, { layerId: 'floor', row: 2, col: 2 })).toBe(plan.placement.id)
    expect(stampCollisionOwner(after, { row: 2, col: 2 })).toBe(plan.placement.id)
    expect(stampVisualOwner(after, { layerId: 'floor', row: 0, col: 0 })).toBeUndefined()
    expect(after.layers[0]!.tiles[2]![2]).toBe(1)
  })

  test('stampPlacementActualHeight 拒绝负数；planner 坏基准直接抛同一错误', () => {
    expect(() => stampPlacementActualHeight(-1, 0)).toThrow('组合放置基准高度必须是非负安全整数')
    expect(() => stampPlacementActualHeight(0, -2)).toThrow('组合相对高度必须是非负安全整数')
    expect(() =>
      planStampPlacement({
        mapId: 'map-a',
        map: legalBlankMap(8, 8),
        mapRevision: 0,
        template: legalDraftTemplate(),
        anchor: { row: 2, col: 2 },
        placementBaseHeight: -3,
        mappings: [{ layerSlotId: 'base', targetLayerId: 'floor' }],
        permission: { hiddenLayerIds: [], lockedLayerIds: [] },
        availableTileIdsByTileset: new Map([['tiles', new Set([1])]]),
        conflictPolicy: 'reject',
      }),
    ).toThrow('组合放置基准高度必须是非负安全整数，收到 -3')
  })

  test('nextStampPlacementId 标点 preferred 走 NFKC stem，撞号则 -2', () => {
    const empty = legalBlankMap()
    expect(nextStampPlacementId(empty, 'Tree Placement!')).toBe('tree-placement')
    let map = buildBlankProjectMap(4, 3, 'tiles')
    map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
    ])
    const seeded = withProjectMapStampPlacements(map, [
      {
        id: 'tree-placement',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [],
      },
    ])
    expect(nextStampPlacementId(seeded, 'Tree Placement!')).toBe('tree-placement-2')
  })
})
