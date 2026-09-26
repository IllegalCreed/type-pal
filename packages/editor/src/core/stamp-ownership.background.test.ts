/**
 * TEST-CURSOR-MAP-LOGIC-2 M6：公开 owner 查询与索引继承/增量。
 * 不反射 WeakMap 私有缓存。
 */
import { paintProjectMapTiles } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  editorStateWithMap,
  inputSnap,
  legalGroupMap,
} from './__tests__/cursor-map-logic-fixtures.js'
import { EditSession } from './edit-session.js'
import { visualSlotKey } from './map-selection.js'
import { TransformStampPlacementsCommand } from './stamp-group-command.js'
import { planStampGroupMove } from './stamp-group-transform.js'
import {
  directStampPlacementOwners,
  inheritStampPlacementIndex,
  seedStampPlacementIndexDelta,
  stampCollisionOwner,
  stampVisualOwner,
} from './stamp-ownership.js'

const writable = { hiddenLayerIds: [] as string[], lockedLayerIds: [] as string[] }

describe('M6 stamp-ownership 剩余合同', () => {
  test('stampVisualOwner/stampCollisionOwner 在真实放置图上精确返回 id，普通邻格 undefined', () => {
    const map = legalGroupMap()
    const mapSnap = inputSnap(map)
    const visualRef = { layerId: 'floor', row: 0, col: 0 }
    const collisionRef = { row: 1, col: 0 }
    const visualSnap = inputSnap(visualRef)
    const collisionSnap = inputSnap(collisionRef)
    expect(stampVisualOwner(map, visualRef)).toBe('tree-a')
    expect(stampVisualOwner(map, { layerId: 'objects', row: 1, col: 0 })).toBe('tree-a')
    expect(stampCollisionOwner(map, collisionRef)).toBe('tree-a')
    expect(stampVisualOwner(map, { layerId: 'floor', row: 2, col: 2 })).toBeUndefined()
    expect(stampCollisionOwner(map, { row: 0, col: 1 })).toBeUndefined()
    expect(map).toEqual(mapSnap)
    expect(visualRef).toEqual(visualSnap)
    expect(collisionRef).toEqual(collisionSnap)
    const direct = directStampPlacementOwners(map)
    expect(map).toEqual(mapSnap)
    expect(direct.visual.get(visualSlotKey({ layerId: 'floor', row: 0, col: 0 }))).toBe('tree-a')
  })

  test('inheritStampPlacementIndex 在普通 paint 后公开 owner 不变，并与直接扫描一致', () => {
    const before = legalGroupMap()
    const after = paintProjectMapTiles(before, [
      { layerId: 'floor', row: 2, col: 2, tileId: 9, tilesetId: 'tiles', height: 0 },
    ])
    const beforeSnap = inputSnap(before)
    const afterSnap = inputSnap(after)
    inheritStampPlacementIndex(before, after)
    expect(before).toEqual(beforeSnap)
    expect(after).toEqual(afterSnap)
    expect(stampVisualOwner(after, { layerId: 'floor', row: 0, col: 0 })).toBe('tree-a')
    expect(stampVisualOwner(after, { layerId: 'floor', row: 2, col: 2 })).toBeUndefined()
    expect(after).toEqual(afterSnap)
    expect(
      directStampPlacementOwners(after).visual.get(
        visualSlotKey({ layerId: 'floor', row: 0, col: 0 }),
      ),
    ).toBe('tree-a')
    expect(after).toEqual(afterSnap)
  })

  test('seedStampPlacementIndexDelta 缺 upsert id 抛出该 id；不读私有缓存', () => {
    const map = legalGroupMap()
    const mapSnap = inputSnap(map)
    const delta = { upsertPlacementIds: ['missing-id'] }
    const deltaSnap = inputSnap(delta)
    expect(() => seedStampPlacementIndexDelta(map, map, delta)).toThrow(
      '组合归属索引无法在 afterMap 找到 placement：missing-id',
    )
    expect(map).toEqual(mapSnap)
    expect(delta).toEqual(deltaSnap)
    expect(stampVisualOwner(map, { layerId: 'floor', row: 0, col: 0 })).toBe('tree-a')
  })

  test('planStampGroupMove 应用后公开查询：旧成员空，目标 tree-a，tree-b 组员仍在', async () => {
    const before = legalGroupMap()
    const mapSnap = inputSnap(before)
    const session = new EditSession(await editorStateWithMap('map-a', before))
    const input = {
      mapId: 'map-a',
      map: before,
      mapRevision: 0,
      placementIds: ['tree-a'],
      targetAnchor: { row: 2, col: 1 },
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
    expect(stampVisualOwner(after, { layerId: 'floor', row: 0, col: 0 })).toBeUndefined()
    expect(stampVisualOwner(after, { layerId: 'floor', row: 2, col: 1 })).toBe('tree-a')
    expect(stampVisualOwner(after, { layerId: 'floor', row: 4, col: 3 })).toBe('tree-b')
  })
})
