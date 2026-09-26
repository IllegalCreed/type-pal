/**
 * TEST-CURSOR-MAP-LOGIC-2 M4：组合 clipboard 移动/复制/删除剩余计划。
 * 不去重 stamp-group-transform.boundaries 空列表/缺失组捕获。
 */
import { projectMapStampPlacements } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { editorStateWithMap, legalGroupMap } from './__tests__/cursor-map-logic-fixtures.js'
import { EditSession } from './edit-session.js'
import { TransformStampPlacementsCommand } from './stamp-group-command.js'
import {
  captureStampGroupClipboard,
  planStampGroupDelete,
  planStampGroupMove,
  planStampGroupPaste,
} from './stamp-group-transform.js'
import { stampCollisionOwner, stampVisualOwner } from './stamp-ownership.js'

const writable = { hiddenLayerIds: [] as string[], lockedLayerIds: [] as string[] }

describe('M4 stamp-group-transform 剩余合同', () => {
  test('planStampGroupMove 撞到未选中组：空 patch，tree-a 原位，tree-b 哨兵与 id 不变', () => {
    const map = legalGroupMap()
    const snap = structuredClone(map)
    const plan = planStampGroupMove({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      placementIds: ['tree-a'],
      targetAnchor: { row: 4, col: 3 },
      permission: writable,
    })
    expect(plan.canApply).toBe(false)
    expect(plan.patch).toEqual({ visual: [], collision: [] })
    expect(map).toEqual(snap)
    expect(projectMapStampPlacements(map).map((placement) => placement.id)).toEqual([
      'tree-a',
      'tree-b',
    ])
    expect(stampVisualOwner(map, { layerId: 'floor', row: 0, col: 0 })).toBe('tree-a')
    expect(stampVisualOwner(map, { layerId: 'floor', row: 4, col: 3 })).toBe('tree-b')
  })

  test('planStampGroupMove 两个 id：应用后双方 id 稳定，成员一起走，未选普通哨兵不写', () => {
    const before = legalGroupMap()
    const session = new EditSession(editorStateWithMap('map-a', before))
    const plan = planStampGroupMove({
      mapId: 'map-a',
      map: before,
      mapRevision: 0,
      placementIds: ['tree-a', 'tree-b'],
      targetAnchor: { row: 0, col: 1 },
      permission: writable,
    })
    expect(plan.canApply).toBe(true)
    expect(session.dispatch(new TransformStampPlacementsCommand(plan))).toBe(true)
    const after = session.getState().maps['map-a']!
    expect(projectMapStampPlacements(after).map((placement) => placement.id)).toEqual([
      'tree-a',
      'tree-b',
    ])
    expect(stampVisualOwner(after, { layerId: 'floor', row: 0, col: 0 })).toBeUndefined()
    expect(stampVisualOwner(after, { layerId: 'floor', row: 0, col: 1 })).toBe('tree-a')
    expect(stampVisualOwner(after, { layerId: 'floor', row: 4, col: 3 })).toBeUndefined()
    expect(
      projectMapStampPlacements(after).find((placement) => placement.id === 'tree-b')!.anchor,
    ).not.toEqual({
      row: 4,
      col: 3,
    })
  })

  test('planStampGroupDelete 只删列出的 id，另一组员格仍在', () => {
    const before = legalGroupMap()
    const session = new EditSession(editorStateWithMap('map-a', before))
    const plan = planStampGroupDelete({
      mapId: 'map-a',
      map: before,
      mapRevision: 0,
      placementIds: ['tree-a'],
      permission: writable,
    })
    expect(plan.canApply).toBe(true)
    expect(session.dispatch(new TransformStampPlacementsCommand(plan))).toBe(true)
    const after = session.getState().maps['map-a']!
    expect(projectMapStampPlacements(after).map((placement) => placement.id)).toEqual(['tree-b'])
    expect(stampVisualOwner(after, { layerId: 'floor', row: 0, col: 0 })).toBeUndefined()
    expect(after.layers.find((layer) => layer.id === 'floor')!.tiles[0]![0]).toBeNull()
    expect(stampVisualOwner(after, { layerId: 'floor', row: 4, col: 3 })).toBe('tree-b')
    expect(after.layers.find((layer) => layer.id === 'floor')!.tiles[4]![3]).toBe(4)
  })

  test('planStampGroupDelete 空列表/缺 id 抛公开错误，map 身份不变', () => {
    const map = legalGroupMap()
    expect(() =>
      planStampGroupDelete({
        mapId: 'map-a',
        map,
        mapRevision: 0,
        placementIds: [],
        permission: writable,
      }),
    ).toThrow('请先选择至少一个完整放置组。')
    expect(() =>
      planStampGroupDelete({
        mapId: 'map-a',
        map,
        mapRevision: 0,
        placementIds: ['ghost'],
        permission: writable,
      }),
    ).toThrow('请先选择至少一个完整放置组。')
    expect(stampVisualOwner(map, { layerId: 'floor', row: 0, col: 0 })).toBe('tree-a')
  })

  test('planStampGroupPaste copy 应用：源仍属 tree-a，目标由新 id 占用', () => {
    const before = legalGroupMap(false)
    const clipboard = captureStampGroupClipboard('map-a', before, ['tree-a'], 'copy')!
    const session = new EditSession(editorStateWithMap('map-a', before))
    const plan = planStampGroupPaste({
      mapId: 'map-a',
      map: before,
      mapRevision: 0,
      clipboard,
      targetAnchor: { row: 2, col: 1 },
      permission: writable,
    })
    expect(plan.canApply).toBe(true)
    expect(session.dispatch(new TransformStampPlacementsCommand(plan))).toBe(true)
    const after = session.getState().maps['map-a']!
    expect(stampVisualOwner(after, { layerId: 'floor', row: 0, col: 0 })).toBe('tree-a')
    const copyId = projectMapStampPlacements(after).find(
      (placement) => placement.id !== 'tree-a',
    )!.id
    expect(copyId).not.toBe('tree-a')
    expect(stampVisualOwner(after, { layerId: 'floor', row: 2, col: 1 })).toBe(copyId)
    expect(stampCollisionOwner(after, { row: 3, col: 1 })).toBe(copyId)
  })
})
