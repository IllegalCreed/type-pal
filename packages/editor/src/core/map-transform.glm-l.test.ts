import type { ProjectMap } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { captureMapClipboard, planMapMove, planMapPaste } from './map-transform.js'

function plainMap(): ProjectMap {
  let map = buildBlankProjectMap(4, 2, 'tiles')
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
    { layerId: 'floor', row: 1, col: 0, tileId: 2, tilesetId: 'tiles', height: 0 },
  ])
  return map
}

function ownedMap(): ProjectMap {
  const map = plainMap()
  return withProjectMapStampPlacements(map, [
    {
      id: 'tree-1',
      anchor: { row: 0, col: 0 },
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [],
    },
  ])
}

describe('TEST-GLM-WAVE-L-1 L03 map transform gaps', () => {
  test('粘贴撞图章归属槽是 plan 级硬错误，overwrite 也不能绕过', () => {
    const map = ownedMap()
    const clip = captureMapClipboard(
      'map-a',
      plainMap(),
      {
        kind: 'cells',
        visualSlots: [{ layerId: 'floor', row: 1, col: 0 }],
        gridPoints: [],
        hitScope: 'active-layer',
      },
      false,
    )!
    const plan = planMapPaste(map, clip, { row: 0, col: 0 })
    expect(plan.issues).toEqual([
      {
        code: 'visual-owned',
        message: '视觉槽 floor:0:0 属于图章放置组 "tree-1"；请进入组内编辑或先解组',
        ref: { layerId: 'floor', row: 0, col: 0 },
        ownerPlacementId: 'tree-1',
      },
    ])
    expect(plan.canApply).toBe(false)
    const forced = planMapPaste(map, clip, { row: 0, col: 0 }, { conflictPolicy: 'overwrite' })
    expect(forced.canApply).toBe(false)
  })

  test('无可搬内容（空槽不含碰撞）的 move 回退为 empty-selection 删除计划', () => {
    const map = plainMap()
    const plan = planMapMove(
      map,
      {
        kind: 'cells',
        visualSlots: [{ layerId: 'floor', row: 2, col: 1 }],
        gridPoints: [],
        hitScope: 'active-layer',
      },
      { row: 0, col: 2 },
      { includeCollision: false, collisionAuthorityLayerId: 'floor' },
    )
    expect(plan.issues).toEqual([
      { code: 'empty-selection', message: '选区没有可变换的地图内容' },
    ])
    expect(plan.canApply).toBe(false)
    expect(plan.patch).toEqual({ visual: [], collision: [] })
  })

  test('capture 丢弃悬空层与空槽，重复格点只保留一份', () => {
    const map = plainMap()
    const clip = captureMapClipboard(
      'map-a',
      map,
      {
        kind: 'cells',
        visualSlots: [
          { layerId: 'ghost-layer', row: 0, col: 0 },
          { layerId: 'floor', row: 2, col: 1 },
          { layerId: 'floor', row: 0, col: 0 },
          { layerId: 'floor', row: 0, col: 0 },
        ],
        gridPoints: [
          { row: 0, col: 0 },
          { row: 0, col: 0 },
        ],
        hitScope: 'active-layer',
      },
      true,
    )!
    expect(clip.visual).toHaveLength(1)
    expect(clip.visual[0]).toMatchObject({ sourceRef: { layerId: 'floor', row: 0, col: 0 }, tileId: 1 })
    expect(clip.collision).toEqual({
      kind: 'included',
      cells: [{ sourceRef: { row: 0, col: 0 }, offset: { dRow: 0, du: 0 }, value: 0 }],
    })
  })

  test('无映射的粘贴按来源层身份落笔（identity fallback）', () => {
    const map = insertProjectMapLayer(plainMap(), buildProjectMapLayer(plainMap(), 'objects', '物件'))
    const clip = captureMapClipboard(
      'map-a',
      map,
      {
        kind: 'cells',
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [],
        hitScope: 'active-layer',
      },
      false,
    )!
    const plan = planMapPaste(map, clip, { row: 2, col: 1 })
    expect(plan.canApply).toBe(true)
    expect(plan.patch.visual.map((write) => write.ref)).toEqual([
      { layerId: 'floor', row: 2, col: 1 },
      { layerId: 'floor', row: 2, col: 1 },
      { layerId: 'floor', row: 2, col: 1 },
    ])
    expect(plan.requiredWritableLayerIds).toEqual(['floor'])
  })

  test('includeCollision 的 move 撞不同非零碰撞时按通道报冲突，overwrite 可提交', () => {
    let map = paintProjectMapCollision(plainMap(), [{ row: 2, col: 1, value: 3 }])
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', row: 0, col: 1, tileId: 6, tilesetId: 'tiles', height: 0 },
    ])
    const reject = planMapMove(
      map,
      {
        kind: 'cells',
        visualSlots: [{ layerId: 'floor', row: 0, col: 1 }],
        gridPoints: [{ row: 0, col: 1 }],
        hitScope: 'active-layer',
      },
      { row: 2, col: 1 },
      { includeCollision: true, collisionAuthorityLayerId: 'floor' },
    )
    expect(reject.conflicts).toEqual([
      {
        channel: 'collision',
        ref: { row: 2, col: 1 },
        currentValue: 3,
        incomingValue: 0,
      },
    ])
    expect(reject.canApply).toBe(false)

    const overwrite = planMapMove(
      map,
      {
        kind: 'cells',
        visualSlots: [{ layerId: 'floor', row: 0, col: 1 }],
        gridPoints: [{ row: 0, col: 1 }],
        hitScope: 'active-layer',
      },
      { row: 2, col: 1 },
      { includeCollision: true, collisionAuthorityLayerId: 'floor', conflictPolicy: 'overwrite' },
    )
    expect(overwrite.canApply).toBe(true)
    const collisionWrites = overwrite.patch.collision
    expect(collisionWrites).toContainEqual({ ref: { row: 2, col: 1 }, value: 0 })
    expect(collisionWrites).toContainEqual({ ref: { row: 0, col: 1 }, value: 0 })
  })
})
