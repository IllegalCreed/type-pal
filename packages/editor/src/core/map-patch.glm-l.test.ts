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
  ProjectMapPatchError,
  prepareProjectMapPatch,
  prepareStampGroupMemberPatch,
  prepareStampGroupTransformPatch,
} from './map-patch.js'

function ownedMap(): ProjectMap {
  let map = buildBlankProjectMap(3, 2, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
    { layerId: 'floor', row: 2, col: 1, tileId: 4, tilesetId: 'tiles', height: 0 },
  ])
  return withProjectMapStampPlacements(map, [
    {
      id: 'tree-1',
      anchor: { row: 0, col: 0 },
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [{ row: 1, col: 0 }],
    },
  ])
}

const floorWritable = {
  hiddenLayerIds: [] as string[],
  lockedLayerIds: [] as string[],
  requiredWritableLayerIds: ['floor'],
}

describe('TEST-GLM-WAVE-L-1 L03 map patch narrow entries & value guards', () => {
  test('组内窄入口对已删除的 placement 报 stamp-placement-missing', () => {
    const map = ownedMap()
    try {
      prepareStampGroupMemberPatch(map, { visual: [], collision: [] }, floorWritable, 'gone')
      expect.unreachable('应抛出 ProjectMapPatchError')
    } catch (error) {
      expect(error).toBeInstanceOf(ProjectMapPatchError)
      const issues = (error as ProjectMapPatchError).issues
      expect(issues).toEqual([
        {
          code: 'stamp-placement-missing',
          message: '图章放置组 "gone" 不存在或已被移除',
          ownerPlacementId: 'gone',
        },
      ])
    }
  })

  test('整组窄入口撞他组成员时逐通道报归属冲突；未归属槽位可写', () => {
    const map = ownedMap()
    try {
      prepareStampGroupTransformPatch(
        map,
        {
          visual: [{ channel: 'tileId', ref: { layerId: 'floor', row: 0, col: 0 }, value: 9 }],
          collision: [{ ref: { row: 1, col: 0 }, value: 1 }],
        },
        floorWritable,
        new Set(['my-group']),
      )
      expect.unreachable('应抛出 ProjectMapPatchError')
    } catch (error) {
      const issues = (error as ProjectMapPatchError).issues
      expect(issues.map((issue) => issue.code)).toEqual(['visual-owned', 'collision-owned'])
      expect(issues[0]).toMatchObject({
        ref: { layerId: 'floor', row: 0, col: 0 },
        ownerPlacementId: 'tree-1',
      })
    }
    const plain = prepareStampGroupTransformPatch(
      map,
      {
        visual: [{ channel: 'tileId', ref: { layerId: 'floor', row: 2, col: 1 }, value: 8 }],
        collision: [],
      },
      floorWritable,
      new Set(['my-group']),
    )
    expect(plain.nextVisual).toHaveLength(1)
    expect(plain.prevVisual[0]?.tileId).toBe(4)
  })

  test('tilesetId 空串与负高度是非法值；碰撞非整数坐标与越界各自拒绝', () => {
    const map = ownedMap()
    expect(() =>
      prepareProjectMapPatch(
        map,
        {
          visual: [{ channel: 'tilesetId', ref: { layerId: 'floor', row: 1, col: 1 }, value: '' }],
          collision: [],
        },
        floorWritable,
      ),
    ).toThrow('tilesetId 必须是非空字符串或 null')
    expect(() =>
      prepareProjectMapPatch(
        map,
        {
          visual: [{ channel: 'height', ref: { layerId: 'floor', row: 1, col: 1 }, value: -1 }],
          collision: [],
        },
        floorWritable,
      ),
    ).toThrow('实例高度必须是非负整数')
    expect(() =>
      prepareProjectMapPatch(
        map,
        { visual: [], collision: [{ ref: { row: 1.5, col: 1 }, value: 1 }] },
        floorWritable,
      ),
    ).toThrow('坐标必须是整数')
    expect(() =>
      prepareProjectMapPatch(
        map,
        { visual: [], collision: [{ ref: { row: 99, col: 1 }, value: 1 }] },
        floorWritable,
      ),
    ).toThrow('越出地图边界')
  })

  test('空槽写非空瓦片但缺 tilesetId 通道：missing-source 拒绝', () => {
    const map = ownedMap()
    expect(() =>
      prepareProjectMapPatch(
        map,
        {
          visual: [{ channel: 'tileId', ref: { layerId: 'floor', row: 1, col: 1 }, value: 5 }],
          collision: [],
        },
        floorWritable,
      ),
    ).toThrow('必须指定瓦片集来源')
  })
})
