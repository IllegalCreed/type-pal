/**
 * TEST-CURSOR-MAP-LOGIC-2 M5：放置 ID/高度/完整 patch。
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
import {
  applyPlanPatch,
  editorStateWithMap,
  inputSnap,
  legalBlankMap,
} from './__tests__/cursor-map-logic-fixtures.js'
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
  test('合法 draft→canonicalize 后 planStampPlacement 给出完整三通道 patch 并应用', () => {
    const map = legalBlankMap(8, 8)
    const template = legalDraftTemplate()
    const input = {
      mapId: 'map-a',
      map,
      mapRevision: 0,
      template,
      anchor: { row: 2, col: 2 },
      placementBaseHeight: 1,
      mappings: [{ layerSlotId: 'base', targetLayerId: 'floor' }],
      permission: { hiddenLayerIds: [] as string[], lockedLayerIds: [] as string[] },
      availableTileIdsByTileset: new Map([['tiles', new Set([1])]]),
      conflictPolicy: 'reject' as const,
    }
    const mapSnap = inputSnap(map)
    const templateSnap = inputSnap(template)
    const inputSnapValue = inputSnap(input)
    const plan = planStampPlacement(input)
    expect(map).toEqual(mapSnap)
    expect(template).toEqual(templateSnap)
    expect(input).toEqual(inputSnapValue)
    expect(plan.canApply).toBe(true)
    expect(plan.patch).toEqual({
      visual: [
        { channel: 'tileId', ref: { layerId: 'floor', row: 2, col: 2 }, value: 1 },
        { channel: 'tilesetId', ref: { layerId: 'floor', row: 2, col: 2 }, value: 'tiles' },
        { channel: 'height', ref: { layerId: 'floor', row: 2, col: 2 }, value: 3 },
      ],
      collision: [{ ref: { row: 2, col: 2 }, value: 4 }],
    })
    expect(plan.placement.visualSlots).toEqual([{ layerId: 'floor', row: 2, col: 2 }])
    const after = applyPlanPatch(map, plan.patch, ['floor'])
    expect(map).toEqual(mapSnap)
    expect(after.layers[0]!.tiles[2]![2]).toBe(1)
    expect(after.layers[0]!.heights?.[2]![2]).toBe(3)
    expect(after.collision[2]![2]).toBe(4)
  })

  test('PlaceStampCommand 应用后公开查询 owner，旁格仍无归属', async () => {
    const map = legalBlankMap(8, 8)
    const template = legalDraftTemplate()
    const input = {
      mapId: 'map-a',
      map,
      mapRevision: 0,
      template,
      anchor: { row: 2, col: 2 },
      placementBaseHeight: 1,
      mappings: [{ layerSlotId: 'base', targetLayerId: 'floor' }],
      permission: { hiddenLayerIds: [] as string[], lockedLayerIds: [] as string[] },
      availableTileIdsByTileset: new Map([['tiles', new Set([1])]]),
      conflictPolicy: 'reject' as const,
    }
    const mapSnap = inputSnap(map)
    const templateSnap = inputSnap(template)
    const plan = planStampPlacement(input)
    expect(map).toEqual(mapSnap)
    expect(template).toEqual(templateSnap)
    const session = new EditSession(await editorStateWithMap('map-a', map))
    expect(session.dispatch(new PlaceStampCommand(plan))).toBe(true)
    expect(map).toEqual(mapSnap)
    const after = session.getState().maps['map-a']!
    expect(stampVisualOwner(after, { layerId: 'floor', row: 2, col: 2 })).toBe(plan.placement.id)
    expect(stampCollisionOwner(after, { row: 2, col: 2 })).toBe(plan.placement.id)
    expect(stampVisualOwner(after, { layerId: 'floor', row: 0, col: 0 })).toBeUndefined()
    expect(after.layers[0]!.tiles[2]![2]).toBe(1)
    expect(after.layers[0]!.heights?.[2]![2]).toBe(3)
  })

  test('stampPlacementActualHeight 拒绝负数；planner 坏基准直接抛同一错误', () => {
    expect(() => stampPlacementActualHeight(-1, 0)).toThrow('组合放置基准高度必须是非负安全整数')
    expect(() => stampPlacementActualHeight(0, -2)).toThrow('组合相对高度必须是非负安全整数')
    const map = legalBlankMap(8, 8)
    const template = legalDraftTemplate()
    const input = {
      mapId: 'map-a',
      map,
      mapRevision: 0,
      template,
      anchor: { row: 2, col: 2 },
      placementBaseHeight: -3,
      mappings: [{ layerSlotId: 'base', targetLayerId: 'floor' }],
      permission: { hiddenLayerIds: [] as string[], lockedLayerIds: [] as string[] },
      availableTileIdsByTileset: new Map([['tiles', new Set([1])]]),
      conflictPolicy: 'reject' as const,
    }
    const mapSnap = inputSnap(map)
    const templateSnap = inputSnap(template)
    const inputSnapValue = inputSnap(input)
    expect(() => planStampPlacement(input)).toThrow('组合放置基准高度必须是非负安全整数，收到 -3')
    expect(map).toEqual(mapSnap)
    expect(template).toEqual(templateSnap)
    expect(input).toEqual(inputSnapValue)
  })

  test('nextStampPlacementId 标点 preferred 走 NFKC stem，撞号则 -2', () => {
    const empty = legalBlankMap()
    const emptySnap = inputSnap(empty)
    expect(nextStampPlacementId(empty, 'Tree Placement!')).toBe('tree-placement')
    expect(empty).toEqual(emptySnap)
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
    const seededSnap = inputSnap(seeded)
    expect(nextStampPlacementId(seeded, 'Tree Placement!')).toBe('tree-placement-2')
    expect(seeded).toEqual(seededSnap)
  })
})
