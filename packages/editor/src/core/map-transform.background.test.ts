/**
 * TEST-CURSOR-MAP-LOGIC-2 M3：真实 clipboard→move/delete/paste 剩余组合。
 * 不去重 map-transform.boundaries 占用粘贴完整快照。
 */
import { paintProjectMapTiles, withProjectMapStampPlacements } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  applyPlanPatch,
  inputSnap,
  legalPaintedMap,
} from './__tests__/cursor-map-logic-fixtures.js'
import type { MapSelection } from './map-selection.js'
import { captureMapClipboard, planMapDelete, planMapMove, planMapPaste } from './map-transform.js'

const cells: MapSelection = {
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

const collisionOpts = {
  includeCollision: true,
  collisionAuthorityLayerId: 'objects',
}

describe('M3 map-transform 剩余合同', () => {
  test('planMapMove 越界：空 patch、issues 含 out-of-bounds，map/selection 输入不变', () => {
    const map = legalPaintedMap()
    const options = { ...collisionOpts }
    const mapSnap = inputSnap(map)
    const selectionSnap = inputSnap(cells)
    const optionsSnap = inputSnap(options)
    const plan = planMapMove(map, cells, { row: 20, col: 20 }, options)
    expect(map).toEqual(mapSnap)
    expect(cells).toEqual(selectionSnap)
    expect(options).toEqual(optionsSnap)
    expect(plan.canApply).toBe(false)
    expect(plan.patch).toEqual({ visual: [], collision: [] })
    expect(plan.issues.some((issue) => issue.code === 'out-of-bounds')).toBe(true)
  })

  test('planMapMove reject 占用普通格：空 patch；overwrite 后真实应用搬走源并写目标', () => {
    const map = paintProjectMapTiles(legalPaintedMap(), [
      { layerId: 'objects', row: 2, col: 1, tileId: 7, tilesetId: 'tiles', height: 0 },
    ])
    const rejectOpts = {
      includeCollision: false,
      collisionAuthorityLayerId: 'objects',
      conflictPolicy: 'reject' as const,
    }
    const mapSnap = inputSnap(map)
    const selectionSnap = inputSnap(cells)
    const rejectOptsSnap = inputSnap(rejectOpts)
    const rejected = planMapMove(map, cells, { row: 2, col: 1 }, rejectOpts)
    expect(map).toEqual(mapSnap)
    expect(cells).toEqual(selectionSnap)
    expect(rejectOpts).toEqual(rejectOptsSnap)
    expect(rejected.canApply).toBe(false)
    expect(rejected.patch).toEqual({ visual: [], collision: [] })
    expect(rejected.conflicts.length).toBeGreaterThan(0)
    const overwriteOpts = {
      includeCollision: false,
      collisionAuthorityLayerId: 'objects',
      conflictPolicy: 'overwrite' as const,
    }
    const overwriteOptsSnap = inputSnap(overwriteOpts)
    const accepted = planMapMove(map, cells, { row: 2, col: 1 }, overwriteOpts)
    expect(map).toEqual(mapSnap)
    expect(cells).toEqual(selectionSnap)
    expect(overwriteOpts).toEqual(overwriteOptsSnap)
    expect(accepted.canApply).toBe(true)
    const after = applyPlanPatch(map, accepted.patch, accepted.requiredWritableLayerIds)
    expect(map).toEqual(mapSnap)
    expect(after.layers.find((layer) => layer.id === 'objects')!.tiles[0]![0]).toBeNull()
    expect(after.layers.find((layer) => layer.id === 'objects')!.tiles[2]![1]).toBe(2)
    expect(after.layers.find((layer) => layer.id === 'objects')!.tiles[4]![3]).toBe(9)
  })

  test('planMapDelete 对 stamp-placements：stamp-selection-unsupported，空 patch，组员瓦片不变', () => {
    const map = withProjectMapStampPlacements(legalPaintedMap(), [
      {
        id: 'tree-1',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'objects', row: 0, col: 0 }],
        gridPoints: [{ row: 0, col: 0 }],
      },
    ])
    const selection = { kind: 'stamp-placements' as const, placementIds: ['tree-1'] }
    const mapSnap = inputSnap(map)
    const selectionSnap = inputSnap(selection)
    const plan = planMapDelete(map, selection, true, 'objects')
    expect(map).toEqual(mapSnap)
    expect(selection).toEqual(selectionSnap)
    expect(plan.canApply).toBe(false)
    expect(plan.patch).toEqual({ visual: [], collision: [] })
    expect(plan.issues).toEqual([
      {
        code: 'stamp-selection-unsupported',
        message: '整组删除必须使用图章放置组操作，不能拆成普通 W8 单元格删除',
      },
    ])
    expect(map.layers.find((layer) => layer.id === 'objects')!.tiles[0]![0]).toBe(2)
  })

  test('captureMapClipboard 对 none 与 stamp-placements 都返回 undefined', () => {
    const map = legalPaintedMap()
    const none = { kind: 'none' as const }
    const stamps = { kind: 'stamp-placements' as const, placementIds: ['tree-1'] }
    const mapSnap = inputSnap(map)
    const noneSnap = inputSnap(none)
    const stampsSnap = inputSnap(stamps)
    expect(captureMapClipboard('start', map, none, true)).toBeUndefined()
    expect(map).toEqual(mapSnap)
    expect(none).toEqual(noneSnap)
    expect(captureMapClipboard('start', map, stamps, true)).toBeUndefined()
    expect(map).toEqual(mapSnap)
    expect(stamps).toEqual(stampsSnap)
  })

  test('planMapMove include-collision 成功应用：目标碰撞写入，旁对象 (4,3) 瓦片 9 不动', () => {
    const map = legalPaintedMap()
    const options = { ...collisionOpts, conflictPolicy: 'overwrite' as const }
    const mapSnap = inputSnap(map)
    const selectionSnap = inputSnap(cells)
    const optionsSnap = inputSnap(options)
    const plan = planMapMove(map, cells, { row: 2, col: 1 }, options)
    expect(map).toEqual(mapSnap)
    expect(cells).toEqual(selectionSnap)
    expect(options).toEqual(optionsSnap)
    expect(plan.canApply).toBe(true)
    expect(plan.patch.collision.length).toBeGreaterThan(0)
    const after = applyPlanPatch(map, plan.patch, plan.requiredWritableLayerIds)
    expect(map).toEqual(mapSnap)
    expect(after.collision[2]![1]).toBe(5)
    expect(after.layers.find((layer) => layer.id === 'objects')!.tiles[4]![3]).toBe(9)
    expect(after.layers.find((layer) => layer.id === 'objects')!.tiles[0]![0]).toBeNull()
  })

  test('planMapPaste 视觉在界、碰撞越界：双通道空 patch，clipboard/map 保真', () => {
    const map = legalPaintedMap()
    const mixed: MapSelection = {
      kind: 'cells',
      visualSlots: [{ layerId: 'objects', row: 0, col: 0 }],
      gridPoints: [
        { row: 0, col: 0 },
        { row: 7, col: 4 },
      ],
      hitScope: 'active-layer',
    }
    const mapForCapture = inputSnap(map)
    const mixedSnap = inputSnap(mixed)
    const clipboard = captureMapClipboard('start', map, mixed, true)!
    expect(map).toEqual(mapForCapture)
    expect(mixed).toEqual(mixedSnap)
    const pasteOpts = {
      layerMappings: [{ sourceLayerId: 'objects', targetLayerId: 'objects' }],
      collisionAuthorityLayerId: 'objects',
    }
    const mapSnap = inputSnap(map)
    const clipSnap = inputSnap(clipboard)
    const pasteOptsSnap = inputSnap(pasteOpts)
    const plan = planMapPaste(map, clipboard, { row: 1, col: 1 }, pasteOpts)
    expect(map).toEqual(mapSnap)
    expect(clipboard).toEqual(clipSnap)
    expect(pasteOpts).toEqual(pasteOptsSnap)
    expect(plan.canApply).toBe(false)
    expect(plan.patch).toEqual({ visual: [], collision: [] })
    expect(plan.issues.some((issue) => issue.code === 'out-of-bounds')).toBe(true)
  })
})
