import type { ProjectMap } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  projectMapStampPlacements,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import {
  EditStampPlacementCommand,
  StampGroupCommandError,
  UngroupStampPlacementsCommand,
} from './stamp-group-command.js'
import { floodFillStampPlacementTiles } from './stamp-ownership.js'

function fixtureMap(): ProjectMap {
  let map = buildBlankProjectMap(3, 2, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
    { layerId: 'objects', row: 1, col: 0, tileId: 2, tilesetId: 'tiles', height: 5 },
  ])
  map = paintProjectMapCollision(map, [{ row: 1, col: 0, value: 2 }])
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

function state(map = fixtureMap()): EditorState {
  return {
    manifest: { content: {} },
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    maps: { 'map-a': map },
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps: [],
  } as unknown as EditorState
}

const writable = { hiddenLayerIds: [] as string[], lockedLayerIds: [] as string[] }

describe('W7G stamp group commands', () => {
  test('组内 fill 不能从组外起步，也不能借普通格桥接两个成员', () => {
    let map: ProjectMap = buildBlankProjectMap(2, 2, 'tiles')
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
      { layerId: 'floor', row: 1, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
      { layerId: 'floor', row: 2, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
    ])
    map = withProjectMapStampPlacements(map, [
      {
        id: 'split',
        anchor: { row: 0, col: 0 },
        visualSlots: [
          { layerId: 'floor', row: 0, col: 0 },
          { layerId: 'floor', row: 2, col: 0 },
        ],
        gridPoints: [],
      },
    ])
    expect(
      floodFillStampPlacementTiles(map, 'split', 'floor', { row: 1, col: 0 }, 9, 'tiles', 0),
    ).toEqual([])
    expect(
      floodFillStampPlacementTiles(map, 'split', 'floor', { row: 0, col: 0 }, 9, 'tiles', 0),
    ).toEqual([{ layerId: 'floor', row: 0, col: 0, tileId: 9, tilesetId: 'tiles', height: 0 }])
  })

  test('组内 fill 以 tileId + height 连通，不跨越同 tile 的其他高度', () => {
    let map: ProjectMap = buildBlankProjectMap(2, 2, 'tiles')
    map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
    map = paintProjectMapTiles(map, [
      { layerId: 'objects', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 1 },
      { layerId: 'objects', row: 1, col: 0, tileId: 1, tilesetId: 'tiles', height: 2 },
    ])
    map = withProjectMapStampPlacements(map, [
      {
        id: 'mixed-height',
        anchor: { row: 0, col: 0 },
        visualSlots: [
          { layerId: 'objects', row: 0, col: 0 },
          { layerId: 'objects', row: 1, col: 0 },
        ],
        gridPoints: [],
      },
    ])
    expect(
      floodFillStampPlacementTiles(
        map,
        'mixed-height',
        'objects',
        { row: 0, col: 0 },
        9,
        'tiles',
        3,
      ),
    ).toEqual([{ layerId: 'objects', row: 0, col: 0, tileId: 9, tilesetId: 'tiles', height: 3 }])
  })

  test('组内 tile/height/collision 原子编辑；collision=0 仍保留 membership', () => {
    const before = fixtureMap()
    const session = new EditSession(state(before))
    const command = new EditStampPlacementCommand({
      mapId: 'map-a',
      map: before,
      placementId: 'tree-1',
      activeLayerId: 'objects',
      permission: writable,
      patch: {
        visual: [
          {
            channel: 'tileId',
            ref: { layerId: 'objects', row: 1, col: 0 },
            value: 8,
          },
          {
            channel: 'height',
            ref: { layerId: 'objects', row: 1, col: 0 },
            value: 6,
          },
        ],
        collision: [{ ref: { row: 1, col: 0 }, value: 0 }],
      },
    })
    expect(session.dispatch(command)).toBe(true)
    const edited = session.getState().maps['map-a']!
    expect(edited.layers[1]?.tiles[1]?.[0]).toBe(8)
    expect(edited.layers[1]?.heights?.[1]?.[0]).toBe(6)
    expect(edited.collision[1]?.[0]).toBe(0)
    expect(projectMapStampPlacements(edited)[0]?.gridPoints).toEqual([{ row: 1, col: 0 }])
    expect(session.undo()).toBe(true)
    expect(session.getState().maps['map-a']).toBe(before)
    expect(session.redo()).toBe(true)
    const redone = session.getState().maps['map-a']!
    expect(redone.layers[1]?.tiles[1]?.[0]).toBe(8)
    expect(redone.collision[1]?.[0]).toBe(0)
    expect(projectMapStampPlacements(redone)[0]?.gridPoints).toEqual([{ row: 1, col: 0 }])
  })

  test('碰撞编辑要求 placement 涉及的全部视觉层可写', () => {
    const map = fixtureMap()
    expect(
      () =>
        new EditStampPlacementCommand({
          mapId: 'map-a',
          map,
          placementId: 'tree-1',
          activeLayerId: 'objects',
          permission: { hiddenLayerIds: [], lockedLayerIds: ['floor'] },
          patch: {
            visual: [],
            collision: [{ ref: { row: 1, col: 0 }, value: 3 }],
          },
        }),
    ).toThrow(/锁定/)
  })

  test('擦除同步缩减 visual identity，最后一个视觉成员整笔拒绝', () => {
    const before = fixtureMap()
    const first = new EditStampPlacementCommand({
      mapId: 'map-a',
      map: before,
      placementId: 'tree-1',
      activeLayerId: 'objects',
      permission: writable,
      patch: { visual: [], collision: [] },
      removeVisualSlots: [{ layerId: 'objects', row: 1, col: 0 }],
    }).apply(state(before))
    const shrunk = first.maps['map-a']!
    expect(shrunk.layers[1]?.tiles[1]?.[0]).toBeNull()
    expect(shrunk.layers[1]?.heights?.[1]?.[0] ?? 0).toBe(0)
    expect(projectMapStampPlacements(shrunk)[0]?.visualSlots).toEqual([
      { layerId: 'floor', row: 0, col: 0 },
    ])
    expect(
      () =>
        new EditStampPlacementCommand({
          mapId: 'map-a',
          map: shrunk,
          placementId: 'tree-1',
          activeLayerId: 'floor',
          permission: writable,
          patch: { visual: [], collision: [] },
          removeVisualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        }),
    ).toThrow(/最后一个视觉成员/)
  })

  test('显式移出 collision membership 保留当前矩阵值', () => {
    const before = fixtureMap()
    const result = new EditStampPlacementCommand({
      mapId: 'map-a',
      map: before,
      placementId: 'tree-1',
      activeLayerId: 'objects',
      permission: writable,
      patch: { visual: [], collision: [] },
      removeGridPoints: [{ row: 1, col: 0 }],
    }).apply(state(before)).maps['map-a']!
    expect(result.collision).toBe(before.collision)
    expect(result.collision[1]?.[0]).toBe(2)
    expect(projectMapStampPlacements(result)[0]?.gridPoints).toEqual([])
  })

  test('碰撞成员不能在同一原子里既改值又移出 identity', () => {
    const before = fixtureMap()
    expect(
      () =>
        new EditStampPlacementCommand({
          mapId: 'map-a',
          map: before,
          placementId: 'tree-1',
          activeLayerId: 'objects',
          permission: writable,
          patch: {
            visual: [],
            collision: [{ ref: { row: 1, col: 0 }, value: 9 }],
          },
          removeGridPoints: [{ row: 1, col: 0 }],
        }),
    ).toThrow(/不能同时修改并移出放置组/)
    expect(before.collision[1]?.[0]).toBe(2)
    expect(projectMapStampPlacements(before)[0]?.gridPoints).toEqual([{ row: 1, col: 0 }])
  })

  test('解组只删 identity；始终保持 canonical v4，undo 精确恢复', () => {
    const before = fixtureMap()
    const layers = before.layers
    const collision = before.collision
    const session = new EditSession(state(before))
    expect(
      session.dispatch(
        new UngroupStampPlacementsCommand({
          mapId: 'map-a',
          map: before,
          placementIds: ['tree-1'],
          permission: writable,
        }),
      ),
    ).toBe(true)
    const ungrouped = session.getState().maps['map-a']!
    expect(ungrouped.version).toBe(4)
    expect(ungrouped.layers).toBe(layers)
    expect(ungrouped.collision).toBe(collision)
    expect(session.undo()).toBe(true)
    expect(session.getState().maps['map-a']).toBe(before)
    expect(session.redo()).toBe(true)
    expect(session.getState().maps['map-a']?.version).toBe(4)
  })

  test('部分解组保持 v4 矩阵引用并只移除指定 identity', () => {
    let before = fixtureMap()
    before = paintProjectMapTiles(before, [
      { layerId: 'floor', row: 2, col: 1, tileId: 4, tilesetId: 'tiles', height: 0 },
    ])
    before = withProjectMapStampPlacements(before, [
      ...projectMapStampPlacements(before),
      {
        id: 'tree-2',
        sourceStampId: 'tree',
        sourceStampName: '树 2',
        anchor: { row: 2, col: 1 },
        visualSlots: [{ layerId: 'floor', row: 2, col: 1 }],
        gridPoints: [],
      },
    ])
    const layers = before.layers
    const collision = before.collision
    const result = new UngroupStampPlacementsCommand({
      mapId: 'map-a',
      map: before,
      placementIds: ['tree-1'],
      permission: writable,
    }).apply(state(before)).maps['map-a']!
    expect(result.version).toBe(4)
    expect(result.layers).toBe(layers)
    expect(result.collision).toBe(collision)
    expect(projectMapStampPlacements(result).map((placement) => placement.id)).toEqual(['tree-2'])
  })

  test('组内 no-op 不置脏、不清 redo；失败构造也不触碰 history', () => {
    const before = fixtureMap()
    const session = new EditSession(state(before))
    const changed = new EditStampPlacementCommand({
      mapId: 'map-a',
      map: before,
      placementId: 'tree-1',
      activeLayerId: 'objects',
      permission: writable,
      patch: {
        visual: [
          {
            channel: 'tileId',
            ref: { layerId: 'objects', row: 1, col: 0 },
            value: 8,
          },
        ],
        collision: [],
      },
    })
    expect(session.dispatch(changed)).toBe(true)
    expect(session.undo()).toBe(true)
    session.markSaved()
    const revision = session.getMapRevision('map-a')
    const noOp = new EditStampPlacementCommand({
      mapId: 'map-a',
      map: before,
      placementId: 'tree-1',
      activeLayerId: 'objects',
      permission: writable,
      patch: {
        visual: [
          {
            channel: 'tileId',
            ref: { layerId: 'objects', row: 1, col: 0 },
            value: 2,
          },
        ],
        collision: [],
      },
    })
    expect(session.dispatch(noOp)).toBe(false)
    expect(session.isDirty()).toBe(false)
    expect(session.canRedo()).toBe(true)
    expect(session.getMapRevision('map-a')).toBe(revision)
    expect(
      () =>
        new EditStampPlacementCommand({
          mapId: 'map-a',
          map: before,
          placementId: 'tree-1',
          activeLayerId: 'objects',
          permission: writable,
          patch: {
            visual: [],
            collision: [{ ref: { row: 1, col: 0 }, value: 9 }],
          },
          removeGridPoints: [{ row: 1, col: 0 }],
        }),
    ).toThrow(/不能同时修改并移出放置组/)
    expect(session.isDirty()).toBe(false)
    expect(session.canRedo()).toBe(true)
    expect(session.redo()).toBe(true)
  })

  test('跨层写、组外扩张与任一成员层锁定都 fail-loud', () => {
    const map = fixtureMap()
    expect(
      () =>
        new EditStampPlacementCommand({
          mapId: 'map-a',
          map,
          placementId: 'tree-1',
          activeLayerId: 'objects',
          permission: writable,
          patch: {
            visual: [
              {
                channel: 'tileId',
                ref: { layerId: 'objects', row: 2, col: 1 },
                value: 3,
              },
            ],
            collision: [],
          },
        }),
    ).toThrow(/不能扩张到组外/)
    expect(
      () =>
        new EditStampPlacementCommand({
          mapId: 'map-a',
          map,
          placementId: 'tree-1',
          activeLayerId: 'objects',
          permission: writable,
          patch: {
            visual: [
              {
                channel: 'tileId',
                ref: { layerId: 'objects', row: 2, col: 1 },
                value: null,
              },
            ],
            collision: [],
          },
        }),
    ).toThrow(/不属于放置组/)
    expect(
      () =>
        new EditStampPlacementCommand({
          mapId: 'map-a',
          map,
          placementId: 'tree-1',
          activeLayerId: 'objects',
          permission: writable,
          patch: {
            visual: [
              {
                channel: 'tileId',
                ref: { layerId: 'floor', row: 0, col: 0 },
                value: 3,
              },
            ],
            collision: [],
          },
        }),
    ).toThrow(/当前活动层/)
    expect(
      () =>
        new UngroupStampPlacementsCommand({
          mapId: 'map-a',
          map,
          placementIds: ['tree-1'],
          permission: { hiddenLayerIds: [], lockedLayerIds: ['floor'] },
        }),
    ).toThrow(/已锁定/)
    expect(StampGroupCommandError).toBeDefined()
  })
})
