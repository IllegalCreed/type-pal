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
import { TransformStampPlacementsCommand } from './stamp-group-command.js'
import {
  captureStampGroupClipboard,
  planStampGroupDelete,
  planStampGroupMove,
  planStampGroupPaste,
} from './stamp-group-transform.js'

function fixtureMap(withOther = true): ProjectMap {
  let map: ProjectMap = buildBlankProjectMap(5, 3, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
    { layerId: 'objects', row: 1, col: 0, tileId: 2, tilesetId: 'tiles', height: 3 },
    ...(withOther
      ? [
          { layerId: 'floor', row: 4, col: 3, tileId: 4, tilesetId: 'tiles', height: 0 },
          { layerId: 'objects', row: 5, col: 3, tileId: 5, tilesetId: 'tiles', height: 2 },
        ]
      : []),
  ])
  map = paintProjectMapCollision(map, [
    { row: 1, col: 0, value: 0 },
    ...(withOther ? [{ row: 5, col: 3, value: 2 }] : []),
  ])
  return withProjectMapStampPlacements(map, [
    {
      id: 'tree-a',
      sourceStampId: 'tree',
      sourceStampName: '树 A',
      anchor: { row: 0, col: 0 },
      visualSlots: [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'objects', row: 1, col: 0 },
      ],
      gridPoints: [{ row: 1, col: 0 }],
    },
    ...(withOther
      ? [
          {
            id: 'tree-b',
            sourceStampId: 'tree',
            sourceStampName: '树 B',
            anchor: { row: 4, col: 3 },
            visualSlots: [
              { layerId: 'floor', row: 4, col: 3 },
              { layerId: 'objects', row: 5, col: 3 },
            ],
            gridPoints: [{ row: 5, col: 3 }],
          },
        ]
      : []),
  ])
}

function state(map: ProjectMap): EditorState {
  return {
    manifest: { content: { maps: 'content/maps.json' } },
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
      maps: [{ id: 'map-a', name: 'A', path: 'content/maps/map-a.json' }],
    },
    tilesets: [],
    tilesetBlobs: {},
    stamps: [],
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
  } as unknown as EditorState
}

const writable = { hiddenLayerIds: [] as string[], lockedLayerIds: [] as string[] }

describe('W7G-E 整组变换', () => {
  test('clipboard 快照当前普通矩阵值，collision=0 仍显式包含', () => {
    const clip = captureStampGroupClipboard('map-a', fixtureMap(), ['tree-a'])!
    expect(clip.sourceAnchor).toEqual({ row: 0, col: 0 })
    expect(clip.placements[0]).toMatchObject({
      sourceId: 'tree-a',
      sourceStampId: 'tree',
      visual: [
        { tileId: 1, tilesetId: 'tiles', height: 0 },
        { tileId: 2, tilesetId: 'tiles', height: 3 },
      ],
      collision: [{ value: 0 }],
    })
  })

  test('move 保留 id/provenance 并原子移动 visual/height/collision，undo 精确还原', () => {
    const before = fixtureMap()
    const session = new EditSession(state(before))
    const plan = planStampGroupMove({
      mapId: 'map-a',
      map: before,
      mapRevision: 0,
      placementIds: ['tree-a'],
      targetAnchor: { row: 2, col: 1 },
      permission: writable,
    })
    expect(plan.canApply).toBe(true)
    expect(
      session.dispatchAtMapRevision('map-a', 0, new TransformStampPlacementsCommand(plan)),
    ).toBe(true)
    const moved = session.getState().maps['map-a']!
    const placement = projectMapStampPlacements(moved).find(({ id }) => id === 'tree-a')!
    expect(placement).toMatchObject({
      sourceStampId: 'tree',
      anchor: { row: 2, col: 1 },
      visualSlots: [
        { layerId: 'floor', row: 2, col: 1 },
        { layerId: 'objects', row: 3, col: 1 },
      ],
      gridPoints: [{ row: 3, col: 1 }],
    })
    expect(moved.layers[0]?.tiles[0]?.[0]).toBeNull()
    expect(moved.layers[1]?.tiles[1]?.[0]).toBeNull()
    expect(moved.layers[0]?.tiles[2]?.[1]).toBe(1)
    expect(moved.layers[1]?.tiles[3]?.[1]).toBe(2)
    expect(moved.layers[1]?.heights?.[3]?.[1]).toBe(3)
    expect(moved.collision[3]?.[1]).toBe(0)
    expect(projectMapStampPlacements(moved).find(({ id }) => id === 'tree-b')).toBeDefined()
    session.undo()
    expect(session.getState().maps['map-a']).toBe(before)
    session.redo()
    expect(
      projectMapStampPlacements(session.getState().maps['map-a']!).map(({ id }) => id),
    ).toEqual(['tree-a', 'tree-b'])
  })

  test('copy/repeat 保留源组且分配唯一新 id，cut clipboard 可保留原 id', () => {
    const map = fixtureMap(false)
    const clipboard = captureStampGroupClipboard('map-a', map, ['tree-a'])!
    const first = planStampGroupPaste({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      clipboard,
      targetAnchor: { row: 2, col: 1 },
      permission: writable,
    })
    expect(first.canApply).toBe(true)
    const copied = new TransformStampPlacementsCommand(first).apply(state(map)).maps['map-a']!
    expect(projectMapStampPlacements(copied).map(({ id }) => id)).toEqual(['tree-a', 'tree-a-copy'])
    expect(projectMapStampPlacements(copied)[1]?.gridPoints).toEqual([{ row: 3, col: 1 }])

    const repeat = planStampGroupPaste({
      mapId: 'map-a',
      map: copied,
      mapRevision: 1,
      clipboard,
      targetAnchor: { row: 4, col: 2 },
      permission: writable,
    })
    expect(repeat.upsertPlacements[0]?.id).toBe('tree-a-copy-2')

    const cutClipboard = captureStampGroupClipboard('map-a', map, ['tree-a'], 'preserve')!
    const deletedPlan = planStampGroupDelete({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      placementIds: ['tree-a'],
      permission: writable,
    })
    const deleted = new TransformStampPlacementsCommand(deletedPlan).apply(state(map)).maps[
      'map-a'
    ]!
    const pasted = planStampGroupPaste({
      mapId: 'map-a',
      map: deleted,
      mapRevision: 1,
      clipboard: cutClipboard,
      targetAnchor: { row: 2, col: 1 },
      permission: writable,
    })
    expect(pasted.upsertPlacements[0]?.id).toBe('tree-a')
  })

  test('delete 始终清理全部通道并保持 canonical v4', () => {
    const map = paintProjectMapCollision(fixtureMap(false), [{ row: 1, col: 0, value: 7 }])
    const plan = planStampGroupDelete({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      placementIds: ['tree-a'],
      permission: writable,
    })
    const deleted = new TransformStampPlacementsCommand(plan).apply(state(map)).maps['map-a']!
    expect(deleted.version).toBe(4)
    expect(deleted.layers[0]?.tiles[0]?.[0]).toBeNull()
    expect(deleted.layers[1]?.tiles[1]?.[0]).toBeNull()
    expect(deleted.layers[1]?.heights?.[1]?.[0] ?? 0).toBe(0)
    expect(deleted.collision[1]?.[0]).toBe(0)
  })

  test('未选中组 ownership 永久阻止 overwrite；普通内容冲突可显式覆盖', () => {
    const map = fixtureMap()
    const ownerConflict = planStampGroupMove({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      placementIds: ['tree-a'],
      targetAnchor: { row: 4, col: 3 },
      permission: writable,
      conflictPolicy: 'overwrite',
    })
    expect(ownerConflict.canApply).toBe(false)
    expect(ownerConflict.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['visual-owned', 'collision-owned']),
    )

    let ordinary = fixtureMap(false)
    ordinary = paintProjectMapTiles(ordinary, [
      { layerId: 'floor', row: 2, col: 1, tileId: 1, tilesetId: 'tiles', height: 0 },
    ])
    const reject = planStampGroupMove({
      mapId: 'map-a',
      map: ordinary,
      mapRevision: 0,
      placementIds: ['tree-a'],
      targetAnchor: { row: 2, col: 1 },
      permission: writable,
    })
    expect(reject.conflicts).toHaveLength(1)
    expect(reject.canApply).toBe(false)
    const overwrite = planStampGroupMove({
      mapId: 'map-a',
      map: ordinary,
      mapRevision: 0,
      placementIds: ['tree-a'],
      targetAnchor: { row: 2, col: 1 },
      permission: writable,
      conflictPolicy: 'overwrite',
    })
    expect(overwrite.canApply).toBe(true)
  })

  test('任一成员层隐藏/锁定、跨地图、越界和 stale plan 都零写', () => {
    const map = fixtureMap(false)
    const hidden = planStampGroupMove({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      placementIds: ['tree-a'],
      targetAnchor: { row: 2, col: 1 },
      permission: { hiddenLayerIds: ['objects'], lockedLayerIds: [] },
    })
    expect(hidden.canApply).toBe(false)
    expect(hidden.issues[0]?.message).toContain('隐藏')
    const out = planStampGroupMove({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      placementIds: ['tree-a'],
      targetAnchor: { row: 5, col: 4 },
      permission: writable,
    })
    expect(out.canApply).toBe(false)
    expect(out.issues.some(({ code }) => code === 'out-of-bounds')).toBe(true)
    const clipboard = captureStampGroupClipboard('other-map', map, ['tree-a'])!
    const cross = planStampGroupPaste({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      clipboard,
      targetAnchor: { row: 2, col: 1 },
      permission: writable,
    })
    expect(cross.canApply).toBe(false)
    expect(cross.issues[0]?.message).toContain('跨地图')

    const plan = planStampGroupMove({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      placementIds: ['tree-a'],
      targetAnchor: { row: 2, col: 1 },
      permission: writable,
    })
    const changed = paintProjectMapCollision(map, [{ row: 0, col: 4, value: 1 }])
    expect(() => new TransformStampPlacementsCommand(plan).apply(state(changed))).toThrow(/过期/)
  })

  test('目标 anchor 即使与成员分离也必须在界内；复用的 move 快照遇地图变化即过期', () => {
    let map = fixtureMap(false)
    const [placement] = projectMapStampPlacements(map)
    map = withProjectMapStampPlacements(map, [{ ...placement!, anchor: { row: 0, col: 4 } }])
    const clipboard = captureStampGroupClipboard('map-a', map, ['tree-a'], 'preserve')!
    const anchorOut = planStampGroupMove({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      placementIds: ['tree-a'],
      targetAnchor: { row: 0, col: 1 },
      permission: writable,
      clipboard,
      expectedMap: map,
    })
    expect(anchorOut.canApply).toBe(false)
    expect(anchorOut.issues.map(({ message }) => message)).toEqual(
      expect.arrayContaining([expect.stringContaining('目标锚点越出地图边界')]),
    )

    const changed = paintProjectMapCollision(map, [{ row: 0, col: 3, value: 1 }])
    const stale = planStampGroupMove({
      mapId: 'map-a',
      map: changed,
      mapRevision: 1,
      placementIds: ['tree-a'],
      targetAnchor: { row: 2, col: 1 },
      permission: writable,
      clipboard,
      expectedMap: map,
    })
    expect(stale.canApply).toBe(false)
    expect(stale.issues[0]?.message).toContain('预览已过期')
  })

  test('no-op move 不能构造 Command，不污染 history/dirty/revision/redo', () => {
    const map = fixtureMap(false)
    const session = new EditSession(state(map))
    const plan = planStampGroupMove({
      mapId: 'map-a',
      map,
      mapRevision: 0,
      placementIds: ['tree-a'],
      targetAnchor: { row: 0, col: 0 },
      permission: writable,
    })
    expect(plan.changed).toBe(false)
    expect(plan.canApply).toBe(false)
    expect(() => new TransformStampPlacementsCommand(plan)).toThrow(/没有可提交的变化/)
    expect(session.isDirty()).toBe(false)
    expect(session.getMapRevision('map-a')).toBe(0)
    expect(session.canUndo()).toBe(false)
  })
})
