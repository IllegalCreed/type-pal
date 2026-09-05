import type { ProjectMap, StampTemplate } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  projectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { PaintCollisionCommand, PaintTilesCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import { planStampPlacement } from './stamp-placement.js'
import { PlaceStampCommand, StampPlacementCommandError } from './stamp-placement-command.js'

function fixtureMap(): ProjectMap {
  let map = buildBlankProjectMap(4, 3, 'tiles-a')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  return map
}

function template(): StampTemplate {
  return {
    id: 'tree',
    name: '树',
    origin: 'authored',
    width: 1,
    height: 1,
    anchor: { row: 0, col: 0 },
    tilesetRefs: ['tiles-a'],
    layers: [
      { id: 'ground', name: '地面', tiles: [[1], [null]], sources: [[0], [null]] },
      {
        id: 'object',
        name: '物件',
        tiles: [[null], [2]],
        sources: [[null], [0]],
        heights: [[0], [5]],
      },
    ],
    collision: [[null], [0]],
  }
}

function state(map: ProjectMap = fixtureMap()): EditorState {
  return {
    manifest: { content: { stamps: 'content/stamps.json' } } as unknown as EditorState['manifest'],
    scenes: [],
    sceneIndex: { version: 1, scenes: [] },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: { 'map-a': map },
    mapIndex: {
      version: 1,
      maps: [{ id: 'map-a', name: 'A', path: 'content/maps/a.json' }],
    },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps: [template()],
  } as EditorState
}

function plan(map: ProjectMap = fixtureMap(), revision = 0, anchor = { row: 0, col: 0 }) {
  return planStampPlacement({
    mapId: 'map-a',
    map,
    mapRevision: revision,
    template: template(),
    anchor,
    placementBaseHeight: 0,
    mappings: [
      { layerSlotId: 'ground', targetLayerId: 'floor' },
      { layerSlotId: 'object', targetLayerId: 'objects' },
    ],
    permission: { hiddenLayerIds: [], lockedLayerIds: [] },
    availableTileIdsByTileset: new Map([['tiles-a', new Set([1, 2])]]),
    conflictPolicy: 'overwrite',
  })
}

describe('PlaceStampCommand', () => {
  test('两层+height+collision 一次 dispatch 升 v3，undo 精确回 v2，redo 保留 groupId', () => {
    const before = fixtureMap()
    const session = new EditSession(state(before))
    const firstPlan = plan(before, session.getVersion())
    expect(session.dispatch(new PlaceStampCommand(firstPlan))).toBe(true)

    const placed = session.getState().maps['map-a']!
    expect(placed.version).toBe(4)
    expect(placed.layers[0]?.tiles[0]?.[0]).toBe(1)
    expect(placed.layers[1]?.tiles[1]?.[0]).toBe(2)
    expect(placed.layers[1]?.heights?.[1]?.[0]).toBe(5)
    expect(placed.collision[1]?.[0]).toBe(0)
    const groupId = projectMapStampPlacements(placed)[0]?.id
    expect(groupId).toBe('tree-placement')

    expect(session.undo()).toBe(true)
    expect(session.getState().maps['map-a']).toBe(before)
    expect(session.getState().maps['map-a']?.version).toBe(4)
    expect(session.undo()).toBe(false)

    expect(session.redo()).toBe(true)
    expect(projectMapStampPlacements(session.getState().maps['map-a']!)[0]?.id).toBe(groupId)
  })

  test('连续相同模板产生不同 groupId，相邻 placement 互不合并', () => {
    const session = new EditSession(state())
    const first = plan(session.getState().maps['map-a']!, session.getVersion(), { row: 0, col: 0 })
    session.dispatch(new PlaceStampCommand(first))
    const second = plan(session.getState().maps['map-a']!, session.getVersion(), { row: 2, col: 1 })
    session.dispatch(new PlaceStampCommand(second))
    expect(
      projectMapStampPlacements(session.getState().maps['map-a']!).map((item) => item.id),
    ).toEqual(['tree-placement', 'tree-placement-2'])
    session.undo()
    expect(projectMapStampPlacements(session.getState().maps['map-a']!)).toHaveLength(1)
  })

  test('普通矩阵值已相同仍会新增 metadata，作为一次可撤销 history', () => {
    let map = paintProjectMapTiles(fixtureMap(), [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles-a', height: 0 },
      { layerId: 'objects', row: 1, col: 0, tileId: 2, tilesetId: 'tiles-a', height: 5 },
    ])
    map = paintProjectMapCollision(map, [{ row: 1, col: 0, value: 0 }])
    const session = new EditSession(state(map))
    const placementPlan = plan(map)
    expect(placementPlan.preparedPatch?.nextVisual).toEqual([])
    expect(session.dispatch(new PlaceStampCommand(placementPlan))).toBe(true)
    expect(projectMapStampPlacements(session.getState().maps['map-a']!)).toHaveLength(1)
    session.undo()
    expect(session.getState().maps['map-a']).toBe(map)
  })

  test('后续普通编辑撤销后仍可继续撤销 placement，不依赖 afterMap 引用相等', () => {
    const session = new EditSession(state())
    expect(session.dispatch(new PlaceStampCommand(plan(session.getState().maps['map-a']!)))).toBe(
      true,
    )
    session.dispatch(
      new PaintTilesCommand('map-a', [
        { layerId: 'floor', row: 2, col: 1, tileId: 2, tilesetId: 'tiles-a', height: 0 },
      ]),
    )
    expect(session.undo()).toBe(true)
    expect(projectMapStampPlacements(session.getState().maps['map-a']!)).toHaveLength(1)
    expect(session.undo()).toBe(true)
    expect(session.getState().maps['map-a']?.version).toBe(4)
    expect(projectMapStampPlacements(session.getState().maps['map-a']!)).toHaveLength(0)
  })

  test('legacy Paint* 也不能旁路 ownership，失败不进 history/dirty', () => {
    const session = new EditSession(state())
    session.dispatch(new PlaceStampCommand(plan(session.getState().maps['map-a']!)))
    session.markSaved()
    const before = session.getState()
    expect(() =>
      session.dispatch(
        new PaintTilesCommand('map-a', [
          { layerId: 'objects', row: 1, col: 0, tileId: 9, tilesetId: 'tiles-a', height: 4 },
        ]),
      ),
    ).toThrow(/进入组内编辑或先解组/)
    expect(() =>
      session.dispatch(new PaintCollisionCommand('map-a', [{ row: 1, col: 0, value: 1 }])),
    ).toThrow(/进入组内编辑或先解组/)
    expect(session.getState()).toBe(before)
    expect(session.isDirty()).toBe(false)
  })

  test('Place → undo 后旧 revision 计划仍被 session 原子拒绝且不清 redo', () => {
    const session = new EditSession(state())
    const original = plan(session.getState().maps['map-a']!, session.getMapRevision('map-a'))
    expect(
      session.dispatchAtMapRevision('map-a', original.mapRevision, new PlaceStampCommand(original)),
    ).toBe(true)
    expect(session.undo()).toBe(true)
    expect(session.canRedo()).toBe(true)
    const beforeAttempt = session.getState()
    expect(() =>
      session.dispatchAtMapRevision('map-a', original.mapRevision, new PlaceStampCommand(original)),
    ).toThrow('已变化')
    expect(session.getState()).toBe(beforeAttempt)
    expect(session.canRedo()).toBe(true)
  })

  test('invalid plan、stale map 与 missing map 都零写且不清 redo', () => {
    const initial = fixtureMap()
    const session = new EditSession(state(initial))
    const stalePlan = plan(initial)
    session.dispatch(
      new PaintTilesCommand('map-a', [
        { layerId: 'floor', row: 4, col: 0, tileId: 1, tilesetId: 'tiles-a', height: 0 },
      ]),
    )
    session.undo()
    const beforeAttempt = session.getState()
    expect(session.canRedo()).toBe(true)
    expect(() => session.dispatch(new PlaceStampCommand(stalePlan))).toThrow(
      StampPlacementCommandError,
    )
    expect(session.getState()).toBe(beforeAttempt)
    expect(session.canRedo()).toBe(true)

    const invalid = planStampPlacement({
      ...plan(initial),
      mapId: 'map-a',
      map: initial,
      mapRevision: 0,
      template: template(),
      anchor: { row: 99, col: 0 },
      mappings: [],
      permission: { hiddenLayerIds: [], lockedLayerIds: [] },
      placementBaseHeight: 0,
      availableTileIdsByTileset: new Map([['tiles-a', new Set([1, 2])]]),
      conflictPolicy: 'reject',
    })
    expect(() => new PlaceStampCommand(invalid)).toThrow(StampPlacementCommandError)

    const missingState = state(initial)
    missingState.maps = {}
    const missingSession = new EditSession(missingState)
    expect(() => missingSession.dispatch(new PlaceStampCommand(plan(initial)))).toThrow(/尚未加载/)
    expect(missingSession.isDirty()).toBe(false)
  })
})
