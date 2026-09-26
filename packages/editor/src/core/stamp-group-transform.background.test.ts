/**
 * TEST-CURSOR-MAP-LOGIC-2 M4：组合计划剩余轴。
 * 单组 move/copy/delete 全通道见 stamp-group-transform.test.ts:111/152/200。
 */
import { projectMapStampPlacements } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  editorStateWithMap,
  inputSnap,
  legalGroupMap,
  legalGroupMapWithOrdinarySentinel,
} from './__tests__/cursor-map-logic-fixtures.js'
import { EditSession } from './edit-session.js'
import { TransformStampPlacementsCommand } from './stamp-group-command.js'
import { planStampGroupDelete, planStampGroupMove } from './stamp-group-transform.js'
import { stampVisualOwner } from './stamp-ownership.js'

const writable = { hiddenLayerIds: [] as string[], lockedLayerIds: [] as string[] }

function layer(map: ReturnType<typeof legalGroupMap>, id: string) {
  return map.layers.find((entry) => entry.id === id)!
}

describe('M4 stamp-group-transform 剩余合同', () => {
  test('planStampGroupMove 撞到未选中组：空 patch，tree-a 原位，tree-b 组员与 id 不变', () => {
    const map = legalGroupMap()
    const input = {
      mapId: 'map-a',
      map,
      mapRevision: 0,
      placementIds: ['tree-a'],
      targetAnchor: { row: 4, col: 3 },
      permission: writable,
    }
    const mapSnap = inputSnap(map)
    const inputSnapValue = inputSnap(input)
    const plan = planStampGroupMove(input)
    expect(map).toEqual(mapSnap)
    expect(input).toEqual(inputSnapValue)
    expect(plan.canApply).toBe(false)
    expect(plan.patch).toEqual({ visual: [], collision: [] })
    expect(projectMapStampPlacements(map).map((placement) => placement.id)).toEqual([
      'tree-a',
      'tree-b',
    ])
    expect(stampVisualOwner(map, { layerId: 'floor', row: 0, col: 0 })).toBe('tree-a')
    expect(stampVisualOwner(map, { layerId: 'floor', row: 4, col: 3 })).toBe('tree-b')
  })

  test('planStampGroupMove 两个 id：精确成员/高度/碰撞与未选普通哨兵完整保真', async () => {
    const before = legalGroupMapWithOrdinarySentinel()
    const mapSnap = inputSnap(before)
    const session = new EditSession(await editorStateWithMap('map-a', before))
    const input = {
      mapId: 'map-a',
      map: before,
      mapRevision: 0,
      placementIds: ['tree-a', 'tree-b'],
      targetAnchor: { row: 0, col: 1 },
      permission: writable,
    }
    const inputSnapValue = inputSnap(input)
    const plan = planStampGroupMove(input)
    expect(before).toEqual(mapSnap)
    expect(input).toEqual(inputSnapValue)
    expect(plan.canApply).toBe(true)
    expect(session.dispatch(new TransformStampPlacementsCommand(plan))).toBe(true)
    expect(before).toEqual(mapSnap)
    const after = session.getState().maps['map-a']!
    expect(projectMapStampPlacements(after).map((placement) => placement.id)).toEqual([
      'tree-a',
      'tree-b',
    ])
    expect(
      projectMapStampPlacements(after).find((placement) => placement.id === 'tree-a'),
    ).toMatchObject({
      sourceStampId: 'tree',
      anchor: { row: 0, col: 1 },
      visualSlots: [
        { layerId: 'floor', row: 0, col: 1 },
        { layerId: 'objects', row: 1, col: 1 },
      ],
      gridPoints: [{ row: 1, col: 1 }],
    })
    expect(
      projectMapStampPlacements(after).find((placement) => placement.id === 'tree-b'),
    ).toMatchObject({
      sourceStampId: 'tree',
      anchor: { row: 4, col: 4 },
      visualSlots: [
        { layerId: 'floor', row: 4, col: 4 },
        { layerId: 'objects', row: 5, col: 4 },
      ],
      gridPoints: [{ row: 5, col: 4 }],
    })
    const floor = layer(after, 'floor')
    const objects = layer(after, 'objects')
    const floorBefore = layer(before, 'floor')
    const objectsBefore = layer(before, 'objects')
    expect(floor.tiles[0]![0]).toBeNull()
    expect(objects.tiles[1]![0]).toBeNull()
    expect(floor.tiles[4]![3]).toBeNull()
    expect(objects.tiles[5]![3]).toBeNull()
    expect(floor.tiles[0]![1]).toBe(1)
    expect(floor.sources?.[0]![1]).toBe(floorBefore.sources?.[0]![0])
    expect(floor.heights?.[0]![1] ?? 0).toBe(0)
    expect(objects.tiles[1]![1]).toBe(2)
    expect(objects.sources?.[1]![1]).toBe(objectsBefore.sources?.[1]![0])
    expect(objects.heights?.[1]![1]).toBe(3)
    expect(floor.tiles[4]![4]).toBe(4)
    expect(floor.heights?.[4]![4] ?? 0).toBe(0)
    expect(objects.tiles[5]![4]).toBe(5)
    expect(objects.heights?.[5]![4]).toBe(2)
    expect(objects.sources?.[5]![4]).toBe(objectsBefore.sources?.[5]![3])
    expect(after.collision[1]![0]).toBe(0)
    expect(after.collision[1]![1]).toBe(0)
    expect(after.collision[5]![3]).toBe(0)
    expect(after.collision[5]![4]).toBe(2)
    expect(floor.tiles[2]![2]).toBe(9)
    expect(floor.sources?.[2]![2]).toBe(floorBefore.sources?.[2]![2])
    expect(floor.heights?.[2]![2]).toBe(1)
    expect(after.collision[2]![2]).toBe(6)
    expect(stampVisualOwner(after, { layerId: 'floor', row: 2, col: 2 })).toBeUndefined()
  })

  test('planStampGroupDelete 只删列出的 id，另一组员格与通道仍在', async () => {
    const before = legalGroupMap()
    const mapSnap = inputSnap(before)
    const session = new EditSession(await editorStateWithMap('map-a', before))
    const input = {
      mapId: 'map-a',
      map: before,
      mapRevision: 0,
      placementIds: ['tree-a'],
      permission: writable,
    }
    const inputSnapValue = inputSnap(input)
    const plan = planStampGroupDelete(input)
    expect(before).toEqual(mapSnap)
    expect(input).toEqual(inputSnapValue)
    expect(plan.canApply).toBe(true)
    expect(session.dispatch(new TransformStampPlacementsCommand(plan))).toBe(true)
    expect(before).toEqual(mapSnap)
    const after = session.getState().maps['map-a']!
    expect(projectMapStampPlacements(after).map((placement) => placement.id)).toEqual(['tree-b'])
    expect(stampVisualOwner(after, { layerId: 'floor', row: 0, col: 0 })).toBeUndefined()
    expect(layer(after, 'floor').tiles[0]![0]).toBeNull()
    expect(stampVisualOwner(after, { layerId: 'floor', row: 4, col: 3 })).toBe('tree-b')
    expect(layer(after, 'floor').tiles[4]![3]).toBe(4)
    expect(layer(after, 'objects').tiles[5]![3]).toBe(5)
    expect(layer(after, 'objects').heights?.[5]![3]).toBe(2)
    expect(after.collision[5]![3]).toBe(2)
  })

  test('planStampGroupDelete 空列表/缺 id 抛公开错误，map 身份不变', () => {
    const map = legalGroupMap()
    const empty = {
      mapId: 'map-a',
      map,
      mapRevision: 0,
      placementIds: [] as string[],
      permission: writable,
    }
    const missing = {
      mapId: 'map-a',
      map,
      mapRevision: 0,
      placementIds: ['ghost'],
      permission: writable,
    }
    const mapSnap = inputSnap(map)
    const emptySnap = inputSnap(empty)
    const missingSnap = inputSnap(missing)
    expect(() => planStampGroupDelete(empty)).toThrow('请先选择至少一个完整放置组。')
    expect(map).toEqual(mapSnap)
    expect(empty).toEqual(emptySnap)
    expect(() => planStampGroupDelete(missing)).toThrow('请先选择至少一个完整放置组。')
    expect(map).toEqual(mapSnap)
    expect(missing).toEqual(missingSnap)
    expect(stampVisualOwner(map, { layerId: 'floor', row: 0, col: 0 })).toBe('tree-a')
  })
})
