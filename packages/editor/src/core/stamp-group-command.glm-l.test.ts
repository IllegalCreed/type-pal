import type { ProjectMap } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
  projectMapStampPlacements,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import {
  EditStampPlacementCommand,
  StampGroupCommandError,
  TransformStampPlacementsCommand,
  UngroupStampPlacementsCommand,
} from './stamp-group-command.js'
import { planStampGroupMove } from './stamp-group-transform.js'

function fixtureMap(): ProjectMap {
  let map = buildBlankProjectMap(3, 2, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
    { layerId: 'objects', row: 1, col: 0, tileId: 2, tilesetId: 'tiles', height: 5 },
  ])
  return withProjectMapStampPlacements(map, [
    {
      id: 'tree-1',
      sourceStampId: 'tree',
      sourceStampName: '树',
      anchor: { row: 0, col: 0 },
      visualSlots: [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'objects', row: 1, col: 0 },
      ],
      gridPoints: [{ row: 1, col: 0 }],
    },
  ])
}

function state(map: ProjectMap = fixtureMap()): EditorState {
  return {
    manifest: { content: {} },
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    entryPoints: [],
    maps: { 'map-a': map },
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps: [],
  } as EditorState
}

const writable = { hiddenLayerIds: [] as string[], lockedLayerIds: [] as string[] }

describe('TEST-GLM-WAVE-L-1 L06 stamp group command guards', () => {
  test('解组空选区与含未知 id 的选区都在构造期精确拒绝', () => {
    const map = fixtureMap()
    expect(
      () =>
        new UngroupStampPlacementsCommand({
          mapId: 'map-a',
          map,
          placementIds: [],
          permission: writable,
        }),
    ).toThrow(StampGroupCommandError)
    expect(
      () =>
        new UngroupStampPlacementsCommand({
          mapId: 'map-a',
          map,
          placementIds: [],
          permission: writable,
        }),
    ).toThrow('请先选择至少一个图章放置组。')
    expect(
      () =>
        new UngroupStampPlacementsCommand({
          mapId: 'map-a',
          map,
          placementIds: ['gone'],
          permission: writable,
        }),
    ).toThrow('图章放置组 "gone" 不存在或已被移除。')
    expect(map.layers).toHaveLength(2)
  })

  test('EditStampPlacementCommand.apply 对缺图与过期地图零写并显式失败', () => {
    const before = fixtureMap()
    const command = new EditStampPlacementCommand({
      mapId: 'map-a',
      map: before,
      placementId: 'tree-1',
      activeLayerId: 'objects',
      permission: writable,
      patch: {
        visual: [{ channel: 'tileId', ref: { layerId: 'objects', row: 1, col: 0 }, value: 8 }],
        collision: [],
      },
    })
    const emptyMaps = { ...state(before), maps: {} }
    expect(() => command.apply(emptyMaps)).toThrow('地图 "map-a" 尚未加载或不存在。')
    const staleMap = insertProjectMapLayer(before, buildProjectMapLayer(before, 'extra', '额外'))
    expect(() => command.apply({ ...emptyMaps, maps: { 'map-a': staleMap } })).toThrow(
      '图章放置组编辑计划已过期；请按当前地图重新操作。',
    )
    expect(staleMap.layers).toHaveLength(3)
    expect(staleMap.layers[1]?.tiles[1]?.[0]).toBe(2)
  })

  test('no-op 组内编辑的 apply 与 invert 都是零写早退', () => {
    const before = fixtureMap()
    const noOp = new EditStampPlacementCommand({
      mapId: 'map-a',
      map: before,
      placementId: 'tree-1',
      activeLayerId: 'objects',
      permission: writable,
      patch: {
        visual: [{ channel: 'tileId', ref: { layerId: 'objects', row: 1, col: 0 }, value: 2 }],
        collision: [],
      },
    })
    const untouched = state(before)
    expect(noOp.apply(untouched)).toBe(untouched)
    expect(noOp.invert(untouched)).toBe(untouched)
  })

  test('解组 invert 在地图缺失时抛错；label 走单/复数分支', () => {
    const before = fixtureMap()
    const single = new UngroupStampPlacementsCommand({
      mapId: 'map-a',
      map: before,
      placementIds: ['tree-1'],
      permission: writable,
    })
    expect(single.label).toBe('解组“tree-1”')
    expect(() => single.invert({ ...state(before), maps: {} })).toThrow(
      '地图 "map-a" 尚未加载或不存在。',
    )

    let multiMap = paintProjectMapTiles(before, [
      { layerId: 'floor', row: 2, col: 1, tileId: 4, tilesetId: 'tiles', height: 0 },
    ])
    multiMap = withProjectMapStampPlacements(multiMap, [
      ...projectMapStampPlacements(multiMap),
      {
        id: 'tree-2',
        sourceStampId: 'tree',
        sourceStampName: '树 2',
        anchor: { row: 2, col: 1 },
        visualSlots: [{ layerId: 'floor', row: 2, col: 1 }],
        gridPoints: [],
      },
    ])
    const multi = new UngroupStampPlacementsCommand({
      mapId: 'map-a',
      map: multiMap,
      placementIds: ['tree-1', 'tree-2'],
      permission: writable,
    })
    expect(multi.label).toBe('解组 2 个图章放置组')
  })

  test('reject 组合移动计划直接构造 Command 时以冲突数回退文案', () => {
    const occupied = paintProjectMapTiles(fixtureMap(), [
      { layerId: 'floor', row: 2, col: 1, tileId: 9, tilesetId: 'tiles', height: 0 },
    ])
    const plan = planStampGroupMove({
      mapId: 'map-a',
      map: occupied,
      mapRevision: 1,
      placementIds: ['tree-1'],
      targetAnchor: { row: 2, col: 1 },
      permission: writable,
      conflictPolicy: 'reject',
    })
    expect(plan.issues).toEqual([])
    expect(plan.conflicts).toEqual([
      {
        channel: 'visual',
        ref: { layerId: 'floor', row: 2, col: 1 },
        currentValue: 9,
        incomingValue: 1,
      },
    ])
    expect(plan.canApply).toBe(false)
    expect(() => new TransformStampPlacementsCommand(plan)).toThrow(
      '组合目标有 1 处普通内容冲突。',
    )
  })

  test('组内编辑构造器：未知组、未知活动层与非成员输入都精确拒绝', () => {
    const map = fixtureMap()
    const baseInput = {
      mapId: 'map-a',
      map,
      placementId: 'tree-1',
      activeLayerId: 'objects',
      permission: writable,
    }
    expect(
      () =>
        new EditStampPlacementCommand({
          ...baseInput,
          placementId: 'gone',
          patch: { visual: [], collision: [] },
        }),
    ).toThrow('图章放置组 "gone" 不存在或已被移除。')
    expect(
      () =>
        new EditStampPlacementCommand({
          ...baseInput,
          activeLayerId: 'ghost-layer',
          patch: { visual: [], collision: [] },
        }),
    ).toThrow('活动图层 "ghost-layer" 不存在，不能组内编辑。')
    expect(
      () =>
        new EditStampPlacementCommand({
          ...baseInput,
          patch: { visual: [], collision: [] },
          removeVisualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        }),
    ).toThrow('组内视觉编辑只能作用于当前活动层成员。')
    expect(
      () =>
        new EditStampPlacementCommand({
          ...baseInput,
          patch: {
            visual: [{ channel: 'tileId', ref: { layerId: 'objects', row: 2, col: 2 }, value: null }],
            collision: [],
          },
        }),
    ).toThrow('不属于放置组')
    expect(
      () =>
        new EditStampPlacementCommand({
          ...baseInput,
          patch: { visual: [], collision: [] },
          removeGridPoints: [{ row: 2, col: 2 }],
        }),
    ).toThrow('碰撞格点 2:2 不属于放置组 "tree-1"。')
  })

  test('解组 apply 对缺图与过期地图零写并显式失败', () => {
    const before = fixtureMap()
    const command = new UngroupStampPlacementsCommand({
      mapId: 'map-a',
      map: before,
      placementIds: ['tree-1'],
      permission: writable,
    })
    const emptyMaps = { ...state(before), maps: {} }
    expect(() => command.apply(emptyMaps)).toThrow('地图 "map-a" 尚未加载或不存在。')
    const staleMap = insertProjectMapLayer(before, buildProjectMapLayer(before, 'extra', '额外'))
    expect(() => command.apply({ ...emptyMaps, maps: { 'map-a': staleMap } })).toThrow(
      '解组计划已过期；请按当前地图重新操作。',
    )
    expect(staleMap.layers).toHaveLength(3)
  })

  test('整组变换 apply/invert 对缺图与过期地图都显式失败', () => {
    const occupied = paintProjectMapTiles(fixtureMap(), [
      { layerId: 'floor', row: 2, col: 1, tileId: 9, tilesetId: 'tiles', height: 0 },
    ])
    const plan = planStampGroupMove({
      mapId: 'map-a',
      map: occupied,
      mapRevision: 1,
      placementIds: ['tree-1'],
      targetAnchor: { row: 2, col: 1 },
      permission: writable,
      conflictPolicy: 'overwrite',
    })
    expect(plan.canApply).toBe(true)
    const command = new TransformStampPlacementsCommand(plan)
    const emptyMaps = { ...state(occupied), maps: {} }
    expect(() => command.apply(emptyMaps)).toThrow('地图 "map-a" 尚未加载或不存在。')
    expect(() => command.invert(emptyMaps)).toThrow('地图 "map-a" 尚未加载或不存在。')
    const staleMap = insertProjectMapLayer(
      occupied,
      buildProjectMapLayer(occupied, 'extra', '额外'),
    )
    expect(() => command.apply({ ...emptyMaps, maps: { 'map-a': staleMap } })).toThrow(
      '组合变换计划已过期；请按当前地图重新预览后提交。',
    )
  })
})
