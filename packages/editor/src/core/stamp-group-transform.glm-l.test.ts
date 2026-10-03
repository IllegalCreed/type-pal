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
  captureStampGroupClipboard,
  planStampGroupDelete,
  planStampGroupMove,
  planStampGroupPaste,
} from './stamp-group-transform.js'

function fixtureMap(): ProjectMap {
  let map: ProjectMap = buildBlankProjectMap(5, 3, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
    { layerId: 'objects', row: 1, col: 0, tileId: 2, tilesetId: 'tiles', height: 3 },
  ])
  return withProjectMapStampPlacements(map, [
    {
      id: 'tree-a',
      sourceStampId: 'tree',
      sourceStampName: '树 A',
      anchor: { row: 0, col: 0 },
      visualSlots: [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'objects', row: 1, col: 0 },
      ],
      gridPoints: [{ row: 1, col: 0 }],
    },
  ])
}

const writable = { hiddenLayerIds: [] as string[], lockedLayerIds: [] as string[] }

describe('TEST-GLM-WAVE-L-1 L06 stamp group transform plans', () => {
  test('preserve 身份粘贴撞上仍存活的原始 id：整笔拒绝且 patch 双通道为空', () => {
    const map = fixtureMap()
    const clip = captureStampGroupClipboard('map-a', map, ['tree-a'], 'preserve')!
    const plan = planStampGroupPaste({
      mapId: 'map-a',
      map,
      mapRevision: 1,
      clipboard: clip,
      targetAnchor: { row: 4, col: 3 },
      permission: writable,
    })
    expect(plan.canApply).toBe(false)
    expect(plan.issues).toEqual([
      {
        code: 'stamp-selection-unsupported',
        message: '剪切粘贴的原放置组 ID 已存在；请先删除原组，或重新执行复制。',
      },
    ])
    expect(plan.patch).toEqual({ visual: [], collision: [] })
    // 几何解析仍会产出供幽灵预览的 upsert 形状；只有提交门（canApply）被 issue 关闭。
    expect(plan.upsertPlacements).toEqual([
      {
        id: 'tree-a',
        sourceStampId: 'tree',
        sourceStampName: '树 A',
        anchor: { row: 4, col: 3 },
        visualSlots: [
          { layerId: 'floor', row: 4, col: 3 },
          { layerId: 'objects', row: 5, col: 3 },
        ],
        gridPoints: [{ row: 5, col: 3 }],
      },
    ])
  })

  test('move 快照与当前组选区不一致时 fail-loud 且零写', () => {
    const map = fixtureMap()
    const clip = captureStampGroupClipboard('map-a', map, ['tree-a'], 'preserve')!
    const plan = planStampGroupMove({
      mapId: 'map-a',
      map,
      mapRevision: 1,
      placementIds: ['other-group'],
      targetAnchor: { row: 4, col: 3 },
      permission: writable,
      clipboard: clip,
    })
    expect(plan.canApply).toBe(false)
    expect(plan.issues.map((issue) => issue.message)).toEqual([
      '放置组“other-group”不存在或已被移除。',
      '组合移动快照与当前组选区不一致；请重新开始移动。',
    ])
    expect(plan.patch).toEqual({ visual: [], collision: [] })
  })

  test('组合粘贴目标层缺失：layer-missing 整笔失败，不产出 preparedPatch', () => {
    const map = fixtureMap()
    const clip = captureStampGroupClipboard('map-a', map, ['tree-a'], 'copy')!
    const withoutObjects = insertProjectMapLayer(map, buildProjectMapLayer(map, 'spare', '备用'))
    const removed = { ...withoutObjects, layers: withoutObjects.layers.slice(0, 1) }
    const plan = planStampGroupPaste({
      mapId: 'map-a',
      map: removed,
      mapRevision: 1,
      clipboard: clip,
      targetAnchor: { row: 4, col: 3 },
      permission: writable,
    })
    expect(plan.issues).toContainEqual({
      code: 'layer-missing',
      message: '目标图层“objects”不存在。',
      ref: { layerId: 'objects', row: 5, col: 3 },
    })
    expect(plan.canApply).toBe(false)
    expect(plan.preparedPatch).toBeUndefined()
    expect(plan.patch).toEqual({ visual: [], collision: [] })
  })

  test('未知 placementIds 的 move 走空快照回退计划并精确报缺失', () => {
    const map = fixtureMap()
    const plan = planStampGroupMove({
      mapId: 'map-a',
      map,
      mapRevision: 1,
      placementIds: ['ghost'],
      targetAnchor: { row: 4, col: 3 },
      permission: writable,
    })
    expect(plan.issues).toEqual([
      {
        code: 'stamp-selection-unsupported',
        message: '放置组“ghost”不存在或已被移除。',
      },
      {
        code: 'stamp-selection-unsupported',
        message: '组合移动快照与当前组选区不一致；请重新开始移动。',
      },
    ])
    expect(plan.canApply).toBe(false)
    expect(plan.changed).toBe(false)
    expect(plan.removePlacementIds).toEqual(['ghost'])
    expect(plan.upsertPlacements).toEqual([])
  })

  test('可提交 move/delete 计划的 nextSelection 与 placementSelection 形状', () => {
    const map = fixtureMap()
    const move = planStampGroupMove({
      mapId: 'map-a',
      map,
      mapRevision: 1,
      placementIds: ['tree-a'],
      targetAnchor: { row: 4, col: 3 },
      permission: writable,
    })
    expect(move.canApply).toBe(true)
    expect(move.placementSelection).toEqual({
      kind: 'stamp-placements',
      placementIds: ['tree-a'],
    })
    expect(move.nextSelection).toEqual({
      kind: 'cells',
      hitScope: 'visible-unlocked-layers',
      visualSlots: [
        { layerId: 'floor', row: 4, col: 3 },
        { layerId: 'objects', row: 5, col: 3 },
      ],
      gridPoints: [{ row: 5, col: 3 }],
    })

    const del = planStampGroupDelete({
      mapId: 'map-a',
      map,
      mapRevision: 1,
      placementIds: ['tree-a'],
      permission: writable,
    })
    expect(del.canApply).toBe(true)
    expect(del.placementSelection).toEqual({ kind: 'none' })
    expect(del.nextSelection).toEqual({ kind: 'none' })
  })
})
