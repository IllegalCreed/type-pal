import type { ProjectMap, StampTemplateV1 } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  projectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { PaintTilesCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import { planStampPlacement } from './stamp-placement.js'
import { PlaceStampCommand, StampPlacementCommandError } from './stamp-placement-command.js'

function fixtureMap(): ProjectMap {
  let map = buildBlankProjectMap(4, 3, 'tiles-a')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件', 'height'))
  return map
}

function template(): StampTemplateV1 {
  return {
    id: 'tree',
    name: '树',
    tilesetId: 'tiles-a',
    origin: 'authored',
    layerSlots: [
      { id: 'ground', name: '地面', depthMode: 'flat' },
      { id: 'object', name: '物件', depthMode: 'height' },
    ],
    visual: [
      { layerSlotId: 'ground', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 },
      { layerSlotId: 'object', offset: { dRow: 1, du: 1 }, tileId: 2, height: 5 },
    ],
    collision: [{ offset: { dRow: 1, du: 1 }, value: 0 }],
  }
}

function state(map: ProjectMap = fixtureMap()): EditorState {
  return {
    manifest: { content: { stamps: 'content/stamps.json' } } as unknown as EditorState['manifest'],
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
    mappings: [
      { layerSlotId: 'ground', targetLayerId: 'floor' },
      { layerSlotId: 'object', targetLayerId: 'objects' },
    ],
    permission: { hiddenLayerIds: [], lockedLayerIds: [] },
    availableTileIds: new Set([1, 2]),
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
    expect(placed.version).toBe(3)
    expect(placed.layers[0]?.tiles[0]?.[0]).toBe(1)
    expect(placed.layers[1]?.tiles[1]?.[0]).toBe(2)
    expect(placed.layers[1]?.heights?.[1]?.[0]).toBe(5)
    expect(placed.collision[1]?.[0]).toBe(0)
    const groupId = projectMapStampPlacements(placed)[0]?.id
    expect(groupId).toBe('tree-placement')

    expect(session.undo()).toBe(true)
    expect(session.getState().maps['map-a']).toBe(before)
    expect(session.getState().maps['map-a']?.version).toBe(2)
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
      { layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 },
      { layerId: 'objects', row: 1, col: 0, tileId: 2, height: 5 },
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
      new PaintTilesCommand('map-a', [{ layerId: 'floor', row: 2, col: 1, tileId: 2, height: 0 }]),
    )
    expect(session.undo()).toBe(true)
    expect(projectMapStampPlacements(session.getState().maps['map-a']!)).toHaveLength(1)
    expect(session.undo()).toBe(true)
    expect(session.getState().maps['map-a']?.version).toBe(2)
    expect(projectMapStampPlacements(session.getState().maps['map-a']!)).toHaveLength(0)
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
      new PaintTilesCommand('map-a', [{ layerId: 'floor', row: 4, col: 0, tileId: 1, height: 0 }]),
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
      availableTileIds: new Set([1, 2]),
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
